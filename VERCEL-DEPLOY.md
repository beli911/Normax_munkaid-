# 🚀 Vercel Telepítési Útmutató

## Gyors Telepítés (Vercel CLI)

### 1. Vercel CLI Telepítése

```bash
npm install -g vercel
```

### 2. Bejelentkezés

```bash
vercel login
```

### 3. Telepítés

```bash
vercel
```

A CLI kérni fogja:
- **Set up and deploy?** → `Y`
- **Which scope?** → Válaszd ki a fiókodat
- **Link to existing project?** → `N` (első telepítés)
- **Project name?** → `munkaido-app` (vagy bármi)
- **Directory?** → `.` (jelenlegi mappa)

### 4. Környezeti Változók Beállítása

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Másold be a Supabase URL-t

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Másold be a Supabase anon key-t
```

### 5. Éles Telepítés

```bash
vercel --prod
```

---

## Telepítés GitHub-on keresztül (Ajánlott)

### 1. GitHub Repository Létrehozása

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/FELHASZNÁLÓNÉV/munkaido-app.git
git push -u origin main
```

### 2. Vercel Dashboard

1. Menj a [vercel.com](https://vercel.com)-ra
2. Kattints **"Add New Project"**
3. Válaszd ki a GitHub repository-t
4. Kattints **"Import"**

### 3. Környezeti Változók

A projekt beállításokban add hozzá:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://mppddnwwtthidfcwiirz.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (a Supabase anon key)

### 4. Deploy

Kattints a **"Deploy"** gombra!

---

## Fontos: Adatbázis Beállítások

A Vercel-en telepített alkalmazás ugyanazt a Supabase adatbázist használja, mint a helyi fejlesztés.

**Ellenőrizd:**
- A Supabase RLS (Row Level Security) beállítások aktívak-e
- A `profiles` és `timesheets` táblák léteznek-e
- Az admin jogosultság be van-e állítva

---

## Frissítés

Ha módosítasz valamit a kódban:

```bash
git add .
git commit -m "Update"
git push
```

A Vercel automatikusan újra telepíti!

---

## URL

A telepítés után kapsz egy ingyenes URL-t:
- Pl: `https://munkaido-app.vercel.app`

Ez az URL HTTPS-sel védett és mindenki számára elérhető!

