import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // auth.users data
  const [profile, setProfile] = useState(null); // public.profiles data
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session and listen for auth changes
  useEffect(() => {
    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }
      
      setProfile(data || null);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, role = 'photographer', name) => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name
          }
        }
      });

      if (authError) throw authError;

      // 2. The profile might be created by a DB trigger, but if not, we create the shell.
      // According to PRD, we need profiles and settings initialized.
      if (authData?.user) {
        const userId = authData.user.id;
        
        // Initialize Profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          account_type: role,
          name: name || email.split('@')[0],
          username: `user_${Date.now().toString(36)}`, // Temporary username
          profile_completed: false,
          rating: 0.0,
          review_count: 0
        });

        if (profileError) console.error('Profile init error:', profileError);

        // Initialize Settings
        const { error: settingsError } = await supabase.from('settings').insert({
          id: userId,
          phone_visible: false,
          email_visible: false,
          push_notifications_enabled: true,
          email_notifications_enabled: true
        });

        if (settingsError) console.error('Settings init error:', settingsError);

        // Audit Log
        await supabase.from('audit_logs').insert({
          actor_id: userId,
          action: 'USER_SIGNUP',
          metadata: { role, email }
        });

        await fetchProfile(userId);
      }

      return { success: true, user: authData.user };
    } catch (err) {
      console.error('Sign up error:', err);
      return { success: false, error: err.message };
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      // Audit Log
      if (data.user) {
        await supabase.from('audit_logs').insert({
          actor_id: data.user.id,
          action: 'USER_LOGIN',
          metadata: { email }
        });
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: 'USER_LOGOUT'
        });
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setProfile(null);
      setUser(null);
      setSession(null);
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      return { success: false, error: err.message };
    }
  };

  // Update Profile (Onboarding step completion)
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user authenticated' };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setProfile(data);
      return { success: true, data };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    login,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
