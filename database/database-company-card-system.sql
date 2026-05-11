-- ============================================================================
-- CÉGES KÁRTYA RENDSZER - PÉNZÜGYI MEGKÜLÖNBÖZTETÉS
-- Különbségtétel: Saját zseb vs. Céges kártya
-- ============================================================================

-- 1. ÚJ OSZLOP A CÉGES KÁRTYA JELÖLÉSÉRE
ALTER TABLE public.timesheets 
ADD COLUMN IF NOT EXISTS is_company_card boolean DEFAULT false;

-- 2. HETI RIPORT FRISSÍTÉSE (A MATEK JAVÍTÁSA)
-- Csak akkor adjuk a fizetéshez, ha NEM céges kártya!
DROP FUNCTION IF EXISTS get_weekly_report(date, date);

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
  total_expenses numeric, -- Ez a KIFIZETENDŐ költség (Saját zseb)
  company_expenses numeric, -- Ez a CÉGES kártyás költség (Infó)
  grand_total numeric,    -- Végösszeg (Bér + Saját költség)
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
    
    -- Összesített órák
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

    -- Kifizetendő Költség (SAJÁT ZSEB) -> is_company_card = FALSE
    COALESCE(SUM(
      CASE WHEN COALESCE(t.is_company_card, false) = false AND t.expense_amount > 0 THEN t.expense_amount ELSE 0 END
    ), 0)::numeric(10, 0) AS total_expenses,

    -- Céges Költség (CSAK INFÓ) -> is_company_card = TRUE
    COALESCE(SUM(
      CASE WHEN COALESCE(t.is_company_card, false) = true AND t.expense_amount > 0 THEN t.expense_amount ELSE 0 END
    ), 0)::numeric(10, 0) AS company_expenses,

    -- Végösszeg: Bér + Csak a Saját Költség!
    ((COALESCE(SUM(
      CASE WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) * COALESCE(p.hourly_rate, 0)) + 
    COALESCE(SUM(
      CASE WHEN COALESCE(t.is_company_card, false) = false AND t.expense_amount > 0 THEN t.expense_amount ELSE 0 END
    ), 0))::numeric(10, 0) AS grand_total,

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
        EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600
      ELSE 0 END
    ), 0) > 0;
END;
$$;

-- 3. RÉSZLETES TÉTELLISTA FÜGGVÉNY FRISSÍTÉSE (Céges kártya jelölés)
DROP FUNCTION IF EXISTS get_weekly_details_for_user(date, date, uuid);

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
  is_company_card boolean, -- Visszaadjuk, hogy céges volt-e
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

    -- Céges kártya jelölés
    COALESCE(t.is_company_card, false) as is_company_card,

    -- Napi Összesen Logic: Ha céges kártya, akkor 0-t adunk hozzá a naphoz (pénzügyileg)
    ((CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END) + 
    CASE 
      WHEN COALESCE(t.is_company_card, false) = false AND t.expense_amount > 0 THEN COALESCE(t.expense_amount, 0)
      ELSE 0 
    END)::numeric(10, 0) as total_daily,

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

-- 4. JOGOSULTSÁGOK
GRANT EXECUTE ON FUNCTION get_weekly_report(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_details_for_user(date, date, uuid) TO authenticated;

-- ============================================================================
-- KÉSZ! Most már a frontend használhatja az is_company_card mezőt.
-- ============================================================================
