-- ============================================
-- ADMIN POLICY JAVÍTÁS
-- ============================================
-- Ez a script javítja az admin policy-t, hogy az adminok láthassák a profilokat
-- Futtasd le a Supabase SQL Editor-ban!

-- Töröljük a régi admin policy-t, ha létezik
DROP POLICY IF EXISTS "Admin lathatja a profilokat" ON profiles;

-- Létrehozunk egy security definer függvényt, ami ellenőrzi az admin jogosultságot
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Most használjuk ezt a függvényt az admin policy-ben
CREATE POLICY "Admin lathatja a profilokat" ON profiles 
FOR SELECT USING (public.is_admin() OR auth.uid() = id);

-- Alternatív megoldás: ha a fenti nem működik, használjunk egy függvényt
-- De először próbáld meg a fenti megoldást!

-- ============================================
-- ELLENŐRZÉS
-- ============================================
-- Futtasd le ezt a lekérdezést, hogy ellenőrizd, hogy az admin láthatja-e a profilokat:
-- SELECT * FROM profiles WHERE is_admin = true;
