# 📦 RELEASE v2.3.1 – Szerkesztés javítás + mentés

**Dátum:** 2026-01-31  
**Verzió:** v2.3.1  
**Éles:** https://munkaido-app.vercel.app

---

## 📌 Tartalom

Patch release: a Titkos Szerkesztő mentése nem működött az „Az URL és a body azonosítója nem egyezik” hiba miatt. Javítva.

### Változások v2.3.0 → v2.3.1

- **Szerkesztés mentés javítás:** Az API és a kliens azonosító típusa (string vs number) nem egyezett. Az API-ban az összehasonlítás most `String(idFromQuery) === String(id)`. A kliens mentéskor mindkét helyen `String(secretEditRecord.id)` kerül használatra (URL és body). A Titkos Szerkesztő mentése ezzel megbízhatóan működik.

---

## 📁 Archívum

- **Fájlnév:** `munkaido-app-v2.3.1-20260131.tar.gz`
- **Kihagyva:** node_modules, .next, .git

---

## ✅ Ellenőrzés előtt

- Lint: sikeres  
- Build: sikeres  
- Publikálás: csak ezek után.
