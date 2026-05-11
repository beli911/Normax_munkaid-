# 🏷️ Release: v1.1.0-20260123

**Dátum:** 2026-01-23  
**Státusz:** ✅ Enterprise Fizetési Rendszer - Heti Bontás

---

## 📋 **Release Információk**

- **Tag:** `v1.1.0-20260123`
- **Deployment URL:** https://munkaido-app.vercel.app
- **Git Commit:** `6bb6806` (lásd: `git show v1.1.0-20260123`)

---

## ✨ **Új Funkciók**

### 💰 **Enterprise Fizetési Rendszer**

#### 1. **Heti Fizetési Rendszer**
- ✅ Hétválasztó navigáció (Előző/Következő hét)
- ✅ Jelenlegi hét gomb
- ✅ Hét formázás megjelenítése (pl. "2024.01.22 - 2024.01.28 (4. hét)")
- ✅ Automatikus dátum szűrés

#### 2. **KIFIZETVE Badge**
- ✅ Zöld badge kifizetett tételeknél
- ✅ Fizetés dátum megjelenítése
- ✅ Kifizetett tételek maradnak a listában (nem tűnnek el)

#### 3. **Részletező Nézet (Drill-down)**
- ✅ Lenyitható sorok (Chevron ikonok)
- ✅ Tételes bontás (dátum, típus, leírás, óra, munkadíj, költség)
- ✅ Kifizetett tételek ✓ jelöléssel
- ✅ Összesítő sor a részletekben

#### 4. **Költség Rögzítés**
- ✅ Anyagköltség mezők (összeg + leírás)
- ✅ Szigorú validáció (összeg > 0, leírás kötelező)
- ✅ Költség pirossal jelölve a részletekben

#### 5. **Szigorú Validáció**
- ✅ Munka típusnál kötelező a megjegyzés
- ✅ Költség esetén kötelező az összeg és leírás
- ✅ Duplikáció ellenőrzés

---

## 🗄️ **Adatbázis Frissítések**

### Új Függvények:
- `get_weekly_report(start_date, end_date)` - Heti riport (kifizetett + kifizetetlen)
- `get_weekly_details_for_user(start_date, end_date, user_id)` - Heti részletek
- `execute_payment_until(user_id, amount, cutoff_date)` - Heti zárás

### Új Oszlopok:
- `timesheets.expense_amount` - Költség összege
- `timesheets.expense_note` - Költség leírása
- `timesheets.payment_id` - Fizetés hivatkozás

### Új Táblák:
- `payments` - Fizetési nyugták

---

## 📝 **SQL Scriptek**

A következő scriptek futtatása szükséges:
1. `database-payment-system.sql` - Alap fizetési rendszer
2. `database-weekly-payment-system.sql` - Heti fizetési rendszer (FRISSÍTVE)
3. `fix-get-unpaid-details.sql` - Részletező függvény javítás (opcionális)

---

## 🚀 **Deployment Információk**

### Vercel Környezeti Változók:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview, Development)

---

## 🔄 **Változások az Előző Verzióhoz Képest**

### Új:
- Heti fizetési rendszer
- KIFIZETVE badge
- Költség rögzítés
- Drill-down részletező nézet

### Módosított:
- Payroll oldal teljes átalakítása
- TimesheetForm költség mezőkkel
- API route cutoff date támogatással

---

## 📚 **Dokumentáció**

- `TECHNICAL-DOCUMENTATION.md` - Teljes technikai dokumentáció
- `DEVELOPMENT-WORKFLOW.md` - Fejlesztési munkafolyamat
- `FIX-SERVICE-ROLE-KEY.md` - Service Role Key beállítás

---

**Utolsó frissítés:** 2026-01-23
