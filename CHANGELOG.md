# Változásnapló

## [2.1.0] - 2026-01-23 - Dark Mode + UI/UX Fejlesztések

### ✨ Új Funkciók

- **Dark Mode (Sötét Mód)**: Teljes dark mode támogatás `next-themes` könyvtárral
- **ThemeToggle komponens**: Téma váltó gomb a fejlécben integrálva
- **NewFeaturePopup**: Újdonság értesítés localStorage memória logikával
- **Modern szűrő toolbar**: Ikonokkal ellátott szűrő sáv az admin felületen
- **Alkalmazottak grid elrendezés**: Kompakt kártyák avatárral és dinamikus színekkel

### 🎨 UI/UX Javítások

- **Táblázat színek javítva**: Magas kontraszt dark mode-ban, különösen hover állapotban
- **Modals görgethetőség**: `max-h-[90vh]` és `overflow-y-auto` a teljes képernyős modálokhoz
- **ThemeToggle áthelyezve**: Fejlécbe integrálva, nem takarja a logout gombot
- **Admin dashboard modernizálva**: Toolbar és grid layout a jobb felhasználói élményért
- **Reszponzív design javítva**: Minden komponens optimalizálva mobilon és desktopon

### 🔧 Technikai Fejlesztések

- `next-themes` telepítve és konfigurálva (`defaultTheme="dark"`, `enableSystem={false}`)
- localStorage automatikus mentés (téma preferencia)
- `hasUsedNewVersion` localStorage logika (popup csak egyszer jelenik meg)
- Tailwind dark mode animációk hozzáadva (`slide-up`)
- ESLint hibák javítva

### 📱 Frissített Komponensek

- `app/providers.jsx` (ThemeProvider)
- `app/components/ThemeToggle.jsx`
- `app/components/NewFeaturePopup.jsx`
- `app/admin/page.js` (modernizálva)
- `app/page.js` (dark mode osztályok)
- `app/login/page.js` (dark mode osztályok)
- `app/components/TimesheetForm.jsx` (dark mode + localStorage)
- `app/components/TimesheetList.jsx` (dark mode)
- `app/admin/payroll/page.js` (dark mode)
- `tailwind.config.js` (dark mode + animációk)

---

## [2.0.0] - 2024 - Teljes Fejlesztés

### ✨ Új Funkciók

#### Főoldal (Dolgozói Felület)
- **Rögzítések szerkesztése**: Most már szerkesztheted a korábbi rögzítéseidet
- **Rögzítések törlése**: Törölheted a saját rögzítéseidet
- **Időtartam számítás**: Automatikusan kiszámolja, hány órát dolgoztál
- **Validáció**: Ellenőrzi, hogy a távozási idő később van-e, mint az érkezési
- **Duplikáció ellenőrzés**: Megakadályozza, hogy ugyanarra a napra több rögzítést hozz létre
- **Magyar dátum formázás**: A dátumok magyar nyelven jelennek meg
- **Továbbfejlesztett lista**: Most már 20 rögzítést mutat (korábban 10)
- **Jobb error handling**: Részletesebb hibaüzenetek piros dobozban

#### Admin Felület
- **Statisztikák**: 4 különböző statisztika kártya
  - Összes rögzítés száma
  - Összes ledolgozott óra
  - Egyedi munkavállalók száma
  - Átlagos óra/nap
- **CSV exportálás**: Letölthető CSV fájl az összes adattal
- **Dátum szerinti szűrés**: Szűrj egy konkrét napra
- **Időtartam megjelenítés**: Minden rögzítésnél látható a ledolgozott idő
- **Mobilra optimalizált táblázat**: Jobb megjelenés mobilon

#### Helper Függvények (`lib/utils.js`)
- `formatDate()` - Teljes magyar dátum formázás
- `formatDateShort()` - Rövid dátum formázás
- `calculateDuration()` - Időtartam számítás szöveges formában
- `calculateHoursDecimal()` - Időtartam tizedes órákban
- `validateTimes()` - Idő validáció
- `exportToCSV()` - CSV exportálás

### 🔧 Fejlesztések

- **Jobb UX**: Görgetés a formhoz szerkesztéskor
- **Jobb UI**: Színes statisztika kártyák
- **Jobb hibaüzenetek**: Részletesebb validációs üzenetek
- **Jobb loading állapotok**: Minden műveletnél látható a betöltés
- **Jobb mobil nézet**: Reszponzív táblázat az admin felületen

### 🐛 Javítások

- Duplikáció ellenőrzés javítva
- Idő validáció javítva
- Session kezelés javítva

### 🔒 Biztonsági Fejlesztések

- Admin jogosultság ellenőrzés az admin oldalon
- Dolgozó update/delete jogosultságok hozzáadva az adatbázishoz
- Admin update/delete jogosultságok hozzáadva az adatbázishoz

### 📝 Dokumentáció

- `SETUP.md` - Részletes beállítási útmutató
- `CHANGELOG.md` - Változásnapló
- Frissített `README.md` - Új funkciók dokumentálva

---

## [1.0.0] - 2024 - Kezdeti Verzió

### ✨ Alap Funkciók

- Bejelentkezés és regisztráció
- Munkaidő rögzítése
- Saját rögzítések listázása
- Admin felület
- PWA támogatás
- Row Level Security (RLS)


