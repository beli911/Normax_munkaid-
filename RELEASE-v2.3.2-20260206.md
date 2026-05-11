# 📦 RELEASE v2.3.2 – Teljes mentés + „Javítás jóváhagyva” jelzés

**Dátum:** 2026-02-06  
**Verzió:** v2.3.2  
**Éles:** https://munkaido-app.vercel.app

---

## 📌 Tartalom

Patch release: a felhasználói listában megjelenik, ha a módosítási kérést az admin jóváhagyta.

### Változások v2.3.1 → v2.3.2

- **„Javítás jóváhagyva” jelzés:** Ha a user kért szerkesztést és az admin jóváhagyta, a saját rögzítések listájában a sor mellett zöld badge jelenik meg: **✓ Javítás jóváhagyva** (CheckCircle ikon + szöveg). A pending és approved kérelmeket a kliens egyszerre lekéri, így a jóváhagyott sorok mindig jelölve vannak.

---

## 📁 Archívum

- **Fájlnév:** `munkaido-app-v2.3.2-20260206.tar.gz`
- **Kihagyva:** node_modules, .next, .git

---

## ✅ Ellenőrzés

- Lint: sikeres  
- Build: sikeres  
- Publikálás: igény szerint (`npx vercel --prod`).
