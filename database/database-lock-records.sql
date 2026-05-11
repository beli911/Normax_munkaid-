-- ============================================
-- RÖGZÍTÉSEK ZÁROLÁSA - NEM SZERKESZHETŐK, NEM TÖRÖLHETŐK
-- ============================================
-- Ez a script eltávolítja a dolgozók módosítási és törlési jogosultságát
-- A rögzítések csak létrehozhatók, de nem módosíthatók vagy törölhetők
-- ============================================

-- Töröljük a dolgozók módosítási jogosultságát
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

-- Töröljük a dolgozók törlési jogosultságát
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

-- ============================================
-- FONTOS: Az adminok továbbra is módosíthatják és törölhetik a rögzítéseket
-- Csak a dolgozók nem férnek hozzá a módosításhoz és törléshez
-- ============================================

-- Ellenőrzés: Listázd ki a jelenlegi policy-kat
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'timesheets';
