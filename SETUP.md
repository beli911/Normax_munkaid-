# 🚀 Teljes Beállítási Útmutató

Ez a dokumentum részletesen elmagyarázza, hogyan kell beállítani és használni a munkaidő-nyilvántartó rendszert.

## 📋 Előfeltételek

- Node.js 18+ telepítve
- Supabase fiók (ingyenes: https://supabase.com)
- Git (opcionális, ha GitHub-ra szeretnéd tölteni)

---

## 1️⃣ Lépés: Supabase Projekt Létrehozása

1. Menj a [Supabase.com](https://supabase.com)-ra és regisztrálj (vagy jelentkezz be)
2. Kattints a **"New Project"** gombra
3. Töltsd ki az adatokat:
   - **Project Name:** `munkaido-app` (vagy bármi)
   - **Database Password:** Jegyezd meg ezt! (később kell)
   - **Region:** Válaszd ki a legközelebbit
4. Várj 2-3 percet, amíg a projekt létrejön

---

## 2️⃣ Lépés: Adatbázis Beállítása

1. A Supabase Dashboard-ban menj az **SQL Editor** menüpontba (bal oldali menü)
2. Kattints a **"New Query"** gombra
3. Másold be a teljes `database/database-setup.sql` fájl tartalmát (az SQL scriptek a projekt `database/` mappájában vannak)
4. Kattints a **"Run"** gombra (vagy Ctrl+Enter)
5. Ellenőrizd, hogy sikeres volt-e (zöld üzenet jelenik meg)

**Fontos:** Ha hibaüzenet jelenik meg, valószínűleg már léteznek a táblák. Ebben az esetben:
- Menj a **Table Editor**-be
- Töröld a `profiles` és `timesheets` táblákat (ha léteznek)
- Futtasd újra a scriptet

---

## 3️⃣ Lépés: API Kulcsok Másolása

1. A Supabase Dashboard-ban menj a **Project Settings** → **API** menüpontba
2. Másold ki a következő értékeket:
   - **Project URL** → Ez lesz a `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Ez lesz a `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. A `.env.local` fájlban már be vannak állítva ezek az értékek (ha nem, lásd a README-t)

---

## 4️⃣ Lépés: Alkalmazás Indítása

A terminálban futtasd:

```bash
npm install  # Ha még nem futott le
npm run dev
```

Nyisd meg a böngészőben: **http://localhost:3000**

---

## 5️⃣ Lépés: Admin Felhasználó Létrehozása

Az alkalmazásban nincs regisztráció, a felhasználókat az admin hozza létre.

1. Supabase Dashboard → **Authentication** → **Users**
2. Hozd létre az admin felhasználót (email + jelszó)
3. Menj a **Table Editor** → `profiles` tábla
4. Állítsd az admin felhasználónál az **`is_admin`** mezőt `true`-ra

**Biztonság:** 
- **Public signup kikapcsolása:** Lásd a részletes útmutatót a **[SUPABASE-SETUP.md](./SUPABASE-SETUP.md)** fájlban
- **Email megerősítés:** Supabase Dashboard → **Authentication** → **Settings** → kapcsold ki a **"Enable email confirmations"** opciót fejlesztéshez

---

## 6️⃣ Lépés: Első Dolgozó Létrehozása

1. Jelentkezz be adminként az alkalmazásba
2. Menj az **Admin** oldalra
3. Az **"Alkalmazott hozzáadása"** résznél adj meg:
   - **Felhasználónév**
   - **Jelszó**
   - **Teljes név** (opcionális)
4. A dolgozó ezután ezzel a felhasználónév + jelszó párossal tud belépni

---

## 7️⃣ Lépés: További Felhasználók Hozzáadása

1. Minden új felhasználót az admin hoz létre az Admin felületen
2. Automatikusan létrejön a profilja a `profiles` táblában
3. Csak az admin látja az összes rögzítést az Admin felületen

---

## 🎯 Funkciók Használata

### Dolgozói Felület (Főoldal)

- **Munkaidő rögzítése:**
  - Válaszd ki a dátumot
  - Add meg az érkezési és távozási időt
  - Opcionálisan írj megjegyzést
  - Kattints a **"Rögzítés mentése"** gombra

- **Saját rögzítések megtekintése:**
  - A főoldal alján láthatod az utolsó 10 rögzítésedet
  - A **"Frissítés"** gombbal újratöltöd a listát

### Admin Felület

- **Hozzáférése:**
  - Csak akkor látható, ha az `is_admin` mező `true` a `profiles` táblában
  - A főoldal fejlécében jelenik meg az **"Admin"** gomb

- **Mit látsz:**
  - Minden munkavállaló összes rögzítését
  - Dátum szerint rendezve (legújabbak először)
  - Munkavállaló neve és email címe
  - Időtartam és megjegyzések

---

## 🔒 Biztonsági Beállítások (RLS)

A rendszer automatikusan beállítja a Row Level Security (RLS) szabályokat:

- **Dolgozók:** Csak a saját rögzítéseiket látják és írhatják
- **Adminok:** Minden rögzítést látnak
- **Profilok:** Mindenki láthatja, de csak a sajátját módosíthatja

**Ne módosítsd ezeket a szabályokat, hacsak nem tudod, mit csinálsz!**

---

## 🐛 Hibaelhárítás

### "Module not found" hiba

```bash
# Töröld a node_modules mappát és telepítsd újra
rm -rf node_modules package-lock.json
npm install
```

### "Cannot connect to Supabase" hiba

- Ellenőrizd, hogy a `.env.local` fájlban helyesek-e a kulcsok
- Ellenőrizd, hogy a Supabase projekt aktív-e
- Újraindítsd a Next.js szervert (`Ctrl+C`, majd `npm run dev`)

### "Permission denied" hiba az admin felületen

- Ellenőrizd, hogy az `is_admin` mező `true`-e a `profiles` táblában
- Frissítsd az oldalt (F5)
- Próbáld meg kijelentkezni és újra bejelentkezni

### Email megerősítés nem jön

- Menj a Supabase Dashboard → **Authentication** → **Settings**
- Kapcsold ki az **"Enable email confirmations"** opciót (fejlesztéshez)
- Vagy manuálisan erősítsd meg a felhasználót

---

## 📱 PWA Telepítés (Telefonra)

1. Nyisd meg az alkalmazást a telefon böngészőjében
2. iOS (Safari):
   - Kattints a megosztás gombra
   - Válaszd a **"Add to Home Screen"** opciót
3. Android (Chrome):
   - A böngésző automatikusan felajánlja a telepítést
   - Vagy: Menü → **"Add to Home Screen"**

---

## 🚀 Éles Környezetbe Töltés (Vercel)

1. Regisztrálj a [Vercel.com](https://vercel.com)-ra
2. Kösd össze a GitHub fiókoddal
3. Töltsd fel a kódot GitHub-ra:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <github-repo-url>
   git push -u origin main
   ```
4. A Vercel-ben:
   - Kattints **"New Project"**
   - Válaszd ki a GitHub repository-t
   - Add meg a környezeti változókat:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Kattints **"Deploy"**
5. 2 perc múlva kész! 🎉

---

## 📞 További Segítség

- **Supabase Dokumentáció:** https://supabase.com/docs
- **Next.js Dokumentáció:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## ✅ Ellenőrzőlista

- [ ] Supabase projekt létrehozva
- [ ] `database/database-setup.sql` futtatva
- [ ] `.env.local` fájl létrehozva és kitöltve
- [ ] `npm install` lefutott
- [ ] `npm run dev` működik
- [ ] Első felhasználó regisztrálva
- [ ] Admin jogosultság beállítva
- [ ] Teszt rögzítés létrehozva
- [ ] Admin felület elérhető

---

**Sok sikert! 🎉**


