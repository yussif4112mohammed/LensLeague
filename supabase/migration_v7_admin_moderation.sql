-- =================================================================================
-- PHASE 7: CREATE RBAC TABLES + ADMIN SEED DATA + RLS
-- =================================================================================

-- 1. Create RBAC tables if they don't exist
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 2. Seed roles
INSERT INTO public.roles (name, description) VALUES
    ('admin', 'Full platform administrator with all permissions'),
    ('moderator', 'Content moderator with report review and user warning capabilities'),
    ('photographer', 'Standard photographer account'),
    ('client', 'Standard client account')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed permissions
INSERT INTO public.permissions (action, description) VALUES
    ('ban_user', 'Ban or unban a user account'),
    ('verify_user', 'Grant or revoke verification badge'),
    ('moderate_content', 'Review and resolve content reports'),
    ('manage_challenges', 'Create, edit, and delete platform challenges'),
    ('view_audit_logs', 'View the platform audit log'),
    ('manage_bookings', 'Override booking states for dispute resolution'),
    ('view_admin_dashboard', 'Access the admin dashboard')
ON CONFLICT (action) DO NOTHING;

-- 4. Assign all permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- 5. Assign moderation permissions to moderator role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'moderator'
  AND p.action IN ('moderate_content', 'view_audit_logs', 'view_admin_dashboard')
ON CONFLICT DO NOTHING;


-- 6. DROP and RECREATE reports and audit_logs to match v3 schema (overwriting legacy schema.sql)
DROP TABLE IF EXISTS public.reports CASCADE;
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT CHECK (target_type IN ('profile', 'portfolio_item', 'message', 'review')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator')
    )
);

CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator')
    )
);

-- 8. RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
);

CREATE POLICY "Users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = actor_id);

-- 9. Admin RPC: Check permission
CREATE OR REPLACE FUNCTION public.user_has_permission(p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.action = p_action
    );
END;
$$;

-- 10. Admin RPC: Fetch reports
CREATE OR REPLACE FUNCTION public.admin_get_reports(p_status TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS TABLE (
    id UUID,
    reporter_id UUID,
    reporter_name TEXT,
    target_type TEXT,
    target_id UUID,
    reason TEXT,
    status TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.user_has_permission('moderate_content') THEN
        RAISE EXCEPTION 'Unauthorized: missing moderate_content permission';
    END IF;

    RETURN QUERY
    SELECT
        r.id, r.reporter_id,
        COALESCE(p.name, 'Deleted User') AS reporter_name,
        r.target_type, r.target_id, r.reason, r.status,
        r.resolution_notes, r.created_at
    FROM public.reports r
    LEFT JOIN public.profiles p ON r.reporter_id = p.id
    WHERE (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 11. Auto-log admin report actions
CREATE OR REPLACE FUNCTION public.log_admin_report_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
        VALUES (
            auth.uid(),
            'REPORT_' || UPPER(NEW.status),
            'report',
            NEW.id,
            jsonb_build_object(
                'previous_status', OLD.status,
                'new_status', NEW.status,
                'resolution_notes', NEW.resolution_notes
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_admin_report_action ON public.reports;
CREATE TRIGGER trg_log_admin_report_action
AFTER UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_report_action();
