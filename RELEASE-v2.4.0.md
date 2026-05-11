# Release v2.4.0 – Éjszakás műszak (Overnight Shift)

**Dátum:** 2025  
**Verzió:** 2.4.0 (következő szoftver mentés)

---

## Új funkciók

### Éjszakás műszak (másnapra nyúló)

- **Űrlap:** Checkbox „Másnap fejeződik be (+1 nap)” – ha távozás < érkezés (pl. 16:00–02:00), a rendszer 10 órát számol, nem negatívat.
- **Auto-pipálás:** Ha a felhasználó 02:00-t ad meg végeként 16:00 kezdés mellett, a checkbox automatikusan bepipálódik (törölhető).
- **Megjelenítés:** A listában és az admin táblában az idő mellett jelzés: **(+1 nap)** (éjszakás műszak).
- **Bérszámítás:** Az adatbázis függvények (get_weekly_report, get_unpaid_report, get_unpaid_details_for_user, get_payroll_report) éjszakásra is helyesen számolják az órákat (CASE WHEN end_time < start_time THEN +24h).

---

## Módosított fájlok

- `app/components/TimesheetForm.jsx` – checkbox, isNextDay, validáció
- `app/components/TimesheetList.jsx` – (+1 nap) megjelenítés, módosítási kérésnél éjszakás engedélyezés
- `app/admin/page.js` – (+1 nap) az idő oszlopban
- `lib/utils.js` – validateTimes(..., allowOvernight), isOvernightShift()
- `database/fix-overnight-calculation.sql` – constraint + összes bérszámító függvény frissítve
- `scripts/test-overnight.mjs` – szoftverteszt (21 teszt)

---

## Teendők üzembe helyezés előtt

1. **Supabase:** Futtasd a `database/fix-overnight-calculation.sql` fájlt az SQL Editorban (ha még nem).
2. **Deploy:** `npx vercel --prod`

---

## Ellenőrzés

- `node scripts/test-overnight.mjs` – mind a 21 teszt sikeres.

---

*Munkaidő Nyilvántartó Rendszer – v2.4.0*
