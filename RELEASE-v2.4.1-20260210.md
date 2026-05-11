# Release v2.4.1 – Szoftver mentés, élesítésre kész

**Dátum:** 2026-02-10  
**Verzió:** 2.4.1

---

## Tartalom (v2.4.0 + alábbiak)

- **Éjszakás műszak** (v2.4.0): +1 nap checkbox, megjelenítés, DB függvények.
- **Havi bérszámfejtés:** Pénzügyi Elszámolás hónapválasztóval (Előző/Következő Hónap, pl. „2026. JANUÁR”), nem heti.
- **E2E tesztek:** Playwright `e2e/full-flow.spec.js` – login, főoldal, admin, payroll; képernyőképek a `teszt-kepernyokepek/` mappában.
- **Tesztelve:** Build OK, bejelentkezés (Supabase), főoldal, admin, bérszámfejtés, éjszakás (21/21 teszt).

---

## Mentés

- **Tarball:** `munkaido-app-v2.4.1-20260210.tar.gz` (forráskód, node_modules és .next nélkül).
- **Deploy:** Sikeres. **Production:** https://normax-munkaido.vercel.app

---

## Teendők (ha még nem)

1. **Supabase:** `database/fix-overnight-calculation.sql` futtatása (éjszakás számításokhoz).
2. **Vercel:** Production env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

*Munkaidő Nyilvántartó Rendszer – v2.4.1*
