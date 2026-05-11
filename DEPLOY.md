# 🚀 Vercel Telepítés - Gyors Útmutató

## Módszer 1: GitHub-on keresztül (Ajánlott - 5 perc)

### 1. GitHub Repository Létrehozása

```bash
# Ha még nincs git repository
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Hozz létre egy új repository-t a GitHub-on, majd:
git remote add origin https://github.com/FELHASZNÁLÓNÉV/munkaido-app.git
git push -u origin main
```

### 2. Vercel Dashboard

1. Menj a **[vercel.com](https://vercel.com)**-ra
2. Regisztrálj (vagy jelentkezz be) - **ingyenes**
3. Kattints **"Add New Project"**
4. Válaszd ki a GitHub repository-t
5. Kattints **"Import"**

### 3. Környezeti Változók Beállítása

A projekt beállításokban (Settings → Environment Variables) add hozzá:

```
NEXT_PUBLIC_SUPABASE_URL = https://mppddnwwtthidfcwiirz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wcGRkbnd3dHRoaWRmY3dpaXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjY2ODUsImV4cCI6MjA4MjUwMjY4NX0.PksiGnDJ4Q8NtOLZCVk4b_ruv6lojbWBDw-AKHpBNaQ
```

### 4. Deploy!

Kattints a **"Deploy"** gombra. 2-3 perc múlva kész! 🎉

Az alkalmazás elérhető lesz egy ingyenes URL-en, pl:
- `https://munkaido-app.vercel.app`

---

## Módszer 2: Vercel CLI (Ha van jogosultság)

```bash
# Telepítés (sudo szükséges lehet)
sudo npm install -g vercel

# Bejelentkezés
vercel login

# Telepítés
vercel

# Környezeti változók
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Éles telepítés
vercel --prod
```

---

## Fontos Megjegyzések

✅ **HTTPS automatikus** - A Vercel ingyenes HTTPS-t biztosít

✅ **Automatikus frissítés** - Minden git push után újra telepíti

✅ **Ugyanaz az adatbázis** - A Vercel-en futó alkalmazás ugyanazt a Supabase adatbázist használja

✅ **Ingyenes** - A Vercel ingyenes csomagja elegendő ehhez az alkalmazáshoz

---

## Frissítés

Ha módosítasz valamit:

```bash
git add .
git commit -m "Update"
git push
```

A Vercel automatikusan újra telepíti! 🚀

