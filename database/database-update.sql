-- ============================================
-- MUNKAIDŐ NYILVÁNTARTÓ RENDSZER - FRISSÍTÉS
-- ============================================
-- Futtasd le ezt a scriptet, ha már léteznek a táblák
-- Ez csak az új jogosultságokat adja hozzá
-- ============================================

-- Dolgozó NE módosíthassa és NE törölhesse a saját rögzítéseit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'timesheets' 
    AND policyname = 'Dolgozó módosíthatja a sajátját'
  ) THEN
    DROP POLICY "Dolgozó módosíthatja a sajátját" ON timesheets;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'timesheets' 
    AND policyname = 'Dolgozó törölheti a sajátját'
  ) THEN
    DROP POLICY "Dolgozó törölheti a sajátját" ON timesheets;
  END IF;
END $$;

-- Admin törölheti a rögzítéseket (ha még nincs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'timesheets' 
    AND policyname = 'Admin törölheti'
  ) THEN
    CREATE POLICY "Admin törölheti" ON timesheets 
    FOR DELETE USING (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
  END IF;
END $$;

-- Admin módosíthatja a rögzítéseket (ha még nincs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'timesheets' 
    AND policyname = 'Admin módosíthatja'
  ) THEN
    CREATE POLICY "Admin módosíthatja" ON timesheets 
    FOR UPDATE USING (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
  END IF;
END $$;

-- Profilok biztonsagosabb olvasasa (ha mar leteznek)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Mindenki láthatja a profilokat'
  ) THEN
    DROP POLICY "Mindenki láthatja a profilokat" ON profiles;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'User lathatja a sajat profiljat'
  ) THEN
    CREATE POLICY "User lathatja a sajat profiljat" ON profiles 
    FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admin lathatja a profilokat'
  ) THEN
    CREATE POLICY "Admin lathatja a profilokat" ON profiles 
    FOR SELECT USING (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
  END IF;
END $$;

-- ============================================
-- KÉSZ! Az új jogosultságok hozzá lettek adva.
-- ============================================

-- ============================================
-- HOURLY RATE OSZLOP (ha még nincs)
-- ============================================
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
  END IF;
END $$;


