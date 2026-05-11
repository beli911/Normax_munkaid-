-- ============================================
-- ADATBÁZIS FRISSÍTÉS: entry_type és status mezők
-- ============================================
-- Futtasd le ezt a scriptet a Supabase SQL Editor-ben
-- ============================================

-- 1. entry_type enum típus létrehozása
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_type_enum') THEN
        CREATE TYPE entry_type_enum AS ENUM ('work', 'holiday', 'sick_leave');
    END IF;
END $$;

-- 2. status enum típus létrehozása
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
        CREATE TYPE status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- 3. entry_type oszlop hozzáadása (ha még nincs)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timesheets' AND column_name = 'entry_type'
    ) THEN
        ALTER TABLE public.timesheets 
        ADD COLUMN entry_type entry_type_enum DEFAULT 'work' NOT NULL;
    END IF;
END $$;

-- 4. status oszlop hozzáadása (ha még nincs)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timesheets' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.timesheets 
        ADD COLUMN status status_enum DEFAULT 'pending' NOT NULL;
    END IF;
END $$;

-- 5. start_time és end_time nullable-re változtatása (mert szabadság/betegszabadság esetén nem kell)
DO $$ 
BEGIN
    -- Csak akkor módosítjuk, ha még nem nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timesheets' 
        AND column_name = 'start_time' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.timesheets 
        ALTER COLUMN start_time DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'timesheets' 
        AND column_name = 'end_time' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.timesheets 
        ALTER COLUMN end_time DROP NOT NULL;
    END IF;
END $$;

-- 6. Check constraint: csak 'work' típusnál kell idő
ALTER TABLE public.timesheets 
DROP CONSTRAINT IF EXISTS check_times_valid;

ALTER TABLE public.timesheets 
ADD CONSTRAINT check_times_valid CHECK (
    (entry_type = 'work' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    OR (entry_type IN ('holiday', 'sick_leave') AND start_time IS NULL AND end_time IS NULL)
);

-- 7. Meglévő rekordok frissítése (ha vannak)
UPDATE public.timesheets 
SET entry_type = 'work', status = 'approved'
WHERE entry_type IS NULL OR status IS NULL;

-- ============================================
-- KÉSZ! Most már használhatod az új mezőket.
-- ============================================
