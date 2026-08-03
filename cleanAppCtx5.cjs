const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.jsx', 'utf8');

// 1. Rewrite the syncFromSupabase bookings fetch
const syncBookingsRegex = /const \{ data: bookingsData \} = await supabase\s*\.from\('bookings'\)\s*\.select\('\*'\)\s*\.or\(`client_id\.eq\.\$\{currentUser\.id\},photographer_id\.eq\.\$\{currentUser\.id\}`\)\s*\.order\('created_at', \{ ascending: false \}\);\s*if \(bookingsData && bookingsData\.length > 0\) \{\s*const mappedBookings = bookingsData\.map\(b => \{\s*const client = profilesData\?\.find\(p => p\.id === b\.client_id\) \|\| \{ name: 'Unknown Client' \};\s*const photographer = profilesData\?\.find\(p => p\.id === b\.photographer_id\) \|\| \{ name: 'Unknown Photographer' \};\s*return \{\s*id: b\.id,\s*clientId: b\.client_id,\s*clientName: client\.name,\s*photographerId: b\.photographer_id,\s*photographerName: photographer\.name,\s*photographerAvatar: photographer\.avatar,\s*date: b\.date,\s*budget: b\.budget,\s*location: b\.location,\s*message: b\.message,\s*status: b\.status,\s*createdAt: b\.created_at\s*\};\s*\}\);\s*setBookings\(mappedBookings\);\s*\} else \{\s*setBookings\(\[\]\);\s*\}/;

const newSyncBookings = `const { data: bookingsData } = await supabase
          .from('bookings')
          .select(\`
            *,
            client:client_id(name, avatar_url),
            photographer:photographer_id(name, avatar_url)
          \`)
          .or(\`client_id.eq.\${currentUser.id},photographer_id.eq.\${currentUser.id}\`)
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
              budget: '$$' + (b.total_price || 0),
              location: b.location,
              message: b.notes,
              status: b.status,
              createdAt: b.created_at
            };
          });
          setBookings(mappedBookings);
        } else {
          setBookings([]);
        }`;

code = code.replace(syncBookingsRegex, newSyncBookings);

// 2. Rewrite addBookingRequest
const addBookingRegex = /if \(isSupabaseConfigured && String\(photographerId\)\.includes\('-'\)\) \{\s*await supabase\.from\('bookings'\)\.insert\(\{\s*client_id: clientUid,\s*photographer_id: photographerId,\s*date: details\.date,\s*budget: details\.budget,\s*location: details\.location,\s*message: details\.message,\s*status: 'requested'\s*\}\);\s*\}/;

const newAddBooking = `if (isSupabaseConfigured && String(photographerId).includes('-')) {
      const priceVal = details.budget ? parseFloat(details.budget.replace(/[^0-9.]/g, '')) || 0 : 0;
      await supabase.from('bookings').insert({
        client_id: clientUid,
        photographer_id: photographerId,
        event_date: details.date,
        total_price: priceVal,
        location: details.location,
        notes: details.message,
        status: 'requested'
      });
    }`;

code = code.replace(addBookingRegex, newAddBooking);

fs.writeFileSync('src/context/AppContext.jsx', code);
console.log('Successfully updated AppContext booking methods for Phase 5');
