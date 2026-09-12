import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FALLBACK_CATEGORIES, validatePersonalStyle, isKnownCategory } from '../lib/photography';
import { aspectRatioOf, orientationOf, ratioLabel, fromStoredExif } from '../lib/photoMeta';
import { humaniseWriteError, isRateLimitError } from '../lib/writeErrors';
import { avatarUrlOf } from '../lib/avatars';

const AppContext = createContext(null);

// profiles.email and profiles.phone are no longer readable by the anon/authenticated
// roles (migration v11). Selecting '*' would fail, and would have leaked every
// user's email address to anyone holding the public key. Ask for columns by name.
//
// Every name in this list MUST exist. PostgREST rejects the WHOLE select when one
// named column is absent, so a single wrong name silently breaks every profile
// query in the app - which is exactly what `cover` was doing. The column is
// `cover_url`; there was never a `cover`. The other six names this list carried
// (account_type, rating, review_count, specialties, profile_completed) are added
// by migration_v14, so this list and the database now agree.
export const PROFILE_COLUMNS = [
  'id', 'username', 'name', 'display_name', 'bio', 'location',
  'avatar', 'avatar_url', 'cover_url', 'website',
  'role', 'account_type', 'verified', 'banned',
  'points', 'wins', 'global_rank', 'rating', 'review_count',
  'followers_count', 'following_count', 'posts_count', 'competitions_won',
  'camera_gear', 'photography_style', 'specialties', 'service_categories',
  'starting_rate', 'availability_status', 'packages',
  'is_public', 'push_notifs', 'email_notifs', 'is_deactivated',
  'profile_completed', 'created_at', 'updated_at'
].join(', ');

