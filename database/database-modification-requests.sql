-- Módosítási kérelmek táblája (dolgozó kér módosítást, admin jóváhagyja/elutasítja)
-- Futtasd a Supabase SQL Editor-ban.

CREATE TABLE IF NOT EXISTS modification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id BIGINT NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_entry_type TEXT,
  new_start_time TEXT,
  new_end_time TEXT,
  new_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Index a függő kérelmek gyors lekérdezéséhez
CREATE INDEX IF NOT EXISTS idx_modification_requests_status ON modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_modification_requests_timesheet_id ON modification_requests(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_modification_requests_user_id ON modification_requests(user_id);

-- RLS: dolgozó csak a saját kérelmét látja, admin mindent
ALTER TABLE modification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own modification requests" ON modification_requests;
CREATE POLICY "Users can view own modification requests" ON modification_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own modification requests" ON modification_requests;
CREATE POLICY "Users can insert own modification requests" ON modification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin mindent láthat és frissíthet (approve/reject) – API-n keresztül service role-dal történik, itt csak olvasás biztonság
-- Ha az app API-kat használ (service role), a RLS-t az API bypassolja. Ha közvetlenül Supabase clientet használunk anon keyjel, kell admin policy.
-- Egyszerű megoldás: a lekérdezés és approve/reject az API-ban történik (service role), a felhasználói oldalon csak a saját kéréseit látja (user_id = auth.uid()).

COMMENT ON TABLE modification_requests IS 'Dolgozók által indított módosítási kérelmek; admin jóváhagyja vagy elutasítja.';
