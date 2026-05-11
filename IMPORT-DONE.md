# v2.4.0 import – ebben a környezetben

A **munkaidőnyilvántartó rendszer web** v2.4.0 verziója teljes mértékben bekerült ebbe a projektbe.

## Amit megőriztek (ehhez a környezethez tartozik)

- **`.env.local`** – nem lett felülírva: Supabase URL, anon key, service role key továbbra is **ezen projekt** adatbázisa és környezete.
- **`.vercel`** – nem lett másolva: a Vercel deploy továbbra is **ezen** projekthez (pl. normax-munkaido) kötve marad.
- **Bérszámfejtés** – **havi** maradt: hónapválasztó, „Előző/Következő Hónap”, „2026. JANUÁR” stb. A `app/admin/payroll/page.js` a havi logikát használja.
- **`vercel.json`** – semleges beállítás, a tényleges projekt a Vercel dashboard / `.vercel` alapján van.

## Amit az import hozott (v2.4.0)

- Éjszakás műszak (+1 nap): checkbox, megjelenítés „(+1 nap)”, validáció, DB függvények.
- Módosított fájlok: `TimesheetForm.jsx`, `TimesheetList.jsx`, `app/admin/page.js`, `lib/utils.js`, `database/fix-overnight-calculation.sql`, `scripts/test-overnight.mjs`.
- Összes többi v2.4.0 fájl (app, api, database, scripts, stb.).

## Teendők (ha még nem)

1. **Supabase:** Futtasd a `database/fix-overnight-calculation.sql` fájlt az SQL Editorban (éjszakás műszak számításokhoz).
2. **Környezet:** A `.env.local` változatlan – ha máshol deployolsz, ott add meg ugyanazokat a változókat (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
3. **Deploy:** `npm install` majd `npx vercel --prod` (a jelenlegi Vercel projekthez megy).

## Teszt

- Éjszakás: `node scripts/test-overnight.mjs`
- Havi bérszámfejtés: Admin → Tartozások Kezelése → hónapválasztó.
