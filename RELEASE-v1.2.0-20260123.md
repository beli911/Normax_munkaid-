# 🏷️ Release: v1.2.0-20260123

**Dátum:** 2026-01-23  
**Státusz:** ✅ Céges Kártya Rendszer - Pénzügyi Megkülönböztetés

---

## 📋 **Release Információk**

- **Tag:** `v1.2.0-20260123`
- **Deployment URL:** https://munkaido-app.vercel.app
- **Git Commit:** `57719e1` (lásd: `git show v1.2.0-20260123`)

---

## ✨ **Új Funkciók**

### 💳 **Céges Kártya Rendszer**

#### 1. **Pénzügyi Megkülönböztetés**
- ✅ `is_company_card` oszlop hozzáadva a `timesheets` táblához
- ✅ Céges kártya checkbox (TimesheetForm)
- ✅ Pénzügyi logika: Céges kártya NEM adódik hozzá a fizetéshez
- ✅ Saját zseb: Hozzáadódik a fizetendő végösszeghez

#### 2. **Megjelenítés**
- ✅ Céges költség: Szürke szín, 💳 ikon
- ✅ Saját költség: Piros szín, AlertCircle ikon
- ✅ Részletező nézet: Céges kártya jelölés
- ✅ Összesítő: Céges költség külön megjelenítve

#### 3. **SQL Függvények Frissítve**
- ✅ `get_weekly_report()` - `total_expenses` vs. `company_expenses`
- ✅ `get_weekly_details_for_user()` - `is_company_card` mező
- ✅ Pénzügyi logika: Csak a saját költség adódik hozzá a `grand_total`-hoz

---

## 🗄️ **Adatbázis Frissítések**

### Új Oszlopok:
- `timesheets.is_company_card` - Céges kártya jelölés (boolean)

### Frissített Függvények:
- `get_weekly_report(start_date, end_date)` - Céges vs. saját költség
- `get_weekly_details_for_user(start_date, end_date, user_id)` - Céges kártya mező

---

## 📝 **SQL Scriptek**

A következő scriptek futtatása szükséges:
1. `database-payment-system.sql` - Alap fizetési rendszer
2. `database-weekly-payment-system.sql` - Heti fizetési rendszer
3. `database-company-card-system.sql` - Céges kártya rendszer (ÚJ)

---

## 🚀 **Deployment Információk**

### Vercel Környezeti Változók:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview, Development)

---

## 🔄 **Változások az Előző Verzióhoz Képest**

### Új:
- Céges kártya megkülönböztetés
- Pénzügyi logika: Céges kártya NEM adódik hozzá
- Céges költség megjelenítése (szürke, 💳 ikon)

### Módosított:
- TimesheetForm: Céges kártya checkbox
- Payroll oldal: Céges vs. saját költség megjelenítése
- SQL függvények: Pénzügyi logika frissítve

---

## 📚 **Dokumentáció**

- `TECHNICAL-DOCUMENTATION.md` - Teljes technikai dokumentáció
- `DEVELOPMENT-WORKFLOW.md` - Fejlesztési munkafolyamat
- `FIX-SERVICE-ROLE-KEY.md` - Service Role Key beállítás

---

## 💡 **Használati Példa**

### Céges Kártya:
1. Viktor tankol 30.000 Ft-ért
2. Bepipálja: "💳 Céges kártyával fizettem"
3. Elszámolás:
   - Munkadíj: 100.000 Ft
   - Költség: 30.000 Ft 💳 (szürke)
   - **Fizetendő:** **100.000 Ft** (a 30 ezret NEM adja hozzá)

### Saját Zseb:
1. Viktor vesz csavart 5.000 Ft-ért
2. Nincs pipa (saját zseb)
3. Elszámolás:
   - Munkadíj: 100.000 Ft
   - Költség: 5.000 Ft (piros)
   - **Fizetendő:** **105.000 Ft**

---

**Utolsó frissítés:** 2026-01-23
