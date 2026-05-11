-- ============================================
-- PÉNZÜGYI ELSZÁMOLÁS FÜGGVÉNY
-- ============================================
-- Ez a függvény kiszámolja az alkalmazottak fizetését
-- a rögzített órák és óradíjak alapján
-- ============================================

-- Pénzügyi jelentés generáló függvény
create or replace function get_payroll_report(
  start_date date,
  end_date date
)
returns table (
  user_id uuid,
  full_name text,
  hourly_rate numeric,
  total_hours numeric,
  total_pay numeric
) 
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Nincs jogosultság a pénzügyi riporthoz.';
  end if;

  return query
  select 
    p.id as user_id,
    p.full_name,
    p.hourly_rate,
    -- Órák összegzése (másodpercekből számolunk vissza órára)
    coalesce(sum(
      extract(epoch from (t.end_time - t.start_time)) / 3600
    ), 0)::numeric(10, 2) as total_hours,
    
    -- Fizetés számítása: Összes óra * Óradíj
    (coalesce(sum(
      extract(epoch from (t.end_time - t.start_time)) / 3600
    ), 0) * coalesce(p.hourly_rate, 0))::numeric(10, 0) as total_pay
    
  from public.profiles p
  left join public.timesheets t on t.user_id = p.id
    and t.work_date >= start_date 
    and t.work_date <= end_date
    and t.entry_type = 'work'
    and t.status != 'rejected'
    and t.start_time is not null
    and t.end_time is not null
  where p.hourly_rate is not null
    and p.hourly_rate > 0
  group by p.id, p.full_name, p.hourly_rate
  having coalesce(sum(
    extract(epoch from (t.end_time - t.start_time)) / 3600
  ), 0) > 0
  order by p.full_name;
end;
$$;

-- RLS policy: csak adminok hívhatják meg
grant execute on function get_payroll_report(date, date) to authenticated;

-- ============================================
-- KÉSZ! Most már használhatod az admin oldalon
-- ============================================
