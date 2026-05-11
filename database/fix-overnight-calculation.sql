-- ============================================================================
-- ÉJSZAKÁS MŰSZAK (OVERNIGHT) TÁMOGATÁS
-- Ha end_time < start_time (pl. 16:00–02:00), +24h-ként számoljuk az időtartamot.
-- Futtasd a Supabase SQL Editorban, majd deploy (npx vercel --prod).
-- ============================================================================

-- 1. CONSTRAINT: engedélyezzük, hogy work típusnál end_time < start_time legyen (éjszakás)
ALTER TABLE public.timesheets 
  DROP CONSTRAINT IF EXISTS check_times_valid;

ALTER TABLE public.timesheets 
  ADD CONSTRAINT check_times_valid CHECK (
    (entry_type = 'work' AND start_time IS NOT NULL AND end_time IS NOT NULL)
    OR (entry_type IN ('holiday', 'sick_leave') AND start_time IS NULL AND end_time IS NULL)
  );

-- 2. SEGÉD: óraszámítás éjszakásra (end_time < start_time → +24h)
-- work_hours = (CASE WHEN end >= start THEN (end-start) ELSE 86400+(end-start) END)/3600
-- A következő függvényekben minden EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
-- helyett ezt használjuk work típusnál.

-- 2b. DROP meglévő függvények (return type nem változtatható CREATE OR REPLACE-sel)
DROP FUNCTION IF EXISTS get_weekly_report(date, date);
DROP FUNCTION IF EXISTS get_unpaid_report(date, date);
DROP FUNCTION IF EXISTS get_unpaid_report();
DROP FUNCTION IF EXISTS get_weekly_details_for_user(date, date, uuid);
DROP FUNCTION IF EXISTS get_unpaid_details_for_user(uuid, date);
DROP FUNCTION IF EXISTS get_payroll_report(date, date);

-- 3. get_weekly_report (date, date) – heti riport
CREATE OR REPLACE FUNCTION get_weekly_report(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  hourly_rate numeric,
  total_hours numeric,
  total_wages numeric,
  total_expenses numeric,
  grand_total numeric,
  is_fully_paid boolean,
  payment_date timestamp with time zone
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    COALESCE(p.hourly_rate, 0),
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0)::numeric(10, 2) AS total_hours,
    (COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0))::numeric(10, 0) AS total_wages,
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0)::numeric(10, 0) AS total_expenses,
    ((COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0)) + COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0))::numeric(10, 0) AS grand_total,
    BOOL_AND(t.payment_id IS NOT NULL) as is_fully_paid,
    MAX(pay.payment_date) as payment_date
  FROM public.profiles p
  JOIN public.timesheets t ON t.user_id = p.id 
  LEFT JOIN public.payments pay ON t.payment_id = pay.id
  WHERE 
    t.status != 'rejected'
    AND t.work_date >= p_start_date
    AND t.work_date <= p_end_date
  GROUP BY p.id, p.full_name, p.hourly_rate
  HAVING 
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0) > 0 OR
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) > 0;
END;
$$;

-- 4. get_unpaid_report (date, date) – kifizetetlen, dátum szűrővel
CREATE OR REPLACE FUNCTION get_unpaid_report(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  hourly_rate numeric,
  unpaid_hours numeric,
  unpaid_wages numeric,
  unpaid_expenses numeric,
  total_due numeric,
  earliest_unpaid_date date,
  latest_unpaid_date date
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    COALESCE(p.hourly_rate, 0),
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0)::numeric(10, 2) AS unpaid_hours,
    (COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0))::numeric(10, 0) AS unpaid_wages,
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0)::numeric(10, 0) AS unpaid_expenses,
    ((COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0)) + COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0))::numeric(10, 0) AS total_due,
    MIN(t.work_date) as earliest_unpaid_date,
    MAX(t.work_date) as latest_unpaid_date
  FROM public.profiles p
  JOIN public.timesheets t ON t.user_id = p.id 
  WHERE 
    t.payment_id IS NULL 
    AND t.status != 'rejected'
    AND (p_start_date IS NULL OR t.work_date >= p_start_date)
    AND (p_end_date IS NULL OR t.work_date <= p_end_date)
  GROUP BY p.id, p.full_name, p.hourly_rate
  HAVING 
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0) > 0 OR
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) > 0;
END;
$$;

-- 5. get_unpaid_report() – paraméter nélküli (visszafelé kompatibilitás)
CREATE OR REPLACE FUNCTION get_unpaid_report()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  hourly_rate numeric,
  unpaid_hours numeric,
  unpaid_wages numeric,
  unpaid_expenses numeric,
  total_due numeric
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    COALESCE(p.hourly_rate, 0),
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0)::numeric(10, 2) AS unpaid_hours,
    (COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0))::numeric(10, 0) AS unpaid_wages,
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0)::numeric(10, 0) AS unpaid_expenses,
    ((COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0)) + COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0))::numeric(10, 0) AS total_due
  FROM public.profiles p
  JOIN public.timesheets t ON t.user_id = p.id 
  WHERE 
    t.payment_id IS NULL 
    AND t.status != 'rejected'
  GROUP BY p.id, p.full_name, p.hourly_rate
  HAVING 
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0) > 0 OR
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) > 0;
END;
$$;

