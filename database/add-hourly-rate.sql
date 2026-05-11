-- ============================================
-- HOURLY_RATE OSZLOP HOZZÁADÁSA
-- ============================================
-- Futtasd le ezt a Supabase SQL Editor-ban!
-- ============================================

-- Hozzáadjuk a hourly_rate oszlopot a profiles táblához
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN hourly_rate numeric;
    RAISE NOTICE 'hourly_rate oszlop hozzáadva!';
  ELSE
    RAISE NOTICE 'hourly_rate oszlop már létezik!';
  END IF;
END $$;

-- ============================================
-- KÉSZ! Most már az alkalmazottak listája működni fog.
-- ============================================
