const fs = require('fs');

let code = fs.readFileSync('src/context/AppContext.jsx', 'utf8');

const fetchStart = code.indexOf("  const fetchPhotosPaginated = async");
const uploadStart = code.indexOf("  const uploadPhoto = async");
const followStart = code.indexOf("  const followUser = async");

if (fetchStart !== -1 && followStart !== -1) {
  const newCode = `  const fetchPhotosPaginated = async (start, end, filterType = 'for-you') => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('portfolio_items')
        .select(\`
          *,
          albums!inner(privacy_level, client_id),
          profiles:photographer_id(name, avatar_url, location)
        \`)
        .eq('albums.privacy_level', 'public');

      if (filterType === 'following' && currentUser) {
        const followedIds = (follows || []).filter(f => f.follower_id === currentUser.id).map(f => f.following_id);
        if (followedIds.length === 0) return [];
        query = query.in('photographer_id', followedIds);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.warn('Error fetching portfolio items:', error);
        return [];
      }

      return data.map(p => {
        const owner = p.profiles || { name: 'Photographer', avatar_url: '' };
        return {
          id: p.id,
          url: p.media_url,
          isVideo: p.media_url?.toLowerCase()?.includes('.mp4') || p.media_url?.includes('/video/'),
          ownerId: p.photographer_id,
          ownerName: owner.name || 'Photographer',
          ownerAvatar: owner.avatar_url || '',
          caption: p.caption,
          category: p.categories?.[0] || 'General',
          tags: p.tags || [],
          likes: 0,
          aspectRatio: (p.media_url?.toLowerCase()?.includes('.mp4') ? '9/16' : '3/4'),
          timestamp: new Date(p.created_at).toLocaleDateString()
        };
      });
    } catch (err) {
      console.warn('Exception fetching paginated photos:', err);
      return [];
    }
  };

  const uploadPhoto = async ({ file, url, caption, category, destination = 'feed', alt_text = '' }) => {
    const userId = currentUser?.id;
    if (!userId || !isSupabaseConfigured) return null;

    try {
      let { data: album } = await supabase
        .from('albums')
        .select('id')
        .eq('photographer_id', userId)
        .eq('title', 'Default Portfolio')
        .maybeSingle();

      if (!album) {
        const { data: newAlbum, error: albumErr } = await supabase
          .from('albums')
          .insert({
            photographer_id: userId,
            title: 'Default Portfolio',
            privacy_level: 'public'
          })
          .select()
          .single();
        if (albumErr) throw albumErr;
        album = newAlbum;
      }

      let finalUrl = url;
      if (file) {
        const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = \`\${userId}/\${Date.now()}_\${Math.random().toString(36).substring(2, 8)}.\${fileExt}\`;
        const { error: uploadErr } = await supabase.storage
          .from('portfolios')
          .upload(fileName, file, { contentType: file.type || 'image/jpeg' });
        
        if (uploadErr) throw uploadErr;
        
        const { data: urlData } = supabase.storage
          .from('portfolios')
          .getPublicUrl(fileName);
        finalUrl = urlData.publicUrl;
      }

      const { data: insertedItem, error: insertErr } = await supabase
        .from('portfolio_items')
        .insert({
          album_id: album.id,
          photographer_id: userId,
          media_url: finalUrl,
          caption: caption || '',
          categories: category ? [category] : [],
          tags: [destination]
        })
        .select('*, albums!inner(privacy_level, client_id), profiles:photographer_id(name, avatar_url, location)')
        .single();
        
      if (insertErr) throw insertErr;

      const newPhoto = {
        id: insertedItem.id,
        url: insertedItem.media_url,
        ownerId: insertedItem.photographer_id,
        ownerName: currentUser.display_name || currentUser.name,
        ownerAvatar: currentUser.avatar,
        caption: insertedItem.caption,
        category: category || 'General',
        timestamp: 'Just now'
      };

      setPhotos(prev => [newPhoto, ...prev]);
      await recordAuditLog('PHOTO_UPLOAD', insertedItem.id, { category, destination });
      return newPhoto;
    } catch (err) {
      console.error('Error uploading portfolio item:', err);
      return null;
    }
  };

`;

  code = code.substring(0, fetchStart) + newCode + code.substring(followStart);
  fs.writeFileSync('src/context/AppContext.jsx', code);
  console.log('Successfully updated AppContext.jsx Phase 3 portoflio endpoints');
} else {
  console.error('Could not find start indices');
}
