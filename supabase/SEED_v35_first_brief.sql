-- =================================================================================
-- SEED — the first brief
--
-- A direct INSERT rather than a call to admin_create_brief, because the SQL
-- editor runs without a JWT: auth.uid() is NULL there, so the permission check
-- inside that function would refuse. created_by is left NULL for the same
-- reason, and the audit log records nothing, which is correct - nobody was
-- signed in.
--
-- From the app itself, an operator uses admin_create_brief and both are filled.
--
-- EDIT THE THREE VALUES BELOW BEFORE RUNNING. The window below opens now and
-- runs for seven days.
--
-- Note what the rule means in practice: only photographs UPLOADED inside this
-- window can be entered. Nothing already in the database qualifies. That is the
-- feature working, not the feature broken.
-- =================================================================================
INSERT INTO public.briefs (title, prompt, category, opens_at, closes_at)
VALUES (
  'Golden hour, no sun',
  'Shoot in the last hour before sunset, and keep the sun itself out of the frame. Let the light do the work.',
  NULL,                      -- or a category name: 'Portrait', 'Street', 'Landscape'...
  NOW(),
  NOW() + INTERVAL '7 days'
)
RETURNING id, title, opens_at, closes_at;
