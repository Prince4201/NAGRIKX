-- ==============================================================================
-- NAGRIKX: Civic Service Workflows Schema & Functions (Idempotent Migration)
-- Safe to re-run multiple times on existing Supabase databases
-- ==============================================================================

-- 1. Types (created inside DO blocks to prevent ERROR: 42710 type already exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('citizen', 'department_officer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('reported', 'in_review', 'in_progress', 'resolved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS public.departments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK(char_length(name) BETWEEN 2 AND 100),
  city text NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

INSERT INTO public.departments(id, name, city, categories, active) VALUES
  ('00000000-0001-0000-0000-000000000001', 'Roads & Municipal Transport', '', ARRAY['roads'], true),
  ('00000000-0001-0000-0000-000000000002', 'Solid Waste & Sanitation', '', ARRAY['garbage'], true),
  ('00000000-0001-0000-0000-000000000003', 'Street Lighting & Public Works', '', ARRAY['streetlight', 'infrastructure'], true),
  ('00000000-0001-0000-0000-000000000004', 'Water Resources & Sewage', '', ARRAY['water', 'drainage'], true)
ON CONFLICT (id) DO NOTHING;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles(
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK(char_length(full_name) <= 80),
  city text NOT NULL DEFAULT '' CHECK(char_length(city) <= 80),
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'citizen',
  department_id uuid REFERENCES public.departments(id),
  CHECK((role = 'department_officer' AND department_id IS NOT NULL) OR (role <> 'department_officer' AND department_id IS NULL))
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Helper Role Checking Function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 6. RLS Policies for Departments, Profiles, and Roles
DROP POLICY IF EXISTS departments_read ON public.departments;
CREATE POLICY departments_read ON public.departments FOR SELECT TO anon, authenticated USING(active);

DROP POLICY IF EXISTS departments_admin_read ON public.departments;
CREATE POLICY departments_admin_read ON public.departments FOR SELECT TO authenticated USING(public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS profile_read ON public.profiles;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING(id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS profile_update ON public.profiles;
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated USING(id = auth.uid()) WITH CHECK(id = auth.uid());

DROP POLICY IF EXISTS roles_read ON public.user_roles;
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING(user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 7. Citizen Auto-Creation Trigger
CREATE OR REPLACE FUNCTION public.create_civic_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES(NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 80))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role)
  VALUES(NEW.id, 'citizen')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_civic_account() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS civic_account_created ON auth.users;
CREATE TRIGGER civic_account_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_civic_account();

-- 8. Reports Table
CREATE TABLE IF NOT EXISTS public.reports(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL CHECK(char_length(title) BETWEEN 6 AND 80),
  description text NOT NULL CHECK(char_length(description) BETWEEN 20 AND 600),
  category text NOT NULL CHECK(category IN ('roads', 'garbage', 'streetlight', 'water', 'drainage', 'infrastructure', 'other')),
  address text NOT NULL CHECK(char_length(address) BETWEEN 5 AND 200),
  city text NOT NULL CHECK(char_length(city) BETWEEN 2 AND 80),
  latitude double precision CHECK(latitude BETWEEN -90 AND 90),
  longitude double precision CHECK(longitude BETWEEN -180 AND 180),
  photo_paths text[] NOT NULL DEFAULT '{}',
  status public.report_status NOT NULL DEFAULT 'reported',
  priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'high', 'urgent')),
  department_id uuid REFERENCES public.departments(id),
  assigned_officer uuid REFERENCES public.profiles(id),
  public_visible boolean NOT NULL DEFAULT false,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(cardinality(photo_paths) <= 4)
);
GRANT SELECT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS reports_owner_idx ON public.reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_department_idx ON public.reports(department_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_public_idx ON public.reports(public_visible, created_at DESC);

-- 9. Report Access Checking Functions & Policies
CREATE OR REPLACE FUNCTION public.can_manage_report(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
  OR EXISTS(
    SELECT 1 FROM public.reports r
    JOIN public.user_roles u ON u.user_id = auth.uid()
    WHERE r.id = _id AND (u.role = 'department_officer' AND u.department_id = r.department_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_report(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
  OR EXISTS(SELECT 1 FROM public.reports WHERE id = _id AND user_id = auth.uid())
  OR public.can_manage_report(_id);
$$;

REVOKE ALL ON FUNCTION public.can_manage_report(uuid), public.can_read_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_report(uuid), public.can_read_report(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS report_read ON public.reports;
CREATE POLICY report_read ON public.reports FOR SELECT TO authenticated USING(public.can_read_report(id));

-- 10. Report Events (Timeline)
CREATE TABLE IF NOT EXISTS public.report_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  event_type text NOT NULL,
  message text NOT NULL CHECK(char_length(message) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.report_events TO authenticated;
GRANT ALL ON public.report_events TO service_role;
ALTER TABLE public.report_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS report_events_report_idx ON public.report_events(report_id, created_at);

DROP POLICY IF EXISTS event_read ON public.report_events;
CREATE POLICY event_read ON public.report_events FOR SELECT TO authenticated USING(public.can_read_report(report_id));

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE(read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notifications_owner_idx ON public.notifications(user_id, created_at DESC);

DROP POLICY IF EXISTS notification_read ON public.notifications;
CREATE POLICY notification_read ON public.notifications FOR SELECT TO authenticated USING(user_id = auth.uid());

DROP POLICY IF EXISTS notification_update ON public.notifications;
CREATE POLICY notification_update ON public.notifications FOR UPDATE TO authenticated USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());

-- 12. Administrative Audit Log
CREATE TABLE IF NOT EXISTS public.admin_audit(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit TO authenticated;
GRANT ALL ON public.admin_audit TO service_role;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_read ON public.admin_audit;
CREATE POLICY audit_read ON public.admin_audit FOR SELECT TO authenticated USING(public.has_role(auth.uid(), 'admin'));

-- 13. Officer Applications Table
CREATE TABLE IF NOT EXISTS public.officer_applications(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK(char_length(full_name) BETWEEN 2 AND 80),
  email text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id),
  designation text NOT NULL DEFAULT '',
  employee_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.officer_applications TO authenticated;
GRANT ALL ON public.officer_applications TO service_role;
ALTER TABLE public.officer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS officer_app_insert ON public.officer_applications;
CREATE POLICY officer_app_insert ON public.officer_applications FOR INSERT TO authenticated WITH CHECK(user_id = auth.uid());

DROP POLICY IF EXISTS officer_app_read ON public.officer_applications;
CREATE POLICY officer_app_read ON public.officer_applications FOR SELECT TO authenticated USING(user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 14. Report Workflow & Comment RPCs
CREATE OR REPLACE FUNCTION public.submit_report(
  _id uuid,
  _title text,
  _description text,
  _category text,
  _address text,
  _city text,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _photos text[] DEFAULT '{}'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dep uuid;
  path text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit a report'; END IF;
  IF NOT public.has_role(auth.uid(), 'citizen') THEN RAISE EXCEPTION 'Citizen accounts submit reports'; END IF;
  IF (SELECT count(*) FROM public.reports WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many reports. Please try again in an hour';
  END IF;

  FOREACH path IN ARRAY _photos LOOP
    IF split_part(path, '/', 1) <> auth.uid()::text OR split_part(path, '/', 2) <> _id::text OR NOT EXISTS(
      SELECT 1 FROM storage.objects WHERE bucket_id = 'report-photos' AND name = path
    ) THEN
      RAISE EXCEPTION 'Invalid report photograph';
    END IF;
  END LOOP;

  SELECT id INTO dep FROM public.departments
  WHERE active AND _category = ANY(categories) AND (lower(city) = lower(trim(_city)) OR city = '')
  ORDER BY (city <> '') DESC, created_at LIMIT 1;

  INSERT INTO public.reports(id, user_id, title, description, category, address, city, latitude, longitude, photo_paths, department_id)
  VALUES(_id, auth.uid(), trim(_title), trim(_description), _category, trim(_address), trim(_city), _latitude, _longitude, _photos, dep);

  INSERT INTO public.report_events(report_id, actor_id, event_type, message)
  VALUES(_id, auth.uid(), 'submitted', 'Report received. Awaiting department review.');

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_report_comment(_id uuid, _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_read_report(_id) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF char_length(trim(_message)) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Write between 2 and 1000 characters'; END IF;
  IF (SELECT count(*) FROM public.report_events WHERE actor_id = auth.uid() AND created_at > now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'Please wait before adding another update';
  END IF;

  INSERT INTO public.report_events(report_id, actor_id, event_type, message)
  VALUES(_id, auth.uid(), 'comment', trim(_message));

  SELECT user_id INTO owner_id FROM public.reports WHERE id = _id;
  IF owner_id <> auth.uid() THEN
    INSERT INTO public.notifications(user_id, report_id, message)
    SELECT owner_id, _id, 'A new message was added to your report'
    WHERE EXISTS(SELECT 1 FROM public.profiles WHERE id = owner_id AND notifications_enabled);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_report_workflow(
  _id uuid,
  _status public.report_status,
  _priority text,
  _department uuid DEFAULT NULL,
  _officer uuid DEFAULT NULL,
  _visible boolean DEFAULT false,
  _note text DEFAULT ''
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.reports;
  is_admin boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_report(_id) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO r FROM public.reports WHERE id = _id FOR UPDATE;
  is_admin := public.has_role(auth.uid(), 'admin');

  IF NOT is_admin AND (_department IS DISTINCT FROM r.department_id OR _visible IS DISTINCT FROM r.public_visible) THEN
    RAISE EXCEPTION 'Only administrators manage department routing and public visibility';
  END IF;
  IF _department IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.departments WHERE id = _department AND active) THEN
    RAISE EXCEPTION 'Choose an active department';
  END IF;
  IF _officer IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _officer AND role = 'department_officer' AND department_id = _department) THEN
    RAISE EXCEPTION 'Officer must belong to this department';
  END IF;
  IF NOT is_admin AND _officer IS NOT NULL AND _officer <> auth.uid() AND _officer IS DISTINCT FROM r.assigned_officer THEN
    RAISE EXCEPTION 'Officers may only assign a report to themselves';
  END IF;
  IF char_length(trim(_note)) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'Add an update of 5 to 1000 characters';
  END IF;
  IF NOT is_admin AND _status <> r.status AND NOT (
    (r.status = 'reported' AND _status = 'in_review') OR
    (r.status = 'in_review' AND _status IN ('in_progress', 'rejected')) OR
    (r.status = 'in_progress' AND _status IN ('resolved', 'in_review'))
  ) THEN
    RAISE EXCEPTION 'Move through review, progress and resolution in order';
  END IF;

  UPDATE public.reports
  SET status = _status, priority = _priority, department_id = _department, assigned_officer = _officer,
      public_visible = _visible, resolution_note = CASE WHEN _status IN ('resolved', 'rejected') THEN trim(_note) ELSE NULL END,
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.report_events(report_id, actor_id, event_type, message)
  VALUES(_id, auth.uid(), 'status_update', replace(_status::text, '_', ' ') || ': ' || trim(_note));

  INSERT INTO public.notifications(user_id, report_id, message)
  SELECT r.user_id, _id, 'Your report NX-' || r.reference || ' is now ' || replace(_status::text, '_', ' ')
  WHERE EXISTS(SELECT 1 FROM public.profiles WHERE id = r.user_id AND notifications_enabled);

  INSERT INTO public.admin_audit(actor_id, action, details)
  VALUES(auth.uid(), 'report_update', jsonb_build_object('report_id', _id, 'status', _status));
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_report(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.reports;
BEGIN
  SELECT * INTO r FROM public.reports WHERE id = _id FOR UPDATE;
  IF auth.uid() IS NULL OR r.user_id IS DISTINCT FROM auth.uid() OR r.status NOT IN ('resolved', 'rejected') THEN
    RAISE EXCEPTION 'Only the reporting citizen can reopen a closed report';
  END IF;
  IF char_length(trim(_reason)) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'Please describe what still needs fixing';
  END IF;

  UPDATE public.reports SET status = 'in_review', resolution_note = NULL, updated_at = now() WHERE id = _id;

  INSERT INTO public.report_events(report_id, actor_id, event_type, message)
  VALUES(_id, auth.uid(), 'reopened', trim(_reason));
END;
$$;

-- 15. Public Listing & Statistics RPCs
CREATE OR REPLACE FUNCTION public.list_public_reports(
  _search text DEFAULT '',
  _category text DEFAULT '',
  _status text DEFAULT '',
  _page integer DEFAULT 0
)
RETURNS TABLE(id uuid, reference bigint, title text, category text, city text, status public.report_status, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.reference, r.title, r.category, r.city, r.status, r.created_at, r.updated_at
  FROM public.reports r
  WHERE public_visible
    AND (_category = '' OR r.category = _category)
    AND (_status = '' OR r.status::text = _status)
    AND (_search = '' OR r.title ILIKE '%' || left(_search, 100) || '%' OR r.city ILIKE '%' || left(_search, 100) || '%')
  ORDER BY r.created_at DESC
  LIMIT 24 OFFSET greatest(0, least(_page, 10000)) * 24;
$$;

CREATE OR REPLACE FUNCTION public.public_report_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'resolved', count(*) FILTER(WHERE status = 'resolved'),
    'active', count(*) FILTER(WHERE status NOT IN ('resolved', 'rejected')),
    'cities', count(DISTINCT city)
  )
  FROM public.reports WHERE public_visible;
$$;

-- 16. Admin Operations RPCs
CREATE OR REPLACE FUNCTION public.admin_users(_search text DEFAULT '', _page integer DEFAULT 0)
RETURNS TABLE(user_id uuid, full_name text, email text, role public.app_role, department_id uuid, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, u.email::text, r.role, r.department_id, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.full_name ILIKE '%' || left(_search, 100) || '%'
     OR u.email ILIKE '%' || left(_search, 100) || '%'
  ORDER BY p.created_at DESC
  LIMIT 25 OFFSET greatest(0, least(_page, 10000)) * 25;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_user uuid, _role public.app_role, _department uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(738291);
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user AND role = 'admin') AND _role <> 'admin' AND (
    SELECT count(*) FROM public.user_roles WHERE role = 'admin'
  ) <= 1 THEN
    RAISE EXCEPTION 'The last administrator cannot be removed';
  END IF;

  IF _role = 'department_officer' AND NOT EXISTS(SELECT 1 FROM public.departments WHERE id = _department AND active) THEN
    RAISE EXCEPTION 'Choose an active department';
  END IF;

  INSERT INTO public.user_roles(user_id, role, department_id)
  VALUES (_user, _role, CASE WHEN _role = 'department_officer' THEN _department ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role, department_id = EXCLUDED.department_id;

  INSERT INTO public.admin_audit(actor_id, action, details)
  VALUES(
    coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid),
    'role_change',
    jsonb_build_object('user_id', _user, 'role', _role, 'department_id', _department)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_department(_id uuid, _name text, _city text, _categories text[], _active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result uuid;
BEGIN
  IF char_length(trim(_name)) NOT BETWEEN 2 AND 100 OR char_length(trim(_city)) > 80 OR NOT _categories <@ ARRAY['roads', 'garbage', 'streetlight', 'water', 'drainage', 'infrastructure', 'other']::text[] THEN
    RAISE EXCEPTION 'Invalid department details';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.departments(name, city, categories, active)
    VALUES(trim(_name), trim(_city), _categories, _active)
    RETURNING id INTO result;
  ELSE
    UPDATE public.departments
    SET name = trim(_name), city = trim(_city), categories = _categories, active = _active
    WHERE id = _id RETURNING id INTO result;
    IF result IS NULL THEN RAISE EXCEPTION 'Department not found'; END IF;
  END IF;

  INSERT INTO public.admin_audit(actor_id, action, details)
  VALUES(
    coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid),
    'department_saved',
    jsonb_build_object('department_id', result)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_officer(_app_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  app record;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator privileges required';
  END IF;

  SELECT * INTO app FROM public.officer_applications WHERE id = _app_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF app.status <> 'pending' THEN RAISE EXCEPTION 'Application is already %', app.status; END IF;

  UPDATE public.officer_applications
  SET status = 'approved',
      reviewed_by = coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid),
      reviewed_at = now()
  WHERE id = _app_id;

  INSERT INTO public.user_roles (user_id, role, department_id)
  VALUES (app.user_id, 'department_officer', app.department_id)
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'department_officer', department_id = EXCLUDED.department_id;

  INSERT INTO public.notifications (user_id, message)
  VALUES (app.user_id, 'Your officer application has been approved! You now have access to department complaints.');

  INSERT INTO public.admin_audit (actor_id, action, details)
  VALUES (
    coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid),
    'officer_approved',
    jsonb_build_object('application_id', _app_id, 'user_id', app.user_id, 'department_id', app.department_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_officer(_app_id uuid, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  app record;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator privileges required';
  END IF;

  SELECT * INTO app FROM public.officer_applications WHERE id = _app_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;

  UPDATE public.officer_applications
  SET status = 'rejected',
      rejection_reason = trim(_reason),
      reviewed_by = coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid),
      reviewed_at = now()
  WHERE id = _app_id;

  INSERT INTO public.notifications (user_id, message)
  VALUES (app.user_id, 'Your officer application was not approved.' || CASE WHEN trim(_reason) <> '' THEN ' Reason: ' || trim(_reason) ELSE '' END);

  INSERT INTO public.admin_audit (actor_id, action, details)
  VALUES (
    coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid),
    'officer_rejected',
    jsonb_build_object('application_id', _app_id, 'user_id', app.user_id, 'reason', _reason)
  );
END;
$$;

-- 17. Grant Function Permissions
REVOKE ALL ON FUNCTION public.submit_report(uuid, text, text, text, text, text, double precision, double precision, text[]),
  public.add_report_comment(uuid, text),
  public.update_report_workflow(uuid, public.report_status, text, uuid, uuid, boolean, text),
  public.reopen_report(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_report(uuid, text, text, text, text, text, double precision, double precision, text[]),
  public.add_report_comment(uuid, text),
  public.update_report_workflow(uuid, public.report_status, text, uuid, uuid, boolean, text),
  public.reopen_report(uuid, text)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_users(text, integer),
  public.admin_set_role(uuid, public.app_role, uuid),
  public.admin_save_department(uuid, text, text, text[], boolean),
  public.admin_approve_officer(uuid),
  public.admin_reject_officer(uuid, text)
TO anon, authenticated;

REVOKE ALL ON FUNCTION public.list_public_reports(text, text, text, integer), public.public_report_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_reports(text, text, text, integer), public.public_report_stats() TO anon, authenticated;

-- 18. Supabase Storage: Bucket & Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report-photos', 'report-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS photo_upload ON storage.objects;
CREATE POLICY photo_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK(
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS photo_read ON storage.objects;
CREATE POLICY photo_read ON storage.objects FOR SELECT TO authenticated
USING(
  bucket_id = 'report-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS(SELECT 1 FROM public.reports r WHERE name = ANY(r.photo_paths) AND public.can_manage_report(r.id))
  )
);

DROP POLICY IF EXISTS photo_delete ON storage.objects;
CREATE POLICY photo_delete ON storage.objects FOR DELETE TO authenticated
USING(
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS(SELECT 1 FROM public.reports r WHERE name = ANY(r.photo_paths))
);

-- 19. Realtime Publication (Safe Idempotent Setup)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.report_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 20. Seed Default Administrator Account: admin@nagrikx.com / admin123
DO $$
DECLARE
  admin_uid uuid := 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@nagrikx.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@nagrikx.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Administrator"}',
      now(),
      now()
    );
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (admin_uid, 'System Administrator')
  ON CONFLICT (id) DO UPDATE SET full_name = 'System Administrator';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_uid, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin', department_id = NULL;
END $$;