# 🚪 Bejelentkezési Útmutató

## Első Lépés: Admin által létrehozott felhasználó

Az alkalmazásban nincs regisztráció. A felhasználókat az admin hozza létre.

1. Jelentkezz be adminként
2. Menj az **Admin** oldalra
3. Az **"Alkalmazott hozzáadása"** résznél adj meg:
   - **Felhasználónév** (pl. "teszt.janos")
   - **Jelszó** (minimum 6 karakter)
   - **Teljes név** (opcionális)
4. A dolgozó ezután a felhasználónév + jelszó párossal tud belépni

## Fontos: Email Megerősítés

A Supabase alapértelmezetten **email megerősítést kér**. Két lehetőség van:

### Opció 1: Email megerősítés kikapcsolása (fejlesztéshez)

1. Menj a Supabase Dashboard → **Authentication** → **Settings**
2. Kapcsold ki az **"Enable email confirmations"** opciót
3. Most már be tudsz jelentkezni regisztráció után

### Opció 2: Email megerősítés (éles környezet)

1. Nézd meg az email fiókodat
2. Kattints a megerősítő linkre
3. Vagy manuálisan erősítsd meg:
   - Supabase Dashboard → **Authentication** → **Users**
   - Keresd meg a felhasználót
   - Kattints a három pontra → **Confirm email**

## Bejelentkezés

1. Nyisd meg: **http://localhost:3000**
2. Add meg a felhasználónevedet és jelszavadat
3. Kattints a **"Belépés"** gombra

## Admin Jogosultság Beállítása

Miután bejelentkeztél:

1. Menj a Supabase Dashboard → **Table Editor**
2. Válaszd ki a **`profiles`** táblát
3. Keresd meg a saját sorodat (email alapján)
4. Kattints a sorra, majd pipáld be az **`is_admin`** mezőt
5. Kattints a **"Save"** gombra
6. Frissítsd az alkalmazást (F5) - most már látni fogod az **"Admin"** gombot!

## Teszt Felhasználó Admin által (Opcionális)

Ha szeretnél egy gyors teszt felhasználót létrehozni:
1. Jelentkezz be adminként
2. Admin felület → **Alkalmazott hozzáadása**
3. Add meg a felhasználónevet és jelszót

```sql
-- Figyelem: Ez csak akkor működik, ha már regisztráltál az alkalmazásban!
-- A felhasználó ID-ját a Supabase Authentication → Users részben találod meg

-- Példa: Admin jogosultság beállítása
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'teszt@example.com';
```

## Hibaelhárítás

### "Invalid login credentials"
- Ellenőrizd, hogy helyes-e a felhasználónév és jelszó
- Ha nem emlékszel a jelszóra, állítsd vissza:
  - Supabase Dashboard → **Authentication** → **Users**
  - Kattints a felhasználóra → **Reset password**

### "Email not confirmed"
- Nézd meg az email fiókodat
- Vagy kapcsold ki az email megerősítést (lásd fent)

### Nem látom az Admin gombot
- Ellenőrizd, hogy az `is_admin` mező `true`-e a `profiles` táblában
- Frissítsd az oldalt (F5)
- Próbáld meg kijelentkezni és újra bejelentkezni

---

**Most már be tudsz jelentkezni! 🎉**


