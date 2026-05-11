# 🔧 RELEASE v1.3.1-20260123

**Dátum:** 2026-01-23  
**Verzió:** v1.3.1-20260123  
**Típus:** Bugfix

---

## 🐛 JAVÍTÁSOK

### Új Alkalmazott Gomb Működése

**Probléma:**
- Az "Új alkalmazott" gombra kattintáskor nem jelent meg a form
- A form csak akkor jelenik meg, ha van érték a mezőkben
- A gomb üríti a mezőket, így a form eltűnik

**Megoldás:**
- `showNewUserForm` state hozzáadva az explicit vezérléshez
- Az "Új alkalmazott" gomb most beállítja a `showNewUserForm`-ot `true`-ra
- Bezárás gomb (×) hozzáadva a form fejlécéhez
- Sikeres létrehozás után a form automatikusan bezárul

---

## 📁 MÓDOSÍTOTT FÁJLOK

- `app/admin/page.js` - showNewUserForm state + gomb logika javítása

---

## ✅ TESZTELÉS

1. Nyisd meg az admin oldalt (`/admin`)
2. Kattints az "Új alkalmazott" gombra
3. A form megjelenik
4. Töltsd ki az adatokat
5. Kattints a "✅ Alkalmazott létrehozása" gombra
6. A form automatikusan bezárul

---

**Verzió:** v1.3.1-20260123  
**Utolsó frissítés:** 2026-01-23
