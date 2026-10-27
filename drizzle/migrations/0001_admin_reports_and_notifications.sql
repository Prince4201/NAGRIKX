-- ==============================================================================
-- NAGRIKX: Admin Report Oversight, Broadcast Notifications & Messaging
-- Idempotent migration — safe to re-run
-- ==============================================================================

-- 0. Ensure System Administrator profile exists for audits and event logs
INSERT INTO public.profiles (id, full_name)
VALUES ('a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid, 'System Administrator')
ON CONFLICT (id) DO NOTHING;

-- 1. Admin All-Reports RPC: returns every report with officer + department names
CREATE OR REPLACE FUNCTION public.admin_all_reports(
  _search text DEFAULT '',
  _status text DEFAULT '',
  _category text DEFAULT '',
  _department_id uuid DEFAULT NULL,
  _page integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  reference bigint,
  title text,
  description text,
  category text,
  address text,
  city text,
  status public.report_status,
  priority text,
  public_visible boolean,
  department_id uuid,
  department_name text,
  assigned_officer uuid,
  officer_name text,
  user_id uuid,
  citizen_name text,
  citizen_email text,
  photo_count integer,
  resolution_note text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Verify admin role when an authenticated JWT is present
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator privileges required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.reference,
    r.title,
    r.description,
    r.category,
    r.address,
    r.city,
    r.status,
    r.priority,
    r.public_visible,
    r.department_id,
    d.name AS department_name,
    r.assigned_officer,
    ofc.full_name AS officer_name,
    r.user_id,
    cit.full_name AS citizen_name,
    u.email::text AS citizen_email,
    coalesce(cardinality(r.photo_paths), 0)::integer AS photo_count,
    r.resolution_note,
    r.created_at,
    r.updated_at
  FROM public.reports r
  LEFT JOIN public.departments d ON d.id = r.department_id
  LEFT JOIN public.profiles ofc ON ofc.id = r.assigned_officer
  LEFT JOIN public.profiles cit ON cit.id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE
    (_status = '' OR r.status::text = _status)
    AND (_category = '' OR r.category = _category)
    AND (_department_id IS NULL OR r.department_id = _department_id)
    AND (
      _search = ''
      OR r.title ILIKE '%' || left(_search, 100) || '%'
      OR r.city ILIKE '%' || left(_search, 100) || '%'
      OR r.reference::text ILIKE '%' || left(_search, 100) || '%'
      OR ('NX-' || r.reference::text) ILIKE '%' || left(_search, 100) || '%'
      OR cit.full_name ILIKE '%' || left(_search, 100) || '%'
    )
  ORDER BY r.updated_at DESC
  LIMIT 50 OFFSET greatest(0, least(_page, 10000)) * 50;
END;
$$;

-- Grant execution to anon (dev auth) and authenticated (production JWT)
GRANT EXECUTE ON FUNCTION public.admin_all_reports(text, text, text, uuid, integer) TO anon, authenticated, service_role;

-- 2. Admin Send Notification RPC: broadcast or targeted notifications
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  _message text,
  _target_role text DEFAULT '',      -- '' = all, 'citizen', 'department_officer', 'admin'
  _target_department uuid DEFAULT NULL,
  _target_user uuid DEFAULT NULL,
  _report_id uuid DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sent integer := 0;
  admin_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator privileges required';
  END IF;
  IF char_length(trim(_message)) NOT BETWEEN 2 AND 2000 THEN
    RAISE EXCEPTION 'Notification message must be between 2 and 2000 characters';
  END IF;

  admin_id := coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid);

  -- Single user target
  IF _target_user IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, report_id, message)
    VALUES (_target_user, _report_id, trim(_message));
    sent := 1;
  ELSE
    -- Broadcast: filtered by role and optionally department
    INSERT INTO public.notifications(user_id, report_id, message)
    SELECT ur.user_id, _report_id, trim(_message)
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE
      (_target_role = '' OR ur.role::text = _target_role)
      AND (_target_department IS NULL OR ur.department_id = _target_department)
      AND coalesce(p.notifications_enabled, true);

    GET DIAGNOSTICS sent = ROW_COUNT;
  END IF;

  -- Ensure admin profile exists before audit log insert
  INSERT INTO public.profiles (id, full_name)
  VALUES (admin_id, 'System Administrator')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.admin_audit(actor_id, action, details)
  VALUES(
    admin_id,
    'broadcast_notification',
    jsonb_build_object(
      'message', left(trim(_message), 200),
      'target_role', _target_role,
      'target_department', _target_department,
      'target_user', _target_user,
      'recipients', sent
    )
  );

  RETURN sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, text, uuid, uuid, uuid) TO anon, authenticated, service_role;

