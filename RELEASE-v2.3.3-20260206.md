# 📦 RELEASE v2.3.3 – Teljes mentés (struktúra + késői rögzítés + teszt)

**Dátum:** 2026-02-06  
**Verzió:** v2.3.3  
**Éles:** https://munkaido-app.vercel.app

---

## 📌 Tartalom

### Változások v2.3.2 → v2.3.3

- **Strukturális átrendezés:** SQL fájlok → `database/`, segéd scriptek (`create-admin.js`, `check-admin.js`, `check-employees.js`) → `scripts/` (`.env.local` útvonal frissítve). README, SETUP, TECHNICAL-DOCUMENTATION hivatkozásai frissítve.
- **Késői rögzítés észlelés (Late Entry Detection):** Admin táblázatban, ha a bejegyzés 5 napnál később lett rögzítve (`created_at` − `work_date` > 5 nap), a Dátum mellett sárga ⚠️ ikon + tooltip: „Utólag rögzítve! (X nappal később rögzítve. Rögzítés ideje: YYYY.MM.dd.)”. Invalid/NaN dátum kezelés, try-catch.
- **Takárítás:** `console.log` és felesleges import eltávolítva, `RELEASE-$(date...).md` sablon törölve.
- **Teszt:** `TESZT-ELLENORZES.md` manuális tesztlista + automatizált (lint, build) ellenőrzés.

---

## 📁 Archívum

- **Fájlnév:** `munkaido-app-v2.3.3-20260206.tar.gz`
- **Kihagyva:** node_modules, .next, .git, *.tar.gz

---

## ✅ Ellenőrzés

- Lint: sikeres  
- Build: sikeres  
