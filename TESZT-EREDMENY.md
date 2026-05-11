# Teszt eredmény – automatikus ellenőrzés

**Dátum:** 2026-02-10  
**Környezet:** `.env.local` – a publikusan futó app (normax-munkaido) Supabase adataival.

---

## ✅ Build

- `npm run build` – **sikeres** (Next.js 14, összes oldal lefordult).

---

## ✅ Oldalak elérhetősége (localhost:3000)

| Útvonal           | HTTP |
|-------------------|------|
| `/`               | 200 OK |
| `/login`          | 200 OK |
| `/admin`          | 200 OK |
| `/admin/payroll`  | 200 OK |

---

## ✅ Bejelentkezés és adatbázis

- **Supabase kapcsolat:** OK (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY).
- **Bejelentkezés:** `benner213` / `Belike911` → **sikeres**.
- **Profil:** megjelenik (név: beli, admin: igen).
- **Timesheets lekérés:** működik (saját bejegyzések lekérdezése).

---

## ✅ Éjszakás műszak (v2.4.0)

- `node scripts/test-overnight.mjs` – **21/21 teszt sikeres** (időtartam, éjszakás detektálás, validáció, formátumok).

---

## Összefoglalás

- **Környezet:** `.env.local` a production Supabase adataival beállítva.
- **Szerver:** `npm run dev` → http://localhost:3000.
- **Javaslat:** Böngészőben nyisd meg a login oldalt, lépj be, ellenőrizd a főoldalt, az Admin és a Pénzügyi Elszámolás (havi) oldalakat.
