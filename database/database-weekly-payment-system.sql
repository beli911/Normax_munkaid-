-- ============================================================================
-- HETI FIZETÉSI RENDSZER - DÁTUM SZŰRÉSSEL
-- Lehetőség heti bontásban fizetni és zárni
-- ============================================================================

-- 1. RIPORT FÜGGVÉNY FRISSÍTÉSE (Visszaadja a kifizetett tételeket is)
DROP FUNCTION IF EXISTS get_weekly_report(date, date);
DROP FUNCTION IF EXISTS get_unpaid_report(date, date);
DROP FUNCTION IF EXISTS get_unpaid_report();

-- Új heti riport függvény: Visszaadja MINDEN tételt (kifizetett + kifizetetlen)
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
  is_fully_paid boolean, -- Ez jelzi, ha minden ki van fizetve
  payment_date timestamp with time zone -- Mikor fizették ki (ha kifizették)
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    COALESCE(p.hourly_rate, 0),
    
    -- Összesített órák (Kifizetett + Kifizetetlen is!)
    COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0)::numeric(10, 2) AS total_hours,
    
    -- Összesített bér
    (COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0))::numeric(10, 0) AS total_wages,

    -- Összesített költség
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0)::numeric(10, 0) AS total_expenses,

    -- Végösszeg
    ((COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0)) + COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0))::numeric(10, 0) AS grand_total,

    -- Státusz ellenőrzése: Ha minden tételhez van payment_id, akkor KIFIZETVE
    BOOL_AND(t.payment_id IS NOT NULL) as is_fully_paid,

    -- Ha kifizették, mikor? (Az utolsó kifizetés dátuma)
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
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) > 0;
END;
$$;

-- Visszafelé kompatibilitás: get_unpaid_report (csak kifizetetlen)
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
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0)::numeric(10, 2) AS unpaid_hours,
    (COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0))::numeric(10, 0) AS unpaid_wages,
    COALESCE(SUM(COALESCE(t.expense_amount, 0)), 0)::numeric(10, 0) AS unpaid_expenses,
    ((COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
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
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) > 0;
END;
$$;

-- 2. KIFIZETÉS FÜGGVÉNY FRISSÍTÉSE (Cutoff date-dal)
-- Az eredeti execute_payment marad, de hozzáadunk egy új verziót
CREATE OR REPLACE FUNCTION execute_payment_until(
  p_user_id uuid, 
  p_amount numeric,
  p_cutoff_date date -- Ez a fontos: meddig fizetünk?
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_payment_id bigint;
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Csak admin fizethet ki!';
  END IF;

  -- 1. Nyugta létrehozása
  INSERT INTO public.payments (user_id, total_paid, admin_id)
  VALUES (p_user_id, p_amount, v_admin_id)
  RETURNING id INTO v_payment_id;

  -- 2. Csak azokat a sorokat zárjuk le, amik a DÁTUMON BELÜL vannak
  UPDATE public.timesheets
  SET payment_id = v_payment_id,
      status = 'approved'
  WHERE user_id = p_user_id 
    AND payment_id IS NULL 
    AND status != 'rejected'
    AND work_date <= p_cutoff_date; -- Itt a trükk!

  RETURN json_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;

-- 3. RÉSZLETES TÉTELLISTA FÜGGVÉNY FRISSÍTÉSE (Kifizetett tételeket is visszaadja)
DROP FUNCTION IF EXISTS get_weekly_details_for_user(date, date, uuid);
DROP FUNCTION IF EXISTS get_unpaid_details_for_user(uuid, date);
DROP FUNCTION IF EXISTS get_unpaid_details_for_user(uuid);

-- Új heti részletek függvény: Visszaadja MINDEN tételt (kifizetett + kifizetetlen)
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
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600)::numeric(10, 2)
      ELSE 0 
    END as hours,

    (CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END)::numeric(10, 0) as wage_amount,

    COALESCE(t.expense_amount, 0)::numeric(10, 0) as expense_amount,

    ((CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
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

-- Visszafelé kompatibilitás: get_unpaid_details_for_user (csak kifizetetlen)
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
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600)::numeric(10, 2)
      ELSE 0 
    END as hours,

    (CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END)::numeric(10, 0) as wage_amount,

    COALESCE(t.expense_amount, 0)::numeric(10, 0) as expense_amount,

    ((CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
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

-- 4. JOGOSULTSÁGOK
GRANT EXECUTE ON FUNCTION get_weekly_report(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unpaid_report(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_payment_until(uuid, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_details_for_user(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unpaid_details_for_user(uuid, date) TO authenticated;

-- ============================================================================
-- KÉSZ! Most már a frontend hívhatja a függvényeket dátum paraméterekkel.
-- ============================================================================
