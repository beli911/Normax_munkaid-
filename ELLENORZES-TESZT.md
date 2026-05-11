# Ellenőrzés és teszt – minden oldal, elérés, bejelentkezés, adatbázis

## Bejelentkezési adatok (teszt)

| Mező | Érték |
|------|--------|
| **Felhasználónév** | `benner213` |
| **Jelszó** | `Belike911` |

A rendszer a felhasználónevet **emailként** használja: `benner213@munkaido.local`.  
A Supabase Auth-ban ennek az emailnek és jelszónak kell lennie (ha még nincs ilyen user, hozd létre az Admin felületen vagy a Supabase Dashboardon).

---

## Következő lépés, mielőtt minden működne

Ha a böngészőben **„Error: supabaseUrl is required”** jelenik meg:

1. A projekt gyökérben legyen **`.env.local`** fájl (a `.env.local.example` mintájára).
2. Töltsd ki a **Supabase** adataiddal:
   - `NEXT_PUBLIC_SUPABASE_URL` = a Supabase projekt URL (pl. `https://xxxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon (public) kulcs
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role kulcs (csak szerveren használt, ne legyen nyilvános)
3. **Újraindítás:** állítsd le a dev szervert (Ctrl+C), majd futtasd újra:  
   `npm run dev`  
   (a böngészőt frissítsd, vagy nyisd meg újra a megadott portot, pl. http://localhost:3002)

Utána a bejelentkezés és az adatbázis-kommunikáció már tud működni.

---

## Mit kell ellenőrizni – oldalak és funkciók

### 1. Bejelentkezési oldal – `/login`

- **URL:** http://localhost:3002/login (vagy a dev szerver által mutatott port)
- **Látnivaló:** „Bejelentkezés” címsor, Felhasználónév és Jelszó mező, Belépés gomb.
- **Teszt:**  
  - Felhasználónév: `benner213`, Jelszó: `Belike911` → Belépés.  
  - Sikeres belépés után átirányít a főoldalra (/).
- **Képernyőkép:** mentés neve pl. `01-login-oldal.png`, majd `02-login-siker.png` (ha átirányított).

### 2. Főoldal (munkaidő bejegyzések) – `/`

- **Feltétel:** be kell jelentkezni.
- **Látnivaló:**  
  - Fejléc (név, Admin link ha admin a user, Kijelentkezés).  
  - Űrlap: Dátum, Érkezés, Távozás, „Másnap fejeződik be” (éjszakás), Leírás, Típus (Munka/Szabadság/Betegszabadság), Mentés.  
  - Lista: saját bejegyzések (dátum, idő, leírás, típus). Éjszakásnál „(+1 nap)” jelzés.
- **Teszt:**  
  - Új bejegyzés mentése.  
  - Lista frissül, adatbázisból jönnek az adatok (Supabase `timesheets`).
- **Képernyőkép:** pl. `03-fooldal-bejelentkezve.png`.

### 3. Admin oldal – `/admin`

- **Feltétel:** bejelentkezés + **admin** jog (profiles.is_admin = true).
- **Látnivaló:**  
  - Alkalmazottak kezelése, Tartozások (bérszámfejtés) link, esetleg egyéb admin menü.
- **Teszt:**  
  - Ha benner213 admin, kattintás a linkre → Tartozások / bérszámfejtés oldal.  
  - Ha nem admin, nem szabad hogy látszódjon az admin menü, vagy átirányítson.
- **Képernyőkép:** pl. `04-admin-fooldal.png`.

### 4. Bérszámfejtés (Tartozások) – `/admin/payroll`

- **Feltétel:** admin.
- **Látnivaló:**  
  - Hónapválasztó (Előző/Következő Hónap, pl. „2026. JANUÁR”).  
  - Táblázat: alkalmazott, óra, munkadíj, anyagköltség, végösszeg, Kifizetés.  
  - Részletek sor kinyitása (tételes bontás).
- **Teszt:**  
  - Hónap váltás → adatok frissülnek (get_weekly_report / get_weekly_details_for_user hónapra).  
  - Kifizetés rögzítése (ha van fizetetlen tartozás).
- **Képernyőkép:** pl. `05-payroll-havi.png`.

### 5. Elérés és adatbázis – összefoglalva

| Ellenőrzés | Hol | Mit nézz |
|------------|-----|----------|
| **Környezet** | .env.local | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY kitöltve |
| **Bejelentkezés** | /login | benner213 + Belike911 → sikeres belépés, átirányítás |
| **Adatbázis – Auth** | Supabase Dashboard → Authentication | User: benner213@munkaido.local (vagy a beállított email) létezik |
| **Adatbázis – táblák** | Supabase → Table Editor | profiles, timesheets, payments stb. léteznek |
| **Adatbázis – RPC** | Supabase → SQL / Functions | get_weekly_report, get_weekly_details_for_user, get_unpaid_report stb. futnak |
| **Éjszakás műszak** | Supabase | database/fix-overnight-calculation.sql lefuttatva |

---

## Képernyőképek

A teszt során készült képek a **`teszt-kepernyokepek/`** mappában:

| Fájl | Tartalom |
|------|----------|
| `01-fooldal-supabase-url-hiba.png` | Eredeti hiba: „supabaseUrl is required” (mielőtt beállítottuk a placeholder kliens és a figyelmeztetést). |
| `01-login-oldal-env-figyelmeztetes.png` | Bejelentkezési oldal: Supabase nincs beállítva figyelmeztetés + űrlap. |
| `02-login-kitoltve-benner213.png` | Bejelentkezési űrlap kitöltve: felhasználónév `benner213`, jelszó beírva, Belépés gomb. |
| (többi) | Egyéb tesztképek (főoldal, admin, payroll), ha a böngészőben végigmentél a folyamaton. |

Ha a Supabase be van állítva (`.env.local` + újraindítás), érdemes újra lefuttatni a tesztet és képet készíteni: főoldal bejelentkezés után, admin oldal, bérszámfejtés (havi) oldalról.
