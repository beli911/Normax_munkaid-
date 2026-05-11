# 🕵️ RELEASE v1.3.0-20260123

**Dátum:** 2026-01-23  
**Verzió:** v1.3.0-20260123  
**Funkció:** Titkos Admin Funkció - Triple-click szerkesztés és törlés

---

## 🎯 ÚJ FUNKCIÓK

### 🕵️ Titkos Admin Funkció

**Triple-Click Aktiválás:**
- 3x gyors kattintás (500ms-on belül) a dátum vagy név cellán
- Csak az admin oldal táblázatában működik
- Nem zavarja a normál táblázat műveleteket

**Titkos Szerkesztő Modal:**
- Felugró ablak az adott bejegyzés adataival
- Szerkeszthető mezők:
  - Dátum
  - Típus (Munka, Szabadság, Betegszabadság)
  - Kezdés/Vége (csak munka típusnál)
  - Megjegyzés
  - Költség összeg és leírás
  - Céges kártya checkbox
  - Státusz (Függőben, Elfogadva, Elutasítva)

**Műveletek:**
- 💾 **MENTÉS**: Frissíti az adatokat a backend-en keresztül
- 🗑️ **TÖRLÉS**: Végleges törlés megerősítéssel
- **MÉGSE**: Bezárja az ablakot

---

## 🔧 TECHNIKAI VÁLTOZÁSOK

### Backend API

**Új végpontok:**
- `DELETE /api/admin/timesheets?id=...` - Timesheet törlése
- `PUT /api/admin/timesheets?id=...` - Timesheet frissítése

**Biztonság:**
- Admin jogosultság ellenőrzés mindkét végpontnál
- Service Role Key használata a backend-en
- Szerver oldali validáció

### Frontend

**Új komponensek:**
- Triple-click detektálás logika
- Titkos szerkesztő modal ablak
- Loading állapotok
- Hibaüzenetek és sikeres visszajelzések

---

## 📁 MÓDOSÍTOTT FÁJLOK

- `app/admin/page.js` - Triple-click logika + modal komponens
- `app/api/admin/timesheets/route.js` - DELETE + PUT végpontok (ÚJ)

---

## 🚀 HASZNÁLAT

1. Nyisd meg az admin oldalt (`/admin`)
2. Kattints 3x gyorsan a dátum vagy név cellára egy sorban
3. Megnyílik a titkos szerkesztő ablak
4. Szerkeszd az adatokat vagy töröld a bejegyzést
5. Mentés után a lista automatikusan frissül

---

## ✅ ELŐNYÖK

- **Tiszta UI**: Nincs látható szerkesztés/törlés gomb
- **Biztonság**: Csak admin felhasználók használhatják
- **Vészhelyzetre**: Gyors javítás lehetőség
- **Diszkrét**: Senki nem látja, hogy szerkesztesz

---

## 🔐 BIZTONSÁGI MEGJEGYZÉSEK

- Csak admin felhasználók használhatják
- Backend ellenőrzés minden kérésnél
- Törlés előtt megerősítés kérése
- Service Role Key használata a backend-en

---

**Verzió:** v1.3.0-20260123  
**Utolsó frissítés:** 2026-01-23
