# 📝 Changelog: Entry Type és Status Funkciók

## 🎯 Új Funkciók

### 1. Bejegyzés Típusok (Entry Type)
A rendszer mostantól három típusú bejegyzést támogat:

- **💼 Munka** (`work`) - Hétköznapi munkaidő rögzítés (időmezőkkel)
- **🏖️ Szabadság** (`holiday`) - Szabadság rögzítése (időmezők nélkül)
- **🤒 Betegszabadság** (`sick_leave`) - Betegszabadság rögzítése (időmezők nélkül)

### 2. Státusz Kezelés (Status)
Minden bejegyzés rendelkezik egy státusszal:

- **⏳ Függőben** (`pending`) - Alapértelmezett státusz új bejegyzéseknél
- **✓ Elfogadva** (`approved`) - Admin által elfogadott bejegyzés
- **✗ Elutasítva** (`rejected`) - Admin által elutasított bejegyzés

---

## 🗄️ Adatbázis Változások

### Új Mezők a `timesheets` Táblában

```sql
entry_type entry_type_enum DEFAULT 'work' NOT NULL
status status_enum DEFAULT 'pending' NOT NULL
```

### Módosított Mezők

- `start_time` - Mostantól **nullable** (csak 'work' típusnál kötelező)
- `end_time` - Mostantól **nullable** (csak 'work' típusnál kötelező)

### Új Constraint

```sql
CHECK (
    (entry_type = 'work' AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    OR (entry_type IN ('holiday', 'sick_leave') AND start_time IS NULL AND end_time IS NULL)
)
```

Ez biztosítja, hogy:
- **Munka** típusnál kötelező az idő megadása
- **Szabadság/Betegszabadság** típusnál NEM lehet idő megadva

---

## 📦 Új Fájlok

### 1. `database-add-entry-type-status.sql`
SQL script az adatbázis frissítéséhez. **FONTOS: Futtasd le ezt a Supabase SQL Editor-ben!**

### 2. `app/components/TimesheetForm.jsx`
Új komponens a bejegyzés rögzítéséhez:
- Típus kiválasztás (radio gombok)
- Feltételes időmezők (csak 'work' típusnál)
- Validáció és duplikáció ellenőrzés

### 3. `app/components/TimesheetList.jsx`
Új komponens a bejegyzések listázásához:
- Típus badge-ek (színes címkék)
- Státusz badge-ek (színes címkék)
- Feltételes idő megjelenítés (csak 'work' típusnál)

---

## 🔄 Módosított Fájlok

### `app/page.js`
- Mostantól használja a `TimesheetForm` és `TimesheetList` komponenseket
- Event listener a sikeres mentéshez
- Megtartott funkciók: fejléc, admin gomb, kijelentkezés

---

## 🚀 Telepítési Lépések

### 1. Adatbázis Frissítés

Futtasd le a Supabase SQL Editor-ben:
```sql
-- Futtasd le: database-add-entry-type-status.sql
```

### 2. Kód Frissítés

A fájlok már frissítve lettek:
- ✅ `app/components/TimesheetForm.jsx` - Létrehozva
- ✅ `app/components/TimesheetList.jsx` - Létrehozva
- ✅ `app/page.js` - Frissítve

### 3. Tesztelés

1. Nyisd meg az alkalmazást
2. Próbáld ki a három típusú bejegyzést:
   - **Munka** - időmezőkkel
   - **Szabadság** - időmezők nélkül
   - **Betegszabadság** - időmezők nélkül
3. Ellenőrizd, hogy a státusz badge-ek megjelennek-e

---

## 🎨 UI Változások

### Form Változások
- **Típus kiválasztás**: Radio gombok ikonokkal
- **Feltételes időmezők**: Csak 'work' típusnál jelennek meg
- **Időtartam számítás**: Csak 'work' típusnál

### Lista Változások
- **Típus badge-ek**: Színes címkék (kék, lila, piros)
- **Státusz badge-ek**: Színes címkék (sárga, zöld, piros)
- **Idő megjelenítés**: Csak 'work' típusnál

---

## ⚠️ Fontos Megjegyzések

1. **Visszafordíthatatlan**: Az adatbázis frissítés után a régi bejegyzések automatikusan 'work' típusúvá és 'approved' státuszúvá válnak.

2. **Validáció**: A rendszer automatikusan ellenőrzi, hogy:
   - 'work' típusnál kötelező az idő
   - 'holiday'/'sick_leave' típusnál NEM lehet idő

3. **Duplikáció**: Továbbra is csak egy bejegyzés lehetséges naponta.

4. **Admin Funkciók**: Az admin oldal még nem frissült a státusz kezeléshez. Ez következő lépés lehet.

---

## 🔮 Következő Lépések (Opcionális)

- [ ] Admin oldal frissítése: státusz módosítás (approved/rejected)
- [ ] Szűrés típus és státusz szerint
- [ ] Export funkciók frissítése az új mezőkkel
- [ ] Email értesítések státusz változásnál

---

**Dátum:** 2026-01-19  
**Verzió:** 1.1.0