-- 6. get_weekly_details_for_user – heti részletek (egy user, dátumtartomány)
CREATE OR REPLACE FUNCTION get_weekly_details_for_user(
  p_start_date date,
  p_end_date date,
  p_user_id uuid
)
RETURNS TABLE (
  work_date date,
  entry_type text,
  description text,
  hours numeric,
  wage_amount numeric,
  expense_amount numeric,
  total_daily numeric,
  is_paid boolean,
  payment_date timestamp with time zone
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_hourly_rate numeric;
BEGIN
  SELECT hourly_rate INTO v_hourly_rate FROM public.profiles WHERE id = p_user_id;

  RETURN QUERY
  SELECT 
    t.work_date,
    t.entry_type::text,
    CASE 
      WHEN t.expense_amount > 0 AND t.expense_note IS NOT NULL 
        THEN COALESCE(t.note, '') || ' (+ Költség: ' || t.expense_note || ')'
      ELSE COALESCE(t.note, '') 
    END::text as description,
    CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 
    END::numeric(10, 2) as hours,
    (CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        ((CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END)::numeric(10, 0) as wage_amount,
    COALESCE(t.expense_amount, 0)::numeric(10, 0) as expense_amount,
    ((CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        ((CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END) + COALESCE(t.expense_amount, 0))::numeric(10, 0) as total_daily,
    (t.payment_id IS NOT NULL) as is_paid,
    pay.payment_date
  FROM public.timesheets t
  LEFT JOIN public.payments pay ON t.payment_id = pay.id
  WHERE 
    t.user_id = p_user_id
    AND t.status != 'rejected'
    AND t.work_date >= p_start_date
    AND t.work_date <= p_end_date
  ORDER BY t.work_date ASC;
END;
$$;

-- 7. get_unpaid_details_for_user (uuid, date) – kifizetetlen részletek, opcionális cutoff
CREATE OR REPLACE FUNCTION get_unpaid_details_for_user(
  p_user_id uuid,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  work_date date,
  entry_type text,
  description text,
  hours numeric,
  wage_amount numeric,
  expense_amount numeric,
  total_daily numeric
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_hourly_rate numeric;
BEGIN
  SELECT hourly_rate INTO v_hourly_rate FROM public.profiles WHERE id = p_user_id;

  RETURN QUERY
  SELECT 
    t.work_date,
    t.entry_type::text,
    CASE 
      WHEN t.expense_amount > 0 AND t.expense_note IS NOT NULL 
        THEN COALESCE(t.note, '') || ' (+ Költség: ' || t.expense_note || ')'
      ELSE COALESCE(t.note, '') 
    END::text as description,
    CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 
    END::numeric(10, 2) as hours,
    (CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        ((CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END)::numeric(10, 0) as wage_amount,
    COALESCE(t.expense_amount, 0)::numeric(10, 0) as expense_amount,
    ((CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        ((CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END) + COALESCE(t.expense_amount, 0))::numeric(10, 0) as total_daily
  FROM public.timesheets t
  WHERE 
    t.user_id = p_user_id
    AND t.payment_id IS NULL 
    AND t.status != 'rejected'
    AND (p_end_date IS NULL OR t.work_date <= p_end_date)
  ORDER BY t.work_date ASC;
END;
$$;

-- 8. get_payroll_report – pénzügyi riport (admin)
CREATE OR REPLACE FUNCTION get_payroll_report(
  start_date date,
  end_date date
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  hourly_rate numeric,
  total_hours numeric,
  total_pay numeric
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Nincs jogosultság a pénzügyi riporthoz.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    p.hourly_rate,
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0)::numeric(10, 2) AS total_hours,
    (COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0))::numeric(10, 0) AS total_pay
  FROM public.profiles p
  LEFT JOIN public.timesheets t ON t.user_id = p.id
    AND t.work_date >= start_date 
    AND t.work_date <= end_date
    AND t.entry_type = 'work'
    AND t.status != 'rejected'
    AND t.start_time IS NOT NULL
    AND t.end_time IS NOT NULL
  WHERE p.hourly_rate IS NOT NULL
    AND p.hourly_rate > 0
  GROUP BY p.id, p.full_name, p.hourly_rate
  HAVING COALESCE(SUM(
    CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
      (CASE WHEN t.end_time >= t.start_time THEN EXTRACT(EPOCH FROM (t.end_time - t.start_time)) ELSE 86400 + EXTRACT(EPOCH FROM (t.end_time - t.start_time)) END) / 3600
    ELSE 0 END
  ), 0) > 0
  ORDER BY p.full_name;
END;
$$;

-- 9. Jogosultságok (ha még nincsenek)
GRANT EXECUTE ON FUNCTION get_weekly_report(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unpaid_report(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unpaid_report() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_details_for_user(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unpaid_details_for_user(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payroll_report(date, date) TO authenticated;

-- ============================================================================
-- KÉSZ. Éjszakás műszaknál (pl. 16:00–02:00) a rendszer 10 órát számol.
-- Futtasd ezt a fájlt a Supabase SQL Editorban, majd: npx vercel --prod
-- ============================================================================
