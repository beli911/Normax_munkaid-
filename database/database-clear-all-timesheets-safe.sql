-- ============================================
-- ÖSSZES MUNKAIDŐ RÖGZÍTÉS TÖRLÉSE (BIZTONSÁGOS)
-- ============================================
-- ⚠️  FIGYELEM: Ez a script törli az ÖSSZES rögzített munkaidő adatot!
-- A felhasználók és profilok megmaradnak, csak a timesheets rekordok törlődnek.
-- ============================================

-- 1. ELŐSZÖR: Nézd meg, hány rekord lesz törölve
SELECT 
    COUNT(*) as torlendo_rekordok,
    MIN(work_date) as legkorabbi_datum,
    MAX(work_date) as legujabb_datum
FROM public.timesheets;

-- 2. Részletes lista (opcionális - ha szeretnéd látni, mit törölsz)
-- Vegyél ki a kommentből, ha szeretnéd látni:
-- SELECT * FROM public.timesheets ORDER BY work_date DESC LIMIT 10;

-- 3. ⚠️  TÖRLÉS - Csak akkor futtasd le, ha biztos vagy!
-- Ha biztos vagy, vedd ki a kommentből az alábbi sort:
-- DELETE FROM public.timesheets;

-- 4. Visszaigazolás (ellenőrzés)
SELECT 
    'Összes rekord törölve!' as status,
    COUNT(*) as maradt_rekordok
FROM public.timesheets;

-- ============================================
-- HASZNÁLAT:
-- 1. Futtasd le az 1. lépést, hogy lásd, hány rekord lesz törölve
-- 2. Ha biztos vagy, vedd ki a kommentből a DELETE sort
-- 3. Futtasd újra a scriptet
-- ============================================