export function AppProvider({ children }) {
  const [userEmail, setUserEmail] = useState('');
  const [currentRole, setCurrentRole] = useState('photographer');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Answered by the database (admin_console_access), not by an email string.
  const [isAdmin, setIsAdmin] = useState(false);

  // Notifications. Real rows from the `notifications` table (migration v20),
  // never fabricated in the client: every one is written by a database trigger,
  // so a notification cannot be forged by the browser that displays it.
  const [notifications, setNotifications] = useState([]);
  // Holds the pending coalesced refetch, so a burst of realtime events costs one
  // query rather than one per event.
  const notifRefetch = useRef(null);

  // Photos list state
  const [photos, setPhotos] = useState([]);
  // The platform's photography categories. One source of truth, read from the
  // `categories` table - which has existed and been seeded since migration v2
  // but was queried by nothing, while four different hardcoded lists disagreed
  // with each other across the UI.
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  // Bookings list state
  const [bookings, setBookings] = useState([]);

  // Chat threads list state
  const [threads, setThreads] = useState([]);

  // Challenges active list state
  const [challenges, setChallenges] = useState([]);

  // User submissions to challenges
  const [submissions, setSubmissions] = useState([]);

  // User list state (supporting bans and verification updates)
  const [users, setUsers] = useState([]);

  // Flagged reported photos list
  const [reports, setReports] = useState([]);

  // Battle dispute cases
  const [disputes, setDisputes] = useState([]);

  // Active battles list state (supporting dynamic Elo updates)
  const [battles, setBattles] = useState([]);

  // Follows and comments states
  const [follows, setFollows] = useState([]);
  const [comments, setComments] = useState([]);
  const [savedItemIds, setSavedItemIds] = useState([]);

  // ── Username Availability Check (calls DB RPC) ──
  const checkUsernameAvailable = async (username) => {
    if (!username || username.length < 3) return false;
    try {
      const { data, error } = await supabase.rpc('is_username_available', {
        check_username: username.toLowerCase().trim()
      });
      if (error) { console.warn('Username check error:', error.message); return true; }
      return data === true;
    } catch (err) {
      console.warn('Username check exception:', err); return true;
    }
  };

  const signUpUser = async ({ name, email, password, username, role = 'photographer', location = 'New York, USA' }) => {
    try {
      // Derive username from email if not provided (backward compat)
      const finalUsername = (username || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.]/g, '');

      let createdProfile = {
        id: `usr_${Date.now()}`,
        name,
        username: finalUsername,
        display_name: name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        bio: role === 'photographer' ? 'LensLeague Photographer.' : 'Client on LensLeague.',
        location,
        role,
        verified: false,
        banned: false,
        onboarding_completed: false
      };

      // The handle_new_user trigger auto-creates the profile row
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: finalUsername, display_name: name, name, role, location },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Supabase Auth Error:', error.message, error.status, error);
        throw error;
      }

      // If email confirmation is enabled in Supabase, data.session will be null
      if (!data.session && data.user) {
        return { success: true, requireVerification: true };
      }

      if (data.user) {
        createdProfile.id = data.user.id;
        // Fetch the trigger-created profile to get the canonical data
        const { data: profile } = await supabase
          .from('profiles').select(PROFILE_COLUMNS).eq('id', data.user.id).maybeSingle();
        if (profile) {
          createdProfile = { ...createdProfile, ...profile };
        }
      }

      setUserEmail(email);
      setCurrentUser(createdProfile);
      setCurrentRole(role);

      await recordAuditLog('USER_SIGNUP', createdProfile.id, { role, email });
      return { success: true, user: createdProfile };
    } catch (err) {
      console.error('SignUp Error (full):', JSON.stringify(err, null, 2));
      console.error('SignUp Error name:', err?.name, 'message:', err?.message, 'status:', err?.status);
      const msg = err?.message || 'Sign up failed. Please check your credentials.';
      return { success: false, error: msg };
    }
  };

  const loginUser = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { success: false, requireVerification: true };
        }
        return { success: false, error: 'Invalid email or password.' };
      }

      if (data.user) {
        let { data: profile } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', data.user.id).maybeSingle();
        if (!profile) {
          const meta = data.user.user_metadata || {};
          const userRole = meta.role || 'photographer';
          const newProfileData = {
            id: data.user.id,
            name: meta.name || meta.full_name || email.split('@')[0] || 'LensLeague User',
            username: meta.username || `user_${Date.now().toString(36)}`,
            avatar: null,
            bio: userRole === 'photographer' ? 'LensLeague creator.' : 'Hiring on LensLeague.',
            location: meta.location || 'Accra, Ghana',
            role: userRole,
            cover: null
            // points / wins / rating / verified / banned / global_rank are
            // owned by the database. The client must not send them: they are
            // reverted by the guard trigger added in migration v11.
          };
          await supabase.from('profiles').insert(newProfileData);
          profile = newProfileData;
        }
        if (profile) {
          setUserEmail(email);
          setCurrentUser(profile);
          setCurrentRole(profile.role || 'photographer');
          await recordAuditLog('USER_LOGIN', profile.id, { email });
          return { success: true, user: profile };
        }
      }
      return { success: false, error: 'User data not found.' };
    } catch (err) {
      return { success: false, error: 'Invalid email or password.' };
    }
  };

  // ── Onboarding Helpers ──
  const uploadAvatar = async (file) => {
    const userId = currentUser?.id;
    if (!userId || !file) return null;

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      await supabase.from('profiles').update({
        avatar_url: publicUrl,
        avatar: publicUrl,
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      setCurrentUser(prev => ({ ...prev, avatar_url: publicUrl, avatar: publicUrl }));
      return publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      return null;
    }
  };

  const setProfileCategories = async (categoryIds) => {
    const userId = currentUser?.id;
    if (!userId || !categoryIds?.length) return;

    try {
      // Clear existing selections and insert new ones
      await supabase.from('profile_categories').delete().eq('profile_id', userId);
      const rows = categoryIds.map(cid => ({ profile_id: userId, category_id: cid }));
      await supabase.from('profile_categories').insert(rows);
    } catch (err) {
      console.warn('Profile categories error:', err.message);
    }
  };

  const completeOnboarding = async () => {
    const userId = currentUser?.id;
    if (!userId) return;

    try {
      await supabase.from('profiles').update({
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    } catch (err) {
      console.warn('Onboarding completion error:', err.message);
    }

    setCurrentUser(prev => ({ ...prev, onboarding_completed: true }));
  };

  const updateProfileSettings = async (updates) => {
    const userId = currentUser?.id;
    if (!userId) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        // Not a bare .select(): that asks PostgREST for every column, and
        // profiles.email / phone are not readable by the authenticated role
        // (v11 revoked table-wide SELECT in favour of a column list). The
        // update would succeed and the returning representation would fail,
        // which surfaces as "Save Changes does nothing".
        .select(PROFILE_COLUMNS)
        .single();
        
      if (error) throw error;
      
      setCurrentUser(prev => ({ ...prev, ...data }));
      return true;
    } catch (err) {
      console.error('Update profile settings error:', err.message);
      return false;
    }
  };

  // Fetch a user profile based on ID
  const fetchUserProfile = async (uid) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', uid)
        .maybeSingle();

      if (existingProfile) {
        // Normalize avatar: keep both avatar and avatar_url in sync
        const avatarUrl = existingProfile.avatar_url || existingProfile.avatar || null;
        const normalized = {
          ...existingProfile,
          role: existingProfile.role || existingProfile.account_type || 'photographer',
          avatar: avatarUrl,
          avatar_url: avatarUrl
        };
        setCurrentUser(normalized);
        setCurrentRole(normalized.role);
      }
    } catch (err) {
      console.warn('Error fetching user profile:', err);
    }
  };

  // Ask the database whether this session may open the admin console. The old
  // check compared userEmail against a hardcoded string in the browser, which
  // any visitor could satisfy in devtools.
  const refreshAdminAccess = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_console_access');
      setIsAdmin(!error && data === true);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // Listen to Authentication State Changes
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email);
        await fetchUserProfile(session.user.id);
        await refreshAdminAccess();
      }
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUserEmail(session.user.email);
        await fetchUserProfile(session.user.id);
        refreshAdminAccess();
      } else {
        setUserEmail('');
        setCurrentUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── SUPABASE SYNC ON MOUNT ──
  useEffect(() => {
    const syncFromSupabase = async () => {
      // 1. Fetch profiles (users list) - Limit to 100 for now to prevent memory bloat
      const { data: profilesData } = await supabase.from('profiles').select(PROFILE_COLUMNS).limit(100);
      const fetchedUsers = (profilesData || []).map(profile => ({
        ...profile,
        role: profile.role || profile.account_type || 'photographer',
        avatar: profile.avatar_url || profile.avatar || null,
        avatar_url: profile.avatar_url || profile.avatar || null
      }));
      setUsers(fetchedUsers);

      // 2. Fetch photos (from portfolio_items)
      const { data: photosData } = await supabase
        .from('portfolio_items')
        .select(`*, albums!inner(privacy_level), profiles:photographer_id(name, avatar_url)`)
        .eq('albums.privacy_level', 'public')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (photosData) {
        const mappedPhotos = photosData.map(p => {
          const owner = p.profiles || { name: 'Anonymous', avatar_url: '' };
          return {
            id: p.id,
            url: p.media_url,
            ownerId: p.photographer_id,
            ownerName: owner.name || 'Anonymous',
            ownerAvatar: owner.avatar_url || '',
            caption: p.caption,
            category: p.categories?.[0] || 'General',
            customStyle: p.custom_style || null,
            gear: p.exif_data?.camera || p.exif_data?.camera_model || null,
            // The real counts, from the columns that hold them.
            //
            // This was a hardcoded 0, so a photograph with ten likes rendered as
            // zero on every load. Liking it bumped the optimistic value to one,
            // and the next refresh read the hardcoded zero again - which looks
            // exactly like "my like was not saved" and is why it was reported
            // that way. The likes were always in the database; the feed simply
            // never asked. v14 added like_count and comment_count with triggers
            // that keep them true, and ProfilePage has been reading them
            // correctly all along.
            likes: p.like_count || 0,
            comments: p.comment_count || 0,
            // Measured at upload and stored by migration v23, not guessed from the
            // file extension. The line that stood here reported every still as
            // 3/4 and every .mp4 as 9/16, so a 3:2 landscape was rendered in a
            // portrait box and cropped - the single thing the first outside
            // photographer to use the product complained about. null now means
            // unknown, and a caller can decide what to do about that rather
            // than inheriting a wrong ratio as though it were measured.
            width: p.width ?? null,
            height: p.height ?? null,
            aspectRatio: aspectRatioOf(p.width, p.height),
            orientation: orientationOf(p.width, p.height),
            ratioLabel: ratioLabel(p.width, p.height),
            exif: fromStoredExif(p.exif_data),
            timestamp: new Date(p.created_at).toLocaleDateString()
          };
        });
        setPhotos(mappedPhotos);
        
        // Dynamically generate fair battles based on matching aspect ratios
        const generateFairBattles = (photoList) => {
          const grouped = {};
          photoList.forEach(p => {
            // Group by SHAPE, not by the exact ratio string.
            //
            // This used to key on p.aspectRatio, which was the constant '3/4'
            // for every still - so the grouping did nothing and every photo
            // landed in one bucket. Now that the ratio is real, keying on it
            // would fail the opposite way: '6000 / 4000' and '3000 / 2000' are
            // the same shape but different strings, and almost every frame
            // would become its own group of one, pairing with nothing. Three
            // buckets is what a fair match actually needs.
            const ratio = orientationOf(p.width, p.height) || 'unknown';
            if (!grouped[ratio]) grouped[ratio] = [];
            grouped[ratio].push(p);
          });
          
          let dynamicBattles = [];
          Object.keys(grouped).forEach(ratio => {
            const list = grouped[ratio];
            // Shuffle list for randomness
            for (let i = list.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [list[i], list[j]] = [list[j], list[i]];
            }
            
            // Pair them up
            for (let i = 0; i < list.length - 1; i += 2) {
              const pA = list[i];
              const pB = list[i+1];
              dynamicBattles.push({
                id: `bat_${Date.now()}_${pA.id}_${pB.id}`,
                category: pA.category === pB.category ? pA.category : 'Mixed',
                endsIn: '24h',
                // A battle with no counts is a battle that crashes the card
                // the moment somebody votes on it. Persisted battles carry
                // these; the generated fallback did not, and nothing noticed
                // because the fallback only runs when photo_battles is empty.
                photoA: { ...pA, score: 1200, votes: 0 },
                photoB: { ...pB, score: 1200, votes: 0 },
                totalVotes: 0,
                status: 'active',
              });
            }
          });
          
          // Shuffle final battles array
          for (let i = dynamicBattles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dynamicBattles[i], dynamicBattles[j]] = [dynamicBattles[j], dynamicBattles[i]];
          }
          return dynamicBattles;
        };
        
        // Prefer persisted battles. This keeps voting and winners consistent
        // across devices and sessions; the generated pairing is only a
        // compatibility fallback until migration_v10 has been applied.
        const { data: battleRows, error: battleError } = await supabase
          .from('photo_battles')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!battleError && battleRows) {
          const photoById = new Map(mappedPhotos.map(photo => [photo.id, photo]));
          setBattles(battleRows.flatMap(battle => {
            const photoA = photoById.get(battle.photo_a_id);
            const photoB = photoById.get(battle.photo_b_id);
            if (!photoA || !photoB) return [];
            return [{
              id: battle.id,
              category: battle.category,
              endsIn: battle.closes_at ? `${Math.max(0, Math.ceil((new Date(battle.closes_at) - Date.now()) / 3600000))}h left` : 'Live',
              photoA: { ...photoA, votes: battle.votes_a, rating: 1200, photographerName: photoA.ownerName, photographerId: photoA.ownerId },
              photoB: { ...photoB, votes: battle.votes_b, rating: 1200, photographerName: photoB.ownerName, photographerId: photoB.ownerId },
              totalVotes: battle.votes_a + battle.votes_b,
              status: battle.status
            }];
          }));
        } else {
          setBattles(generateFairBattles(mappedPhotos));
        }
      } else {
        setPhotos([]);
        setBattles([]);
      }

      // 3. Fetch challenges & submissions
      const { data: challengesData } = await supabase.from('challenges').select('*');
      setChallenges(challengesData || []);

      const { data: submissionsData } = await supabase.from('challenge_entries').select('*').limit(200);
      setSubmissions(submissionsData || []);

      // 4. PRIVATE DATA (Only fetch if logged in)
      if (currentUser) {
        // Bookings - only where user is client or photographer
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            client:client_id(name, avatar_url),
            photographer:photographer_id(name, avatar_url)
          `)
          .or(`client_id.eq.${currentUser.id},photographer_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });
        
        if (bookingsData && bookingsData.length > 0) {
          const mappedBookings = bookingsData.map(b => {
            const client = b.client || { name: 'Unknown Client' };
            const photographer = b.photographer || { name: 'Unknown Photographer' };
            return {
              id: b.id,
              clientId: b.client_id,
              clientName: client.name,
              photographerId: b.photographer_id,
              photographerName: photographer.name,
              photographerAvatar: photographer.avatar_url,
              date: b.event_date,
              budget: '$' + (b.total_price || 0),
              location: b.location,
              message: b.notes,
              status: b.status,
              createdAt: b.created_at
            };
          });
          setBookings(mappedBookings);
        } else {
          setBookings([]);
        }

        // Messages - Thread-based architecture (v3 schema)
        const { data: myThreads } = await supabase
          .from('thread_participants')
          .select('thread_id')
          .eq('user_id', currentUser.id);
        
        if (myThreads && myThreads.length > 0) {
          const threadIds = myThreads.map(t => t.thread_id);
          const { data: threadsData } = await supabase
            .from('message_threads')
            .select(`
              id,
              booking_id,
              created_at,
              thread_participants(user_id, profiles:user_id(id, name, avatar_url, account_type)),
              messages(id, sender_id, body, read_at, created_at, profiles:sender_id(name, avatar_url))
            `)
            .in('id', threadIds)
            .order('created_at', { ascending: false });
          
          if (threadsData) {
            const compiled = compileSupabaseThreads(threadsData, currentUser.id);
            setThreads(compiled);
          } else {
            setThreads([]);
          }
        } else {
          setThreads([]);
        }

        // Follows
        const { data: followsData } = await supabase
          .from('follows')
          .select('*')
          .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);
        if (followsData) setFollows(followsData);

        // Saved work is private to the current account.  Keep just identifiers
        // here so cards and the Saved page share the same source of truth.
        const { data: savedData } = await supabase
          .from('saved_items')
          .select('target_id')
          .eq('user_id', currentUser.id)
          .eq('target_type', 'portfolio_item');
        setSavedItemIds((savedData || []).map(item => item.target_id));
      } else {
        // If logged out, clear private data from memory
        setBookings([]);
        setThreads([]);
        setFollows([]);
        setSavedItemIds([]);
      }

      // 4b. Photography categories - platform-controlled, closed set.
      const { data: categoryRows, error: categoryError } = await supabase
        .from('categories')
        .select('name')
        .order('name');
      if (!categoryError && categoryRows?.length) {
        setCategories(categoryRows.map(c => c.name));
      }
      // On error we keep FALLBACK_CATEGORIES, which mirrors the seeded rows, so
      // the pickers still work rather than rendering empty.

      // 5. Comments - Limit to recent 500 across app
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`*, profiles:user_id(${PROFILE_COLUMNS})`)
        .order('created_at', { ascending: false })
        .limit(500);
      if (commentsData) {
        const mappedComments = commentsData.map(c => {
          const user = c.profiles || { name: 'Unknown', avatar: '' };
          return {
            id: c.id,
            photo_id: c.item_id,
            user_id: c.user_id,
            body: c.body,
            created_at: c.created_at,
            userName: user.name,
            userAvatar: user.avatar_url || user.avatar
          };
        });
        setComments(mappedComments);
      }
    };

    syncFromSupabase();

    // Real-time chat messaging subscription channel
    const msgChannel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new;
        appendRealtimeMessage(newMsg);
      })
      .subscribe();

    // Notifications arrive the same way messages do. RLS applies to realtime as
    // well as to selects, so the filter below is a bandwidth optimisation rather
    // than the security boundary - a subscriber is only ever sent rows it could
    // already have read.
    //
    // GUARDED, and this is not optional: THIS EFFECT RUNS WHETHER OR NOT ANYONE
    // IS SIGNED IN. It has no early return, so on the landing page currentUser
    // is null. Reading currentUser.id here threw a TypeError inside the effect,
    // React unmounted the whole tree, and every visitor got a blank page.
    let notifChannel = null;
    if (currentUser?.id) {
      loadNotifications();

      // Coalesced, not per-event. A burst - somebody catching up on a thread, a
      // batch of battles finalising at the same moment - would otherwise fire one
      // full thirty-row refetch per row that arrives. One refetch settles the
      // whole burst, and the trailing edge means the last event still counts.
      notifChannel = supabase
        .channel('notifications_realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications',
            filter: `recipient_id=eq.${currentUser.id}` },
          () => {
            clearTimeout(notifRefetch.current);
            notifRefetch.current = setTimeout(loadNotifications, 400);
          })
        .subscribe();
    } else {
      // Signed out: nothing of yours to show.
      setNotifications([]);
    }

    return () => {
      supabase.removeChannel(msgChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      clearTimeout(notifRefetch.current);
    };
  }, [currentUser]);

  /**
   * Your notifications, newest first, with the actor already joined on by the
   * database so the drawer does not fire a query per row.
   *
   * Failure is silent and non-destructive: an empty drawer is a far better
   * outcome than a crash, and the previous state is left alone rather than
   * being replaced with nothing.
   */
  const loadNotifications = async () => {
    if (!currentUser?.id || String(currentUser.id).startsWith('usr_')) return;
    try {
      const { data, error } = await supabase.rpc('get_my_notifications', {
        p_limit: 30,
        p_only_unread: false,
      });
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    }
  };

  /**
   * Mark them read. Pass ids, or nothing for all of them.
   *
   * Optimistic, like every other mutation here: the badge clears immediately and
   * rolls back if the write fails.
   */
  const markNotificationsRead = async (ids = null) => {
    const before = notifications;
    setNotifications(prev =>
      prev.map(n => (!ids || ids.includes(n.id)) ? { ...n, is_read: true } : n)
    );
    try {
      const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
      if (error) throw error;
    } catch (err) {
      console.warn('Could not mark notifications read:', err.message);
      setNotifications(before);
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.is_read).length;

  // Helper: group flat Supabase messages list into structured UI threads
  const compileSupabaseThreads = (threadsData, myId) => {
    return threadsData.map(thread => {
      // Find the other participant (not me)
      const participants = thread.thread_participants || [];
      const otherParticipant = participants.find(p => p.user_id !== myId);
      const myParticipant = participants.find(p => p.user_id === myId);
      
      const otherProfile = otherParticipant?.profiles || { name: 'Unknown User', avatar_url: '' };
      const myProfile = myParticipant?.profiles || { name: currentUser?.name || 'Me', avatar_url: '' };
      
      const isPhotographer = myProfile.account_type === 'photographer';
      
      // Sort messages chronologically
      const sortedMessages = (thread.messages || []).sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      return {
        id: thread.id, // Use real thread UUID
        photographerId: isPhotographer ? myId : (otherParticipant?.user_id || ''),
        photographerName: isPhotographer ? myProfile.name : otherProfile.name,
        photographerAvatar: isPhotographer ? myProfile.avatar_url : otherProfile.avatar_url,
        clientId: !isPhotographer ? myId : (otherParticipant?.user_id || ''),
        clientName: !isPhotographer ? myProfile.name : otherProfile.name,
        messages: sortedMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_id === myId ? myProfile.name : (msg.profiles?.name || otherProfile.name),
          body: msg.body,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
      };
    });
  };

  const myRole = () => currentUser?.role || currentRole;

  // Helper: push live incoming message from real-time channel to state array
  const appendRealtimeMessage = (m) => {
    // No '1' fallback - it is not a UUID, so it could never match a real sender
    // and every incoming realtime message was classed as "from someone else".
    const myId = currentUser?.id || null;
    setThreads(prev => {
      // Find the thread by thread_id (v3 schema)
      const exists = prev.find(t => t.id === m.thread_id);
      if (exists) {
        return prev.map(t => {
          if (t.id === m.thread_id) {
            // Avoid duplicates
            if (t.messages.some(msg => msg.id === m.id)) return t;
            const senderProfile = users.find(u => u.id === m.sender_id) || { name: m.sender_id === myId ? 'Me' : 'Partner' };
            return {
              ...t,
              messages: [...t.messages, {
                id: m.id,
                senderId: m.sender_id,
                senderName: senderProfile.name,
                body: m.body,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]
            };
          }
          return t;
        });
      }
      return prev;
    });
  };

  const switchRole = (role) => {
    setCurrentRole(role);
  };

  // ── CORE DATA TRANSACTION HANDLERS ──

  // Booking requests
  const addBookingRequest = async (photographerId, details) => {
    const photographer = users.find(p => p.id === photographerId) || { name: 'Unknown', avatar: '' };
    const clientUid = currentUser?.id;
    const clientName = currentUser?.name || 'Client';
    if (!clientUid) return { success: false, error: 'Please sign in to request a booking.' };

    const newBooking = {
      id: `bk_${Date.now()}`,
      clientId: clientUid,
      clientName: clientName,
      photographerId,
      photographerName: photographer.name,
      photographerAvatar: photographer.avatar,
      date: details.date,
      budget: details.budget,
      location: details.location,
      message: details.message,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);

    const priceVal = details.budget ? parseFloat(details.budget.replace(/[^0-9.]/g, '')) || 0 : 0;
    const { data: createdBooking, error: bookingError } = await supabase.from('bookings').insert({
      client_id: clientUid,
      photographer_id: photographerId,
      event_date: details.date,
      total_price: priceVal,
      location: details.location,
      notes: details.message,
      status: 'requested'
    }).select().single();
    if (bookingError) {
      setBookings(prev => prev.filter(booking => booking.id !== newBooking.id));
      return { success: false, error: bookingError.message };
    }
    setBookings(prev => prev.map(booking => booking.id === newBooking.id ? { ...booking, id: createdBooking.id } : booking));

    // Auto seed default message thread
    const newThread = {
      id: `th_${Date.now()}`,
      photographerId,
      photographerName: photographer.name,
      photographerAvatar: photographer.avatar,
      clientId: clientUid,
      clientName: clientName,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: clientUid,
          senderName: clientName,
          body: `Hi ${photographer.name}! I requested a booking for ${details.date} (budget: ${details.budget}). Details: ${details.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]
    };

    setThreads(prev => {
      const exists = prev.find(t => t.photographerId === photographerId && t.clientId === clientUid);
      if (exists) {
        return prev.map(t => {
          if (t.id === exists.id) {
            return { ...t, messages: [...t.messages, newThread.messages[0]] };
          }
          return t;
        });
      }
      return [newThread, ...prev];
    });

    try {
      // Use the get_or_create_thread RPC to find or create a thread
      const { data: threadId } = await supabase.rpc('get_or_create_thread', {
        user_a: clientUid,
        user_b: photographerId
      });
      if (threadId) {
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender_id: clientUid,
          body: `Hi ${photographer.name}! I requested a booking for ${details.date}. Details: ${details.message}`
        });
      }
    } catch (err) {
      console.warn('Thread/message creation error:', err.message);
    }
    return { success: true, booking: createdBooking };
  };

  /**
   * INQUIRE — a client contacting a photographer about working together.
   *
   * The spec was explicit: no fixed price on the profile, and no contact form
   * that sends nowhere. So this does not create a parallel "inquiries" concept
   * with its own table. An inquiry IS a message, in the platform's real
   * messaging system, in a real thread the photographer opens in their inbox.
   * That is the whole point - one conversation, not a form submission that
   * disappears into a mailbox nobody reads.
   *
   * get_or_create_thread is reused deliberately: inquiring twice continues the
   * existing conversation rather than fragmenting it into duplicate threads.
   *
   * @param photographerId who is being contacted
   * @param body           what the client wrote
   * @param context        optional { itemId, itemCaption } when the inquiry
   *                       started from a specific photograph, so the
   *                       photographer knows which work prompted it
   */
  const sendInquiry = async (photographerId, body, context = {}) => {
    const clientId = currentUser?.id;
    if (!clientId) return { success: false, error: 'Sign in to contact a photographer.' };
    if (!photographerId) return { success: false, error: 'Unknown photographer.' };
    if (clientId === photographerId) {
      return { success: false, error: 'You cannot inquire with yourself.' };
    }

    const text = (body || '').trim();
    if (text.length < 10) {
      return { success: false, error: 'Tell them a little about the work — at least a sentence.' };
    }
    if (text.length > 2000) {
      return { success: false, error: 'Keep it under 2000 characters.' };
    }

    const { data: threadId, error: threadError } = await supabase.rpc('get_or_create_thread', {
      user_a: clientId,
      user_b: photographerId,
    });
    if (threadError) return { success: false, error: threadError.message };
    if (!threadId)   return { success: false, error: 'Could not open a conversation.' };

    // Reference the photograph that prompted the inquiry, when there was one.
    const opener = context.itemCaption
      ? `${text}\n\n— about your photograph "${context.itemCaption}"`
      : text;

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({ thread_id: threadId, sender_id: clientId, body: opener })
      .select('id, thread_id, sender_id, body, created_at')
      .single();

    if (messageError) return { success: false, error: messageError.message };

    // Reflect it locally so the inbox shows the conversation immediately.
    setThreads(prev => {
      const existing = prev.find(t => t.id === threadId);
      const entry = {
        id: message.id,
        senderId: clientId,
        body: opener,
        created_at: message.created_at,
      };
      if (existing) {
        return prev.map(t => t.id === threadId
          ? { ...t, messages: [...(t.messages || []), entry] }
          : t);
      }
      const photographer = (users || []).find(u => u.id === photographerId);
      return [{
        id: threadId,
        photographerId,
        clientId,
        photographerName: photographer?.name || 'Photographer',
        clientName: currentUser?.name || 'You',
        photographerAvatar: photographer?.avatar_url || photographer?.avatar || null,
        messages: [entry],
      }, ...prev];
    });

    return { success: true, threadId, message };
  };

  const acceptBooking = async (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'accepted' } : b));
    
    await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      addSystemMessage(booking.photographerId, booking.clientId, `${booking.photographerName} accepted the booking request! Chat is now active.`);
    }
  };

  const declineBooking = async (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'declined' } : b));
    
    await supabase.from('bookings').update({ status: 'declined' }).eq('id', bookingId);

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      addSystemMessage(booking.photographerId, booking.clientId, 'Booking request was declined by the photographer.');
    }
  };

  const completeBooking = async (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
    
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
  };

  const addSystemMessage = async (photographerId, clientId, body) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setThreads(prev => prev.map(t => {
      if (t.photographerId === photographerId && t.clientId === clientId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            { id: `msg_sys_${Date.now()}`, senderId: 'system', senderName: 'System', body, timestamp }
          ]
        };
      }
      return t;
    }));

    await supabase.from('messages').insert({
      sender_id: 'system',
      recipient_id: clientId,
      body,
      timestamp
    });
    return { success: true };
  };

  const toggleSavedItem = async (itemId) => {
    const userId = currentUser?.id;
    if (!userId || !itemId) return { success: false, error: 'Please sign in to save work.' };
    const alreadySaved = savedItemIds.includes(itemId);
    setSavedItemIds(previous => alreadySaved ? previous.filter(id => id !== itemId) : [...previous, itemId]);
    const query = alreadySaved
      ? supabase.from('saved_items').delete().eq('user_id', userId).eq('target_type', 'portfolio_item').eq('target_id', itemId)
      : supabase.from('saved_items').insert({ user_id: userId, target_type: 'portfolio_item', target_id: itemId });
    const { error } = await query;
    if (error) {
      setSavedItemIds(previous => alreadySaved ? [...previous, itemId] : previous.filter(id => id !== itemId));
      return { success: false, error: error.message };
    }
    return { success: true, saved: !alreadySaved };
  };

  // Chats
  const sendMessage = async (threadId, body) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // No mock identity fallback. '1' / 'client_1' are not UUIDs, so every write
    // using them failed - and messages were attributed to a fictional person.
    const senderId = currentUser?.id;
    const senderName = currentUser?.name || currentUser?.display_name || 'You';
    if (!senderId) return { success: false, error: 'Sign in to send a message.' };

    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            { id: `msg_${Date.now()}`, senderId, senderName, body, timestamp }
          ]
        };
      }
      return t;
    }));

    try {
      // threadId is now a real UUID from message_threads
      await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: senderId,
        body
      });
    } catch (err) {
      console.warn('sendMessage error:', err.message);
    }
  };

  // Challenges
  const submitChallengeEntry = async (challengeId, photoUrl) => {
    const newSubmission = {
      challengeId,
      photoUrl,
      submittedAt: new Date().toISOString()
    };
    
    setSubmissions(prev => [...prev, newSubmission]);
    setChallenges(prev => prev.map(ch => {
      if (ch.id === challengeId) {
        return { ...ch, entries: ch.entries + 1 };
      }
      return ch;
    }));

    // Was: photographer_id: currentUser?.id || '1' - a non-UUID that made the
    // insert fail its foreign key while the UI reported the entry as submitted.
    if (!currentUser?.id) return { success: false, error: 'Sign in to enter a challenge.' };
    const { error: entryError } = await supabase.from('challenge_entries').insert({
      challenge_id: challengeId,
      photo_url: photoUrl,
      photographer_id: currentUser.id
    });
    if (entryError) return { success: false, error: entryError.message };
    return { success: true };
  };

  // Admin actions
  // Moderation runs through SECURITY DEFINER RPCs that check a real permission
  // in the database. The browser can no longer write to reports/profiles directly.
  const approvePhotoReport = async (reportId) => {
    const { error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_status: 'dismissed',
      p_notes: 'Dismissed by moderator'
    });
    if (error) {
      console.warn('Dismiss report refused:', error.message);
      return { success: false, error: error.message };
    }
    setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: 'dismissed' } : rep));
    return { success: true };
  };

  const removeReportedPhoto = async (reportId) => {
    const { error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_status: 'resolved',
      p_notes: 'Content removed by moderator'
    });
    if (error) {
      console.warn('Resolve report refused:', error.message);
      return { success: false, error: error.message };
    }
    setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: 'resolved' } : rep));
    return { success: true };
  };

  // User-facing: submit a report against any entity
  const submitReport = async (targetType, targetId, reason) => {
    const userId = currentUser?.id;
    if (!userId) return;
    const newReport = {
      id: `rep_${Date.now()}`,
      reporter_id: userId,
      target_type: targetType,
      target_id: targetId,
      reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
    try {
      await supabase.from('reports').insert({
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        reason
      });
    } catch (err) {
      console.warn('submitReport error:', err.message);
    }
    await recordAuditLog('REPORT_SUBMITTED', targetId, { target_type: targetType, reason });
  };

  const verifyPhotographer = async (userId) => {
    const { error } = await supabase.rpc('admin_set_user_verified', {
      p_user_id: userId,
      p_verified: true
    });
    if (error) {
      console.warn('Verify refused:', error.message);
      return { success: false, error: error.message };
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: true } : u));
    return { success: true };
  };

  const banPhotographer = async (userId) => {
    const userObj = users.find(u => u.id === userId);
    if (!userObj) return { success: false, error: 'User not found' };
    const nextBanned = !userObj.banned;
    const { error } = await supabase.rpc('admin_set_user_banned', {
      p_user_id: userId,
      p_banned: nextBanned
    });
    if (error) {
      console.warn('Ban refused:', error.message);
      return { success: false, error: error.message };
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: nextBanned } : u));
    return { success: true };
  };

  /**
   * Vote in a battle.
   *
   * The database is the only thing that decides anything here. It enforces one
   * vote per person, blocks voting on your own work, applies a daily cap, and
   * awards points when the battle closes (migration v15).
   *
   * WHAT WAS REMOVED: a ~90-line fallback that ran a full Elo calculation in
   * the browser when the RPC failed, adjusted every affected user's points, and
   * re-sorted global_rank locally. None of it was ever written to the database
   * - its own comment admitted "No database writes on this path". The effect
   * was that a user watched their rank climb through a session and reset on
   * refresh, and the "⚡ 1200 · +18" ratings on battle cards were fiction. There
   * is one points system now, and it lives on the server.
   */
  const castBattleVote = async (battleId, side) => {
    const battle = battles.find(b => b.id === battleId);
    if (!battle) return { success: false, error: 'That battle is no longer available.' };
    if (!currentUser?.id) return { success: false, error: 'Sign in to vote.' };

    const selectedPhotoId = side === 'a' ? battle.photoA.id : battle.photoB.id;

    const { data, error } = await supabase.rpc('cast_photo_battle_vote', {
      p_battle_id: battleId,
      p_selected_photo_id: selectedPhotoId,
    });

    if (error) {
      // The database raises readable messages for the cases a voter can
      // actually hit: already voted, own battle, closed, daily cap.
      return { success: false, error: error.message };
    }

    const result = data?.[0];
    if (!result) return { success: false, error: 'Vote was not recorded.' };

    setBattles(prev => prev.map(item => item.id === battleId ? {
      ...item,
      totalVotes: result.votes_a + result.votes_b,
      status: result.status,
      photoA: { ...item.photoA, votes: result.votes_a },
      photoB: { ...item.photoB, votes: result.votes_b },
      winnerId: result.winner_id || null,
    } : item));

    return {
      success: true,
      status: result.status,
      winnerId: result.winner_id || null,
      votesA: result.votes_a,
      votesB: result.votes_b,
    };
  };


  const resolveDispute = async (disputeId, resolution) => {
    const { error } = await supabase.rpc('admin_resolve_dispute', {
      p_dispute_id: disputeId,
      p_resolution: resolution
    });
    if (error) {
      console.warn('Resolve dispute refused:', error.message);
      return { success: false, error: error.message };
    }
    setDisputes(prev => prev.map(dsp => dsp.id === disputeId ? { ...dsp, status: 'resolved', resolution } : dsp));
    return { success: true };
  };

  const updateProfile = async (userId, data) => {
    // Normalize avatar fields: if either avatar or avatar_url is updated, sync both
    const normalized = { ...data };
    if (data.avatar && !data.avatar_url) normalized.avatar_url = data.avatar;
    if (data.avatar_url && !data.avatar) normalized.avatar = data.avatar_url;

    const previousUser = users.find(user => user.id === userId);
    const previousCurrentUser = currentUser;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...normalized } : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...normalized }));
    }
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(normalized)
      .eq('id', userId)
      // See the note in updateProfileSettings: a bare .select() requests columns
      // this role cannot read, the request fails, and the optimistic update is
      // rolled back - so every profile edit silently reverted.
      .select(PROFILE_COLUMNS)
      .single();
    if (error) {
      setUsers(prev => prev.map(user => user.id === userId ? previousUser : user));
      if (previousCurrentUser?.id === userId) setCurrentUser(previousCurrentUser);
      throw error;
    }
    setUsers(prev => prev.map(user => user.id === userId ? updatedProfile : user));
    if (currentUser?.id === userId) setCurrentUser(updatedProfile);
    return updatedProfile;
  };

  const searchUsers = async (query) => {
    if (!query || query.trim().length === 0) return [];
    try {
      const { data, error } = await supabase.rpc('search_users', {
        query: query.trim(),
        p_limit: 20
      });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('searchUsers error:', err.message);
      return [];
    }
  };

  const searchPosts = async (query) => {
    if (!query || query.trim().length === 0) return [];
    try {
      const { data, error } = await supabase.rpc('search_posts', {
        query: query.trim(),
        p_limit: 20
      });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('searchPosts error:', err.message);
      return [];
    }
  };

  /**
   * Like / unlike a photograph.
   *
   * Three things were wrong here and all three are the same mistake in
   * different clothes - trusting a write without looking at what came back:
   *
   *   1. It fell back to the string 'anon_user' when signed out. That is not a
   *      UUID, so the insert always failed - and the UI still showed a like.
   *   2. supabase-js RESOLVES with { error }; it does not throw. The try/catch
   *      never fired, so a rejected write looked identical to a successful one.
   *   3. There was no rollback, so the optimistic count survived a failure and
   *      only corrected itself on the next full reload.
   *
   * The count itself is now maintained by a database trigger (migration v14),
   * so the optimistic number here is presentation only - the server owns truth.
   */
  const toggleLikePost = async (postId) => {
    const userId = currentUser?.id;
    if (!userId) return { success: false, error: 'Sign in to like work.' };
    if (!postId)  return { success: false, error: 'Unknown photograph.' };

    const { data: existing, error: readErr } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', postId)
      .maybeSingle();

    if (readErr) return { success: false, error: readErr.message };

    const liked = !existing;
    const delta = liked ? 1 : -1;

    // Optimistic: respond now, correct later if the server disagrees.
    setPhotos(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 0) + delta) } : p));

    const { error } = liked
      ? await supabase.from('likes').insert({ user_id: userId, item_id: postId })
      : await supabase.from('likes').delete().eq('user_id', userId).eq('item_id', postId);

    if (error) {
      // Roll the optimistic change back rather than leaving a lie on screen.
      setPhotos(prev => prev.map(p =>
        p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 0) - delta) } : p));
      return { success: false, error: error.message };
    }
    return { success: true, liked };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPhotosPaginated = useCallback(async (start, end, filterType = 'for-you') => {
    let basePhotos = photos;
    if (filterType === 'following' && currentUser) {
      const followedIds = (follows || []).filter(f => f.follower_id === currentUser.id).map(f => f.following_id);
      basePhotos = (photos || []).filter(p => followedIds.includes(p.ownerId));
    }

    try {
      // The get_feed RPC is deliberately NOT used here yet.
      //
      // Its signature is get_feed(p_user_id, p_cursor, p_limit) and it has no
      // offset. The client only ever passed p_limit, so page 2 asked for the
      // same top rows as page 1: the feed re-fetched the first page forever
      // while hasMore stayed true, and infinite scroll appended nothing. Its
      // return shape also omits the author, so posts rendered with a blank
      // avatar and no name.
      //
      // Rather than paper over that, we page portfolio_items directly below -
      // it paginates correctly with .range() and returns the full author. The
      // ranked timeline can come back once get_feed takes a real cursor and
      // returns the photographer; that needs a migration, not a client change.

      let query = supabase
        .from('portfolio_items')
        .select(`*, albums!inner(privacy_level), profiles:photographer_id(${PROFILE_COLUMNS})`)
        .eq('albums.privacy_level', 'public');

      if (filterType === 'following' && currentUser) {
        const followedIds = (follows || []).filter(f => f.follower_id === currentUser.id).map(f => f.following_id);
        if (followedIds.length === 0) {
          return []; // return empty if not following anyone
        }
        query = query.in('photographer_id', followedIds);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.warn('Error fetching paginated photos, falling back to local mock data:', error);
        return basePhotos.slice(start, end + 1);
      }
      if (data && data.length > 0) {
        return data.map(p => {
          const owner = p.profiles || { name: 'Photographer', avatar: '' };
          return {
            id: p.id,
            url: p.media_url,
            isVideo: p.media_url?.toLowerCase()?.includes('.mp4') || p.media_url?.toLowerCase()?.includes('.webm') || p.media_url?.includes('/video/'),
            ownerId: p.photographer_id,
            ownerName: owner.name || 'Photographer',
            ownerAvatar: owner.avatar || '',
            caption: p.caption,
            category: p.categories?.[0] || 'General',
            customStyle: p.custom_style || null,
            gear: p.exif_data?.camera_model,
            location: owner.location,
            // votes is the battle Elo score, not a like count. Reading it here
            // meant the heart on the feed showed how a photograph was doing in
            // competition - two different numbers wearing the same icon.
            likes: p.like_count || 0,
            comments: p.comment_count || 0,
            // Measured at upload and stored by migration v23, not guessed from the
            // file extension. The line that stood here reported every still as
            // 3/4 and every .mp4 as 9/16, so a 3:2 landscape was rendered in a
            // portrait box and cropped - the single thing the first outside
            // photographer to use the product complained about. null now means
            // unknown, and a caller can decide what to do about that rather
            // than inheriting a wrong ratio as though it were measured.
            width: p.width ?? null,
            height: p.height ?? null,
            aspectRatio: aspectRatioOf(p.width, p.height),
            orientation: orientationOf(p.width, p.height),
            ratioLabel: ratioLabel(p.width, p.height),
            exif: fromStoredExif(p.exif_data),
            timestamp: 'Just now'
          };
        });
      } else {
        // The in-memory list is populated from the same database on app load.
        return basePhotos.slice(start, end + 1);
      }
    } catch (err) {
      console.warn('Exception fetching paginated photos, falling back to local mock data:', err);
      return basePhotos.slice(start, end + 1);
    }
  // Stable deps: photos and follows are stable arrays; currentUser.id won't change mid-session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const uploadPhoto = async ({ file, url, caption, category, customStyle, gear, location, exifData, destination = 'feed', alt_text = '', width = null, height = null }) => {
    // Validate at the choke point, not in the form. Every upload path goes
    // through here, so a request edited in the browser cannot introduce a
    // category the platform does not define, or a style carrying markup.
    if (category && !isKnownCategory(category, categories)) {
      return { success: false, error: `"${category}" is not a photography category.` };
    }
    const styleCheck = validatePersonalStyle(customStyle);
    if (!styleCheck.ok) {
      return { success: false, error: styleCheck.error };
    }
    customStyle = styleCheck.value || null;
    const userId = currentUser?.id;
    if (!userId) return { success: false, error: 'Sign in to upload.' };
    const userName = currentUser?.display_name || currentUser?.name || 'Photographer';
    // Null when they have no picture. This used to fall back to a hardcoded
    // stock photograph, which then travelled with the upload and appeared as
    // the photographer's own face beside their work.
    const userAvatar = avatarUrlOf(currentUser?.avatar_url, currentUser?.avatar);

    let finalUrl = url;

    // Handle Storage File upload if a File object is provided
    if (file) {
      try {
        // Derive the extension from the MIME type rather than the filename.
        // A user-supplied name like "photo.html" would otherwise be stored, and
        // post-media is a public bucket that serves whatever it holds.
        const EXT_BY_TYPE = {
          'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
          'image/avif': 'avif', 'image/heic': 'heic',
          'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov'
        };
        const contentType = (file.type || '').toLowerCase();
        const fileExt = EXT_BY_TYPE[contentType];
        if (!fileExt) {
          throw new Error('Unsupported file type. Upload a JPEG, PNG, WEBP, AVIF, HEIC, MP4, WEBM or MOV.');
        }
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('post-media')
          .upload(fileName, file, { contentType });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);
          if (urlData?.publicUrl) {
            finalUrl = urlData.publicUrl;
          }
        } else {
          console.warn('Storage upload warning:', uploadErr.message);
        }
      } catch (err) {
        console.warn('Storage upload exception:', err);
      }
    }

    const newPhoto = {
      id: `p_${Date.now()}`,
      url: finalUrl,
      owner_id: userId,
      ownerId: userId,
      ownerName: userName,
      ownerAvatar: userAvatar,
      caption: caption || 'New photography post',
      category: category || 'Nature',
      customStyle: customStyle || null,
      destination,
      alt_text,
      // The optimistic row must carry the same measured shape the reloaded row
      // will, or the photograph visibly jumps size the moment the feed refetches.
      width: width || null,
      height: height || null,
      aspectRatio: aspectRatioOf(width, height),
      orientation: orientationOf(width, height),
      ratioLabel: ratioLabel(width, height),
      exif: fromStoredExif(exifData),
      likes: 0,
      comments: 0,
      created_at: new Date().toISOString(),
      timestamp: 'Just now'
    };

    // Held because newPhoto.id is reassigned to the real row id on success. If
    // the publish fails we need the placeholder's id to take it back out again.
    const optimisticId = newPhoto.id;
    setPhotos(prev => [newPhoto, ...prev]);

    try {
      // portfolio_items is the canonical public gallery used by profile, feed,
      // search, likes and saved items in the current schema.
      if (userId && !userId.startsWith('usr_') && !userId.startsWith('anon_')) {
        let { data: album } = await supabase
          .from('albums')
          .select('id')
          .eq('photographer_id', userId)
          .eq('privacy_level', 'public')
          .limit(1)
          .maybeSingle();
        if (!album) {
          const { data: createdAlbum, error: albumError } = await supabase
            .from('albums')
            .insert({ photographer_id: userId, title: 'Portfolio', privacy_level: 'public' })
            .select('id')
            .single();
          if (albumError) throw albumError;
          album = createdAlbum;
        }
        const { data: portfolioItem, error: portfolioError } = await supabase
          .from('portfolio_items')
          .insert({
            album_id: album.id,
            photographer_id: userId,
            media_url: finalUrl,
            caption: caption || '',
            categories: [category || 'Nature'],
            custom_style: customStyle || null,
            exif_data: exifData || null,
            // Measured in the browser at upload (migration v23). aspect_ratio
            // is a generated column derived from these, so it is never written
            // directly and can never disagree with them.
            width: width || null,
            height: height || null,
            // alt_text and location were collected from the photographer and
            // then thrown away: the old code wrote them to `photos`, which has
            // neither column, inside a swallowed catch. Both columns now exist
            // on portfolio_items (migration v14), so they are finally kept.
            alt_text: alt_text || null,
            location: location || null
          })
          .select('id')
          .single();
        if (portfolioError) {
          // portfolio_items IS the upload. Everything after this point is
          // best-effort compatibility writing, so this failure alone has to
          // reach the photographer.
          portfolioError.__essential = true;
          throw portfolioError;
        }
        newPhoto.id = portfolioItem.id;
        newPhoto.gear = gear || null;
        newPhoto.location = location || null;
        newPhoto.customStyle = customStyle || null;
        setPhotos(prev => prev.map(photo => photo.id.startsWith('p_') && photo.created_at === newPhoto.created_at ? newPhoto : photo));
        // This is intentionally automatic: publishing work queues it for a fair
        // same-category match without asking the creator to opt in.
        const { error: queueError } = await supabase.rpc('queue_portfolio_item_for_battle', { p_item_id: portfolioItem.id });
        if (queueError) console.warn('Competition queue note:', queueError.message);
      }

      // Insert into legacy photos table for backward compatibility
      await supabase.from('photos').insert({
        url: finalUrl,
        owner_id: userId,
        caption,
        category,
        destination,
        alt_text
        // custom_style exists on portfolio_items (migration v10) and is written above. 
        // or we could add it if we know the schema. It's stored in React state above.
      });

      // Also insert into new production `posts` table if authenticated
      if (userId && !userId.startsWith('usr_') && !userId.startsWith('anon_')) {
        await supabase.from('posts').insert({
          author_id: userId,
          image_url: finalUrl,
          caption: caption || '',
          location: currentUser?.location || '',
          visibility: 'public'
        });
      }
    } catch (err) {
      // This catch used to swallow everything and then return newPhoto anyway,
      // so a failed publish showed the photographer a success screen and a
      // redirect to a feed their photograph was not in. Migration v24 makes that
      // reachable on an ordinary day - hit the daily upload limit and the insert
      // is refused - so the lie is no longer survivable.
      //
      // The legacy `photos` and `posts` writes below the portfolio insert are
      // genuinely best-effort and still only warn.
      if (err?.__essential || isRateLimitError(err)) {
        setPhotos(prev => prev.filter(p => p.id !== optimisticId));
        throw new Error(humaniseWriteError(err, 'Could not publish this photograph. Try again.'));
      }
      console.warn('Supabase photo upload note:', err.message);
    }

    await recordAuditLog('PHOTO_UPLOAD', newPhoto.id, { category, destination });
    return newPhoto;
  };

  const followUser = async (followingId) => {
    const followerId = currentUser?.id;
    if (!followerId) return;

    const newFollow = { follower_id: followerId, following_id: followingId };
    setFollows(prev => [...prev, newFollow]);

    try {
      const { error } = await supabase.from('follows').insert(newFollow);
      // A refused follow left the button reading "Following" until reload: the
      // optimistic row was added and the failure only logged. With a daily cap
      // in place that is now a state a real person reaches.
      if (error) throw error;
    } catch (err) {
      setFollows(prev => prev.filter(
        f => !(f.follower_id === followerId && f.following_id === followingId)));
      console.warn('Supabase follow error:', err.message);
    }
  };

  const unfollowUser = async (followingId) => {
    const followerId = currentUser?.id;
    if (!followerId) return;

    setFollows(prev => prev.filter(f => !(f.follower_id === followerId && f.following_id === followingId)));

    try {
      await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
    } catch (err) {
      console.warn('Supabase unfollow error:', err.message);
    }
  };

  /**
   * Post a comment on a photograph.
   *
   * Same corrections as likes: require a real signed-in user, check the result,
   * and roll back the optimistic row if the write is rejected. Additionally the
   * temporary row is now REPLACED by the row the database returns, so the
   * comment carries its real id and timestamp - previously it kept a
   * client-invented `c_1699...` id, which meant deleting it, or replying to it,
   * would have addressed a row that does not exist.
   */
  const addPhotoComment = async (photoId, body) => {
    const userId = currentUser?.id;
    if (!userId) return { success: false, error: 'Sign in to comment.' };

    const text = (body || '').trim();
    if (!text)             return { success: false, error: 'Write something first.' };
    if (text.length > 2000) return { success: false, error: 'Comments are limited to 2000 characters.' };

    const tempId = `pending_${Date.now()}`;
    const optimistic = {
      id: tempId,
      photo_id: photoId,
      user_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      userName: currentUser?.name || 'You',
      userAvatar: currentUser?.avatar_url || currentUser?.avatar || '',
      pending: true,
    };
    setComments(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('comments')
      .insert({ item_id: photoId, user_id: userId, body: text })
      .select('id, item_id, user_id, body, created_at')
      .single();

    if (error) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      return { success: false, error: humaniseWriteError(error) };
    }

    // Swap the placeholder for the real record.
    setComments(prev => prev.map(c => c.id === tempId ? {
      ...optimistic,
      id: data.id,
      created_at: data.created_at,
      pending: false,
    } : c));
    return { success: true, comment: data };
  };

  const logoutUser = async () => {
    setUserEmail('');
    setCurrentUser(null);
    await supabase.auth.signOut();
  };

  // Audit Logging (OWASP Top 10 Transparency)
  const recordAuditLog = async (action, target, metadata = {}) => {
    const actorId = currentUser?.id;
    if (!actorId) return;

    try {
      // audit_logs stores the target as (target_type, target_id) — the old
      // single `target` column does not exist, so every insert was failing.
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        action,
        target_type: metadata?.target_type || null,
        target_id: typeof target === 'string' && /^[0-9a-f]{8}-/i.test(target) ? target : null,
        metadata: { ...metadata, target: String(target ?? '') }
      });
    } catch (err) {
      console.warn('Audit log insert warning:', err.message);
    }
  };

  // LinkedIn-style Mutual Connections State
  const [connections, setConnections] = useState([]);

  const requestConnection = async (targetUserId) => {
    const userId = currentUser?.id;
    if (!userId || userId === targetUserId) return;

    const newConn = {
      id: `conn_${Date.now()}`,
      user_a_id: userId,
      user_b_id: targetUserId,
      status: 'pending',
      requested_by: userId,
      created_at: new Date().toISOString()
    };

    setConnections(prev => [...prev, newConn]);
    await recordAuditLog('CONNECTION_REQUEST', targetUserId, { status: 'pending' });

    try {
      await supabase.from('connections').insert({
        user_a_id: userId,
        user_b_id: targetUserId,
        status: 'pending',
        requested_by: userId
      });
    } catch (err) {
      console.warn('Supabase connection request error:', err.message);
    }
  };

  const acceptConnection = async (connectionId) => {
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: 'accepted' } : c));
    await recordAuditLog('CONNECTION_ACCEPT', connectionId, { status: 'accepted' });

    try {
      await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId);
    } catch (err) {
      console.warn('Supabase connection accept error:', err.message);
    }
  };

  return (
    <AppContext.Provider value={{
      currentRole,
      switchRole,
      userEmail,
      isAdmin,
      setUserEmail,
      currentUser,
      authLoading,
      photos,
      categories,
      sendInquiry,
      setPhotos,
      bookings,
      threads,
      challenges,
      submissions,
      users,
      reports,
      disputes,
      battles,
      setBattles,
      addBookingRequest,
      acceptBooking,
      declineBooking,
      completeBooking,
      sendMessage,
      submitChallengeEntry,
      approvePhotoReport,
      removeReportedPhoto,
      submitReport,
      verifyPhotographer,
      banPhotographer,
      resolveDispute,
      updateProfile,
      castBattleVote,
      fetchPhotosPaginated,
      uploadPhoto,
      signUpUser,
      loginUser,
      logoutUser,
      follows,
      comments,
      savedItemIds,
      connections,
      requestConnection,
      acceptConnection,
      recordAuditLog,
      followUser,
      unfollowUser,
      addPhotoComment,
      toggleSavedItem,
      // Phase 2 & 6 additions
      checkUsernameAvailable,
      uploadAvatar,
      setProfileCategories,
      completeOnboarding,
      searchUsers,
      searchPosts,
      toggleLikePost,
      updateProfileSettings,
      // Notifications (migration v20)
      notifications,
      unreadNotificationCount,
      loadNotifications,
      markNotificationsRead
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
