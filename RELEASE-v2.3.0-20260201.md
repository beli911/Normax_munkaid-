# 📦 RELEASE v2.3.0 – Éles frissítés + teljes mentés

**Dátum:** 2026-02-01  
**Verzió:** v2.3.0  
**Éles:** https://munkaido-app.vercel.app

---

## 📌 Tartalom

Ez a release a **teljes munkaidő-nyilvántartó webalkalmazás** aktuális állapotát rögzíti (v2.3.0), az éles Vercel deploy előtti/utáni állapottal.

### Változások v2.2.0 → v2.3.0

- **Hardening & Bugfix:** API try-catch (request.json), kliens response.json try-catch, useRef a triple-clickhez, backend validációk (hourlyRate, cutoffDate, entry_type, status, expense_amount, userId UUID), login általános hibaüzenet, idő regex validáció (utils).
- **Admin:** Dátum + hét napja, Szabadság/Betegszabadság megjelenítés (Időtartam, Óra, Megjegyzés).
- **Pénzügyi elszámolás:** Heti formátum, hétválasztó, kifizetett hetek lapozása + tételes bontás (sorra kattintás).
- **Stabilitás:** Lint és build tiszta, publikálásra kész.

---

## 📁 Projektstruktúra (v2.3.0)

```
munkaido-app/
├── app/ (admin, api, components, login, layout, page, providers, globals.css)
├── lib/ (supabase.js, utils.js)
├── public/
├── database-*.sql, fix-*.sql, add-*.sql
├── package.json (version: 2.3.0)
├── RELEASE-v2.3.0-20260201.md
└── egyéb .md, .sh, konfig fájlok
```

---

## 🚀 Éles frissítés (Vercel)

1. **Git:** commit + push a main/master branchre → Vercel automatikusan deployol (ha a repo össze van kötve).
2. **Vagy:** `npx vercel --prod` a projektmappából (ha Vercel CLI-vel deployolsz).
3. **Környezeti változók:** a Vercel projektben legyenek beállítva: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Éles URL:** https://munkaido-app.vercel.app

---

## ✅ Teljes mentés

- **Archívum:** a projektmappa szülőmappájában: `munkaido-app-v2.3.0-20260201.tar.gz`
- **Kihagyva:** node_modules, .next, .git
- **Figyelem:** .env.local benne van – tárold biztonságos helyen, ne töltsd fel nyilvánosan.

---

**Verzió:** v2.3.0  
**Utolsó frissítés:** 2026-02-01
