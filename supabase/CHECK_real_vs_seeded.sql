-- =================================================================================
-- WHICH USERS AND NOTIFICATIONS ARE REAL?
--
-- Eben's note: "we'd have to work on taking the fake users and notifications out
-- and use the real ones." There is no mock-user array left in the client - I
-- checked - so anyone appearing in the app is a row in profiles. The question is
-- which of those rows are real people and which are leftovers from building.
--
-- A profile with no auth account behind it cannot sign in and is therefore not a
-- person. A profile that has never uploaded, never voted and never messaged is
-- probably a leftover even if it can sign in. This says which is which so the
-- decision to delete is made on evidence rather than on names.
-- =================================================================================
SELECT
  p.id,
  COALESCE(NULLIF(p.display_name, ''), NULLIF(p.name, ''), p.username, '(no name)') AS who,
  CASE WHEN au.id IS NULL THEN 'NO AUTH ACCOUNT - cannot sign in'
       ELSE 'real account' END                       AS account,
  au.last_sign_in_at                                 AS last_signed_in,
  (SELECT COUNT(*) FROM public.portfolio_items pi WHERE pi.photographer_id = p.id)  AS photos,
  (SELECT COUNT(*) FROM public.photo_battle_votes v  WHERE v.voter_id = p.id)       AS votes,
  (SELECT COUNT(*) FROM public.messages m            WHERE m.sender_id = p.id)      AS messages,
  (SELECT COUNT(*) FROM public.follows f             WHERE f.follower_id = p.id)    AS following,
  (SELECT COUNT(*) FROM public.notifications n       WHERE n.recipient_id = p.id)   AS notifications,
  CASE
    WHEN au.id IS NULL THEN '*** not a person - safe to remove'
    WHEN au.last_sign_in_at IS NULL THEN 'account exists but has never signed in'
    WHEN (SELECT COUNT(*) FROM public.portfolio_items pi WHERE pi.photographer_id = p.id) = 0
     AND (SELECT COUNT(*) FROM public.messages m WHERE m.sender_id = p.id) = 0
     AND (SELECT COUNT(*) FROM public.photo_battle_votes v WHERE v.voter_id = p.id) = 0
      THEN 'signed in but has done nothing yet'
    ELSE 'active'
  END                                                AS verdict
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY
  CASE WHEN au.id IS NULL THEN 0 ELSE 1 END,
  au.last_sign_in_at DESC NULLS LAST;
