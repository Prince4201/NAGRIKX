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
