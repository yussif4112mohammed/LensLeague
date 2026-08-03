const fs = require('fs');

let code = fs.readFileSync('src/context/AppContext.jsx', 'utf8');

const syncStart = code.indexOf("// 2. Fetch photos - Limit to 100 for feed performance");
const syncEnd = code.indexOf("// 3. Fetch challenges & submissions");

if (syncStart !== -1 && syncEnd !== -1) {
  const newSync = `// 2. Fetch photos (from portfolio_items)
      const { data: photosData } = await supabase
        .from('portfolio_items')
        .select(\`*, albums!inner(privacy_level), profiles:photographer_id(name, avatar_url)\`)
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
            likes: 0,
            aspectRatio: p.media_url?.toLowerCase()?.includes('.mp4') ? '9/16' : '3/4',
            timestamp: new Date(p.created_at).toLocaleDateString()
          };
        });
        setPhotos(mappedPhotos);
        
        // Dynamically generate fair battles based on matching aspect ratios
        const generateFairBattles = (photoList) => {
          const grouped = {};
          photoList.forEach(p => {
            const ratio = p.aspectRatio || '3/4';
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
                id: \`bat_\${Date.now()}_\${pA.id}_\${pB.id}\`,
                category: pA.category === pB.category ? pA.category : 'Mixed ' + ratio,
                endsIn: '24h',
                photoA: { ...pA, score: 1200 },
                photoB: { ...pB, score: 1200 },
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
        
        setBattles(generateFairBattles(mappedPhotos));
      } else {
        setPhotos([]);
        setBattles([]);
      }

      `;

  code = code.substring(0, syncStart) + newSync + code.substring(syncEnd);
  fs.writeFileSync('src/context/AppContext.jsx', code);
  console.log('Successfully updated syncFromSupabase photos block');
} else {
  console.error('Could not find sync blocks');
}
