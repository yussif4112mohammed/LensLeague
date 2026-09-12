-- =================================================================================
-- TWO QUESTIONS THE SCHEMA AUDIT RAISED
--
-- 1. reviews carries DELETE and UPDATE policies and neither SELECT nor INSERT.
--    Nobody can write a review; nobody can read one. In a hiring marketplace
--    that is the trust mechanism, and it is inert. Before writing a policy I
--    need its REAL columns - who the reviewer is, who is reviewed, what ties it
--    to a booking - because I have now guessed wrong about this schema three
--    times.
--
-- 2. The audit showed three photo tables, three competition systems, two vote
--    tables, two message tables and two saved tables. Which of those are live
--    and which are abandoned? Exact counts, not estimates - reltuples said
--    profiles had 8 when it has 10, so the estimates are not trustworthy here.
-- =================================================================================
WITH review_cols AS (
  SELECT 1 AS ord, 'reviews columns' AS item,
         string_agg(column_name, ', ' ORDER BY ordinal_position) AS value
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'reviews'
), review_pol AS (
  SELECT 2, 'reviews policies, in full',
         COALESCE(string_agg(cmd || ': ' || COALESCE(qual, with_check, '(no expression)'), ' | '),
                  '(none)')
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews'
), counts AS (
  SELECT 3, 'PHOTO TABLES  portfolio_items / photos / posts',
         (SELECT COUNT(*) FROM public.portfolio_items)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.photos)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.posts)::TEXT
  UNION ALL SELECT 4, 'BATTLES  photo_battles / photo_battle_votes',
         (SELECT COUNT(*) FROM public.photo_battles)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.photo_battle_votes)::TEXT
  UNION ALL SELECT 5, 'COMPETITIONS  competitions / entries / votes',
         (SELECT COUNT(*) FROM public.competitions)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.competition_entries)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.competition_votes)::TEXT
  UNION ALL SELECT 6, 'CHALLENGES  challenges / challenge_entries',
         (SELECT COUNT(*) FROM public.challenges)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.challenge_entries)::TEXT
  UNION ALL SELECT 7, 'the other vote table  votes',
         (SELECT COUNT(*) FROM public.votes)::TEXT
  UNION ALL SELECT 8, 'MESSAGES  messages / booking_messages',
         (SELECT COUNT(*) FROM public.messages)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.booking_messages)::TEXT
  UNION ALL SELECT 9, 'SAVED  saved_items / saved_posts',
         (SELECT COUNT(*) FROM public.saved_items)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.saved_posts)::TEXT
  UNION ALL SELECT 10, 'THE MARKETPLACE  bookings / reviews / disputes',
         (SELECT COUNT(*) FROM public.bookings)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.reviews)::TEXT || ' / ' ||
         (SELECT COUNT(*) FROM public.disputes)::TEXT
  UNION ALL SELECT 11, 'exact profiles count (reltuples claimed 8)',
         (SELECT COUNT(*) FROM public.profiles)::TEXT
)
SELECT ord AS "#", item, value FROM (
  SELECT * FROM review_cols UNION ALL SELECT * FROM review_pol UNION ALL SELECT * FROM counts
) q ORDER BY ord;
