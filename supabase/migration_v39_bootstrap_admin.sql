-- =================================================================================
-- migration v39 — give somebody the admin role
--
-- WHY THIS IS NEEDED, AND WHY NOBODY NOTICED
--
-- Migration v7 built the whole role system: a roles table, a permissions table,
-- role_permissions joining them, and user_roles joining a person to a role. It
-- seeded four roles and seven permissions, and granted the admin role every one
-- of them.
--
-- It never put a row in user_roles. Nothing since has either. So
-- user_has_permission() has returned false for every caller since the day it
-- was written, admin_console_access() with it, and /admin has shown "Access
-- denied" to everyone including the founder.
--
-- That is the explanation for something that looked like a separate bug. The
-- moderation queue was never wired to the database and nobody noticed for
-- months - because nobody could open the page to see that it was empty. A
-- permission system with no members is indistinguishable from a broken one, and
-- it fails in the safe direction, which is exactly why it went unreported.
--
-- WHAT THIS DOES
--
-- Grants the admin role to ONE named account, by email, and prints who got it.
--
-- The email is written out below rather than taken from a variable so that the
-- person running this can read who they are about to make a platform
-- administrator before they press Run. Granting the wrong account full
-- moderation rights is not a mistake you want to make quietly.
--
-- Run in the Supabase SQL editor, which connects as the table owner and so can
-- read auth.users. Safe to run more than once.
-- =================================================================================
BEGIN;

DO $grant$
DECLARE
  -- ── EDIT THIS IF YOU ARE GRANTING SOMEONE ELSE ──────────────────────────
  v_email   TEXT := 'yussif4112@gmail.com';
  -- ────────────────────────────────────────────────────────────────────────
  v_user_id UUID;
  v_role_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No account exists with the email %. Check the address and run again.', v_email;
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE name = 'admin';
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'The admin role does not exist. Migration v7 has not been applied.';
  END IF;

  -- A role with no permissions would grant nothing while looking like it did.
  IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = v_role_id) THEN
    RAISE EXCEPTION 'The admin role exists but carries no permissions. Re-apply migration v7.';
  END IF;

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (v_user_id, v_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (NULL, 'ADMIN_ROLE_GRANTED', 'profile', v_user_id,
          jsonb_build_object('email', v_email,
                             'note', 'Bootstrap grant, run by hand in the SQL editor'));

  RAISE NOTICE 'v39: admin granted to % (%)', v_email, v_user_id;
END
$grant$;

COMMIT;

-- Who can now open the console, and what they may do. If this returns no rows,
-- the grant did not happen and the console will still refuse you.
SELECT
  u.email,
  r.name                                   AS role,
  count(p.action)::INT                     AS permissions,
  string_agg(p.action, ', ' ORDER BY p.action) AS granted,
  ur.assigned_at
FROM public.user_roles ur
JOIN auth.users            u  ON u.id  = ur.user_id
JOIN public.roles          r  ON r.id  = ur.role_id
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
LEFT JOIN public.permissions      p  ON p.id       = rp.permission_id
GROUP BY u.email, r.name, ur.assigned_at
ORDER BY ur.assigned_at;
