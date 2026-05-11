-- ============================================
-- ÖSSZES MUNKAIDŐ RÖGZÍTÉS TÖRLÉSE
-- ============================================
-- ⚠️  FIGYELEM: Ez a script törli az ÖSSZES rögzített munkaidő adatot!
-- A felhasználók és profilok megmaradnak, csak a timesheets rekordok törlődnek.
-- ============================================

-- 1. Összes munkaidő rögzítés törlése
DELETE FROM public.timesheets;

-- 2. Visszaigazolás (ellenőrzés)
SELECT 
    'Összes rekord törölve!' as status,
    COUNT(*) as maradt_rekordok
FROM public.timesheets;

-- ============================================
-- KÉSZ! Az összes rögzített adat törölve.
-- ============================================
-- A felhasználók (profiles) és beállítások megmaradtak.
-- ============================================
