-- ============================================================================
-- JAVÍTOTT get_unpaid_details_for_user FÜGGVÉNY
-- Futtasd le ezt a Supabase SQL Editor-ban, ha csak a függvényt szeretnéd frissíteni
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unpaid_details_for_user(p_user_id uuid)
RETURNS TABLE (
  work_date date,
  entry_type text,
  description text,     -- Munka leírása VAGY költség leírása
  hours numeric,        -- Ledolgozott óra
  wage_amount numeric,  -- Munkadíj arra a napra
  expense_amount numeric, -- Költség arra a napra
  total_daily numeric   -- Napi összesen
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_hourly_rate numeric;
BEGIN
  -- Lekérjük az ember órabérét
  SELECT hourly_rate INTO v_hourly_rate FROM public.profiles WHERE id = p_user_id;

  RETURN QUERY
  SELECT 
    t.work_date,
    t.entry_type::text,  -- Enum castolása text-re (FONTOS!)
    -- Leírás összefűzése (hogy lássuk mi volt a munka és mi a költség)
    CASE 
      WHEN t.expense_amount > 0 AND t.expense_note IS NOT NULL 
        THEN COALESCE(t.note, '') || ' (+ Költség: ' || t.expense_note || ')'
      ELSE COALESCE(t.note, '') 
    END::text as description,
    
    -- Óra (csak work típusnál számít)
    CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600)::numeric(10, 2)
      ELSE 0 
    END as hours,

    -- Munkadíj (Óra * Órabér)
    (CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END)::numeric(10, 0) as wage_amount,

    -- Költség
    COALESCE(t.expense_amount, 0)::numeric(10, 0) as expense_amount,

    -- Napi Összesen (Munkadíj + Költség)
    ((CASE 
      WHEN t.entry_type = 'work' AND t.start_time IS NOT NULL AND t.end_time IS NOT NULL THEN 
        (EXTRACT(EPOCH FROM (t.end_time - t.start_time)) / 3600) * COALESCE(v_hourly_rate, 0)
      ELSE 0 
    END) + COALESCE(t.expense_amount, 0))::numeric(10, 0) as total_daily

  FROM public.timesheets t
  WHERE 
    t.user_id = p_user_id
    AND t.payment_id IS NULL -- Csak a fizetetlen
    AND t.status != 'rejected'
  ORDER BY t.work_date ASC;
END;
$$;

-- Jogosultságok (ha még nincs)
GRANT EXECUTE ON FUNCTION get_unpaid_details_for_user(uuid) TO authenticated;
