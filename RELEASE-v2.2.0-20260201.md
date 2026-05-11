# 📦 RELEASE v2.2.0 – Teljes program mentés

**Dátum:** 2026-02-01  
**Verzió:** v2.2.0  
**Típus:** Verziómentés / Teljes program mentés mindennel

---

## 📌 Tartalom

Ez a release a **teljes munkaidő-nyilvántartó webalkalmazás** aktuális állapotát rögzíti (v2.2.0):

- **Admin felület** – rögzítések listája, dátum + hét napja, Szabadság/Betegszabadság megjelenítés, titkos szerkesztő (triple-click)
- **Pénzügyi elszámolás (heti)** – hétválasztó, tartozások, kifizetés, tételes bontás, kifizetett hetek megtekintése
- **Bejelentkezés** – felhasználónév/jelszó, ékezet nélküli normalizálás
- **Dolgozói felület** – munka/szabadság/betegszabadság rögzítés, költség, céges kártya
- **API route-ok** – create-user, pay-user, reset-password, update-user, timesheets (PUT/DELETE)
- **Adatbázis SQL scriptek** – setup, entry_type/status, céges kártya, heti fizetés, stb.
- **Dokumentáció** – README, HIBA-JEGYZEK.md, changelog-ok, deploy útmutatók

---

## 📁 Projektstruktúra (v2.2.0)

```
munkaido-app/
├── app/
│   ├── admin/
│   │   ├── page.js
│   │   └── payroll/page.js
│   ├── api/admin/
│   │   ├── create-user/route.js
│   │   ├── pay-user/route.js
│   │   ├── reset-password/route.js
│   │   ├── timesheets/route.js
│   │   └── update-user/route.js
│   ├── components/
│   │   ├── NewFeaturePopup.jsx
│   │   ├── ThemeToggle.jsx
│   │   ├── TimesheetForm.jsx
│   │   └── TimesheetList.jsx
│   ├── login/page.js
│   ├── globals.css, layout.js, page.js, providers.jsx
├── lib/
│   ├── supabase.js
│   └── utils.js
├── public/
├── database-*.sql, fix-*.sql, add-*.sql
├── package.json (version: 2.2.0)
├── next.config.js, tailwind.config.js, postcss.config.js, jsconfig.json
├── HIBA-JEGYZEK.md
├── RELEASE-v2.2.0-20260201.md (ez a fájl)
└── egyéb .md, .sh, konfig fájlok
```

---

## 🔢 Verzió

- **package.json:** `"version": "2.2.0"`
- **Előző:** 2.1.0 → **Aktuális:** 2.2.0

---

## ✅ Mentés használata

- A teljes projekt ezzel a verziószámmal mentve.
- Új mentés készítéséhez: másold a projektmappát (pl. `munkaido-app-v2.2.0`) vagy használj git tag: `git tag v2.2.0`.
- Archívum készítése (projektmappa szülőjéből):  
  `tar -czvf munkaido-app-v2.2.0.tar.gz --exclude=node_modules --exclude=.next "munkaidönyilvántarto rendszer web "`

---

**Verzió:** v2.2.0  
**Utolsó frissítés:** 2026-02-01