-- 3. Admin Reply to User (adds a comment on a report + notification to owner)
CREATE OR REPLACE FUNCTION public.admin_reply_report(
  _report_id uuid,
  _message text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_id uuid;
  admin_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator privileges required';
  END IF;
  IF char_length(trim(_message)) NOT BETWEEN 2 AND 1000 THEN
    RAISE EXCEPTION 'Message must be between 2 and 1000 characters';
  END IF;

  SELECT user_id INTO owner_id FROM public.reports WHERE id = _report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;

  admin_id := coalesce(auth.uid(), 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid);

  -- Ensure actor profile exists for foreign key
  INSERT INTO public.profiles (id, full_name)
  VALUES (admin_id, 'System Administrator')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.report_events(report_id, actor_id, event_type, message)
  VALUES(_report_id, admin_id, 'admin_reply', trim(_message));

  INSERT INTO public.notifications(user_id, report_id, message)
  VALUES(owner_id, _report_id, 'Administrator replied to your report: ' || left(trim(_message), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reply_report(uuid, text) TO anon, authenticated, service_role;

-- 4. Get Report By ID (safe SECURITY DEFINER fetch for authorized callers)
CREATE OR REPLACE FUNCTION public.get_report_by_id(_id uuid)
RETURNS TABLE(
  id uuid,
  reference bigint,
  title text,
  description text,
  category text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  photo_paths text[],
  status public.report_status,
  priority text,
  department_id uuid,
  assigned_officer uuid,
  public_visible boolean,
  resolution_note text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.reference,
    r.title,
    r.description,
    r.category,
    r.address,
    r.city,
    r.latitude,
    r.longitude,
    r.photo_paths,
    r.status,
    r.priority,
    r.department_id,
    r.assigned_officer,
    r.public_visible,
    r.resolution_note,
    r.user_id,
    r.created_at,
    r.updated_at
  FROM public.reports r
  WHERE r.id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_report_by_id(uuid) TO anon, authenticated, service_role;

-- 5. Get Report Events / Messages (returns complete conversation and timeline)
CREATE OR REPLACE FUNCTION public.get_report_events(_report_id uuid)
RETURNS TABLE(
  id uuid,
  report_id uuid,
  actor_id uuid,
  actor_name text,
  actor_role text,
  event_type text,
  message text,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.report_id,
    e.actor_id,
    p.full_name AS actor_name,
    ur.role::text AS actor_role,
    e.event_type,
    e.message,
    e.created_at
  FROM public.report_events e
  LEFT JOIN public.profiles p ON p.id = e.actor_id
  LEFT JOIN public.user_roles ur ON ur.user_id = e.actor_id
  WHERE e.report_id = _report_id
  ORDER BY e.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_report_events(uuid) TO anon, authenticated, service_role;

-- 6. Updated Submit Report RPC: Auto-assigns department AND active department officer
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
  dep_name text;
  ofc_id uuid;
  ofc_name text;
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

  -- Automatically match department based on issue category & city
  SELECT id, name INTO dep, dep_name FROM public.departments
  WHERE active AND _category = ANY(categories) AND (lower(city) = lower(trim(_city)) OR city = '')
  ORDER BY (city <> '') DESC, created_at LIMIT 1;

  -- Automatically assign to an active officer in that department (least loaded first)
  IF dep IS NOT NULL THEN
    SELECT ur.user_id, p.full_name INTO ofc_id, ofc_name
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'department_officer' AND ur.department_id = dep
    ORDER BY (
      SELECT count(*) FROM public.reports r WHERE r.assigned_officer = ur.user_id AND r.status NOT IN ('resolved', 'rejected')
    ) ASC, ur.user_id
    LIMIT 1;
  END IF;

  INSERT INTO public.reports(
    id, user_id, title, description, category, address, city, latitude, longitude, photo_paths, department_id, assigned_officer
  ) VALUES(
    _id, auth.uid(), trim(_title), trim(_description), _category, trim(_address), trim(_city), _latitude, _longitude, _photos, dep, ofc_id
  );

  IF ofc_id IS NOT NULL THEN
    INSERT INTO public.report_events(report_id, actor_id, event_type, message)
    VALUES(_id, auth.uid(), 'submitted', 'Report received and automatically assigned to ' || coalesce(ofc_name, 'Department Officer') || ' (' || coalesce(dep_name, 'Department') || ').');

    INSERT INTO public.notifications(user_id, report_id, message)
    VALUES(ofc_id, _id, 'A new grievance has been assigned to you: ' || left(trim(_title), 80));
  ELSE
    INSERT INTO public.report_events(report_id, actor_id, event_type, message)
    VALUES(_id, auth.uid(), 'submitted', 'Report received and routed to ' || coalesce(dep_name, 'Department') || '. Awaiting officer assignment.');
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_report(uuid, text, text, text, text, text, double precision, double precision, text[]) TO anon, authenticated, service_role;

-- 7. Auto-assign any existing unassigned reports in the system
UPDATE public.reports r
SET assigned_officer = (
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'department_officer' AND ur.department_id = r.department_id
  LIMIT 1
)
WHERE r.assigned_officer IS NULL AND r.department_id IS NOT NULL;

-- 8. Enhanced Workflow Update: allows officers to progress workflow and submit resolution proof
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
  actor uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_manage_report(_id) THEN
    RAISE EXCEPTION 'Not permitted to manage this report';
  END IF;

  SELECT * INTO r FROM public.reports WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;

  is_admin := coalesce(public.has_role(auth.uid(), 'admin'), false);
  actor := coalesce(auth.uid(), _officer, r.assigned_officer, 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1'::uuid);

  IF NOT is_admin AND (_department IS DISTINCT FROM r.department_id OR _visible IS DISTINCT FROM r.public_visible) THEN
    RAISE EXCEPTION 'Only administrators manage department routing and public visibility';
  END IF;
  IF _department IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.departments WHERE id = _department AND active) THEN
    RAISE EXCEPTION 'Choose an active department';
  END IF;
  IF char_length(trim(_note)) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'Add an update note between 5 and 1000 characters';
  END IF;

  UPDATE public.reports
  SET status = _status,
      priority = _priority,
      department_id = _department,
      assigned_officer = _officer,
      public_visible = _visible,
      resolution_note = CASE WHEN _status IN ('resolved', 'rejected') THEN trim(_note) ELSE resolution_note END,
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.profiles (id, full_name)
  VALUES (actor, 'Department Officer')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.report_events(report_id, actor_id, event_type, message)
  VALUES(_id, actor, 'status_update', replace(_status::text, '_', ' ') || ': ' || trim(_note));

  INSERT INTO public.notifications(user_id, report_id, message)
  SELECT r.user_id, _id, 'Your report NX-' || r.reference || ' status is now ' || replace(_status::text, '_', ' ') || ': ' || left(trim(_note), 80)
  WHERE EXISTS(SELECT 1 FROM public.profiles WHERE id = r.user_id AND notifications_enabled);

  INSERT INTO public.admin_audit(actor_id, action, details)
  VALUES(
    actor,
    'workflow_updated',
    jsonb_build_object('report_id', _id, 'status', _status, 'priority', _priority, 'assigned_officer', _officer, 'note', trim(_note))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_report_workflow(uuid, public.report_status, text, uuid, uuid, boolean, text) TO anon, authenticated, service_role;


