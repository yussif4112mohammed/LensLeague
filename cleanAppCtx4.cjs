const fs = require('fs');

let code = fs.readFileSync('src/context/AppContext.jsx', 'utf8');

// Replace post_id with item_id in toggleLikePost
const toggleLikePostRegex = /await supabase\.from\('likes'\)\.insert\(\{ user_id: userId, post_id: postId \}\);/g;
code = code.replace(toggleLikePostRegex, "await supabase.from('likes').insert({ user_id: userId, item_id: postId });");

const toggleLikePostDeleteRegex = /await supabase\.from\('likes'\)\.delete\(\)\.eq\('user_id', userId\)\.eq\('post_id', postId\);/g;
code = code.replace(toggleLikePostDeleteRegex, "await supabase.from('likes').delete().eq('user_id', userId).eq('item_id', postId);");

const toggleLikePostSelectRegex = /\.eq\('post_id', postId\)/g;
code = code.replace(toggleLikePostSelectRegex, ".eq('item_id', postId)");

// Replace photo_id with item_id in addPhotoComment
const addPhotoCommentRegex = /photo_id: photoId,/g;
code = code.replace(addPhotoCommentRegex, "item_id: photoId,");

fs.writeFileSync('src/context/AppContext.jsx', code);
console.log('Successfully updated toggleLikePost and addPhotoComment mappings');
