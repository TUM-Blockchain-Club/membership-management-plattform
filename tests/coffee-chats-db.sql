begin;

do $$
declare
  first_member_id bigint;
  second_member_id bigint;
  test_round_id uuid;
  inserted_count integer;
  replay_rejected boolean := false;
begin
  select id into first_member_id
  from public.members_main
  order by id
  limit 1;

  select id into second_member_id
  from public.members_main
  where id <> first_member_id
  order by id
  limit 1;

  if first_member_id is null or second_member_id is null then
    raise exception 'Coffee Chats DB test requires at least two members';
  end if;

  update public.cc_rounds set status = 'closed' where status = 'open';

  insert into public.cc_rounds (month, status)
  values (to_char(current_date + interval '100 years', 'YYYY-MM'), 'open')
  returning id into test_round_id;

  insert into public.cc_signups (round_id, member_id)
  values
    (test_round_id, first_member_id),
    (test_round_id, second_member_id);

  inserted_count := public.commit_coffee_chat_pairing(
    test_round_id,
    jsonb_build_array(
      jsonb_build_object(
        'person1_id', first_member_id,
        'person2_id', second_member_id,
        'person3_id', null,
        'icebreaker_q1', 'Question one',
        'icebreaker_q2', 'Question two',
        'icebreaker_q3', 'Question three'
      )
    )
  );

  if inserted_count <> 1 then
    raise exception 'Expected one inserted pair, got %', inserted_count;
  end if;

  if not exists (
    select 1 from public.cc_rounds where id = test_round_id and status = 'paired'
  ) then
    raise exception 'Pairing commit did not advance the round to paired';
  end if;

  begin
    perform public.commit_coffee_chat_pairing(test_round_id, '[]'::jsonb);
  exception when others then
    replay_rejected := true;
  end;

  if not replay_rejected then
    raise exception 'Pairing replay was not rejected';
  end if;
end
$$;

rollback;
