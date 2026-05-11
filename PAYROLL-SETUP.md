# 💰 Pénzügyi Elszámolás Funkció - Beállítási Útmutató

## 🎯 Funkció Leírása

A **Pénzügyi Elszámolás** funkció lehetővé teszi az adminnak, hogy kiszámolja az alkalmazottak fizetését a rögzített órák és beállított óradíjak alapján.

### Főbb Funkciók:
- ✅ Dátumtartomány kiválasztása (alapértelmezetten aktuális hét)
- ✅ Automatikus óraszámítás (óra:perc → decimális)
- ✅ Fizetés számítása (Óra × Óradíj)
- ✅ Összesítő statisztikák
- ✅ CSV export

---

## 📋 Telepítési Lépések

### 1. Adatbázis Függvény Létrehozása

Futtasd le a Supabase SQL Editor-ben:

```sql
-- Fájl: database-payroll-function.sql
```

Ez létrehozza a `get_payroll_report` függvényt, ami:
- Bemenetként vár egy `start_date` és `end_date` dátumot
- Összekapcsolja a `profiles` és `timesheets` táblákat
- Csak a `work` típusú és `approved` vagy `pending` státuszú bejegyzéseket veszi figyelembe
- Kiszámolja a ledolgozott órákat
- Kiszámolja a fizetendő összeget (`total_hours * hourly_rate`)

### 2. Ellenőrzés

A függvény sikeresen létrejött, ha a Supabase SQL Editor-ben nem ad hibát.

---

## 🚀 Használat

### Elérés

1. Bejelentkezz admin felhasználóval
2. Menj az **Admin** oldalra
3. Kattints a **"Pénzügyi Elszámolás"** gombra

### Dátum Kiválasztás

- **Alapértelmezett**: Aktuális hét (hétfő - péntek)
- **Gyors választók**:
  - "Aktuális hét" gomb
  - "Aktuális hónap" gomb
- **Manuális**: Válassz ki tetszőleges dátumtartományt

### Eredmények

A táblázat tartalmazza:
- **Alkalmazott neve**
- **Óradíj** (Ft/óra)
- **Összes óra** (decimális formátumban, pl. 40.50)
- **Fizetendő összeg** (Ft)

### Export

A **CSV Export** gombbal letölthető egy CSV fájl, ami tartalmazza:
- Minden alkalmazott adatait
- Összesítő sort az összes órával és fizetéssel

---

## 📊 Számítási Logika

### Óraszámítás

```
Óra = (end_time - start_time) másodpercekben / 3600
```

Példa:
- Kezdés: 08:00
- Vég: 16:30
- Időtartam: 8.5 óra

### Fizetés Számítása

```
Fizetés = Összes óra × Óradíj
```

Példa:
- Összes óra: 40.5
- Óradíj: 1500 Ft/óra
- Fizetés: 40.5 × 1500 = 60 750 Ft

---

## ⚠️ Fontos Megjegyzések

1. **Csak munkatípusú bejegyzések**: A számítás csak a `work` típusú bejegyzéseket veszi figyelembe. Szabadság és betegszabadság nem számít bele.

2. **Státusz szűrés**: Csak az `approved` (elfogadott) vagy `pending` (függőben) bejegyzések számítanak. Az `rejected` (elutasított) bejegyzések kimaradnak.

3. **Óradíj beállítása**: Az alkalmazottaknak be kell állítani az óradíjat az admin oldalon, különben nem jelennek meg az elszámolásban.

4. **Null értékek**: Ha egy alkalmazottnak nincs rögzített órája a kiválasztott időszakban, nem jelenik meg a listában.

---

## 🔧 Hibaelhárítás

### "Nincs adat a kiválasztott időszakra"

**Lehetséges okok:**
- Nincs rögzített `work` típusú bejegyzés az időszakban
- Az alkalmazottaknak nincs beállított óradíjuk
- Minden bejegyzés `rejected` státuszú

**Megoldás:**
- Ellenőrizd, hogy vannak-e rögzített órák
- Állítsd be az óradíjakat az admin oldalon
- Fogadd el a függőben lévő bejegyzéseket

### "Function does not exist" hiba

**Megoldás:**
- Futtasd le újra a `database-payroll-function.sql` fájlt
- Ellenőrizd, hogy a függvény neve helyes: `get_payroll_report`

### Nem jelennek meg az alkalmazottak

**Lehetséges okok:**
- Nincs beállított `hourly_rate`
- Nincs rögzített óra a kiválasztott időszakban

**Megoldás:**
- Állítsd be az óradíjakat az admin oldalon
- Válassz más dátumtartományt

---

## 📝 Példa Használat

### Pénteki Elszámolás

1. Nyisd meg a **Pénzügyi Elszámolás** oldalt
2. Kattints az **"Aktuális hét"** gombra
3. Nézd meg a táblázatot:
   - Kovács János: 40 óra × 1500 Ft = **60 000 Ft**
   - Nagy Péter: 32 óra × 2000 Ft = **64 000 Ft**
4. Kattints a **CSV Export** gombra
5. Mentsd el a fájlt és utald át az összegeket

---

## 🔄 Következő Lépések (Opcionális)

- [ ] Email értesítés az elszámolásról
- [ ] PDF export
- [ ] Több időszak összehasonlítása
- [ ] Grafikus megjelenítés
- [ ] Automatikus bérszámfejtés integráció

---

**Utolsó frissítés:** 2026-01-19  
**Verzió:** 1.0.0
