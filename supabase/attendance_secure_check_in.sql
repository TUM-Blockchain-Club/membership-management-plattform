-- Apply after lectures.sql. Non-destructive; preserves existing attendance.
begin;

-- Calendar access does not include the rotating secrets.
revoke select on public.lectures from public, anon, authenticated;
grant select (id, title, kind, scheduled_at, location, lecturer_member_id,
  is_active, started_at, created_at, updated_at) on public.lectures to authenticated;
revoke insert on public.attendance from public, anon, authenticated;
drop policy if exists "members can check in" on public.attendance;

-- Serialize issuance per lecture. Repeated starts and simultaneous displays
-- share the same code; a second display cannot invalidate the first one.
create or replace function public.attendance_lecture_code(p_lecture_id uuid, p_start boolean default false)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lecture public.lectures%rowtype;
  v_now timestamptz;
  v_code text;
begin
  if not exists (select 1 from public.members_main m
    where m.id = public.current_member_id() and m."Role" = 'Board Member') then
    return jsonb_build_object('error', 'Only board members can perform this action.', 'status', 403);
  end if;
  select * into v_lecture from public.lectures where id = p_lecture_id for update;
  if not found then
    return jsonb_build_object('error', 'Lecture not found.', 'status', 404);
  end if;
  v_now := clock_timestamp();
  if not v_lecture.is_active or v_lecture.started_at is null
    or v_lecture.started_at > v_now or v_lecture.started_at <= v_now - interval '3 hours' then
    if not p_start then
      return jsonb_build_object('error', 'Lecture is not active.', 'status', 409);
    end if;
    v_lecture.is_active := true;
    v_lecture.started_at := v_now;
    v_lecture.current_code := null;
    v_lecture.current_code_at := null;
    v_lecture.previous_code := null;
    v_lecture.previous_code_at := null;
  end if;
  if v_lecture.current_code is null or v_lecture.current_code_at is null
    or v_lecture.current_code_at > v_now or v_lecture.current_code_at <= v_now - interval '15 seconds' then
    -- 48 random bits, URL/QR-friendly, generated only by the database.
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    update public.lectures set
      is_active = v_lecture.is_active, started_at = v_lecture.started_at,
      previous_code = v_lecture.current_code, previous_code_at = v_lecture.current_code_at,
      current_code = v_code, current_code_at = v_now
    where id = p_lecture_id returning * into v_lecture;
  end if;
  return jsonb_build_object('token', v_lecture.id::text || ':' || v_lecture.current_code,
    'expiresAt', v_lecture.current_code_at + interval '30 seconds',
    'rotateAt', v_lecture.current_code_at + interval '15 seconds',
    'serverNow', v_now);
end;
$$;

create or replace function public.attendance_check_in(p_lecture_id uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_member integer := public.current_member_id();
  v_lecture public.lectures%rowtype;
  v_now timestamptz;
  v_inserted integer;
begin
  if v_member is null then
    return jsonb_build_object('error', 'No member profile found.', 'status', 403);
  end if;
  -- Conflicts with start/stop/rotation, but permits concurrent member scans.
  select * into v_lecture from public.lectures where id = p_lecture_id for share;
  if not found then
    return jsonb_build_object('error', 'Lecture not found.', 'status', 404);
  end if;
  v_now := clock_timestamp();
  if not v_lecture.is_active or v_lecture.started_at is null
    or v_lecture.started_at > v_now or v_lecture.started_at <= v_now - interval '3 hours' then
    return jsonb_build_object('error', 'Lecture is not currently active.', 'status', 403);
  end if;
  if not coalesce((v_lecture.current_code = upper(p_code)
      and v_lecture.current_code_at between v_now - interval '30 seconds' and v_now)
    or (v_lecture.previous_code = upper(p_code)
      and v_lecture.previous_code_at between v_now - interval '30 seconds' and v_now), false) then
    return jsonb_build_object('error', 'The QR code has expired or is invalid. Please scan the latest code.', 'status', 410);
  end if;
  insert into public.attendance (member_id, lecture_id, checked_in_at)
    values (v_member, p_lecture_id, v_now)
    on conflict (member_id, lecture_id) do nothing;
  get diagnostics v_inserted = row_count;
  return jsonb_build_object('alreadyCheckedIn', v_inserted = 0, 'lecture',
    jsonb_build_object('id', v_lecture.id, 'title', v_lecture.title,
      'kind', v_lecture.kind, 'scheduled_at', v_lecture.scheduled_at));
end;
$$;
revoke all on function public.attendance_lecture_code(uuid, boolean) from public, anon;
revoke all on function public.attendance_check_in(uuid, text) from public, anon;
grant execute on function public.attendance_lecture_code(uuid, boolean) to authenticated;
grant execute on function public.attendance_check_in(uuid, text) to authenticated;
commit;
