# ⚡ Gyors Vercel Telepítés

## Build Sikeres! ✅

Az alkalmazás build-je sikeresen lefutott. Most már telepíthető a Vercel-re.

## Telepítés 2 Lépésben

### 1. GitHub Repository (Ha még nincs)

```bash
# Hozz létre egy új repository-t a GitHub-on, majd:
git remote add origin https://github.com/FELHASZNÁLÓNÉV/munkaido-app.git
git push -u origin main
```

### 2. Vercel Dashboard

1. Menj a **[vercel.com](https://vercel.com)**-ra és regisztrálj
2. Kattints **"Add New Project"**
3. Válaszd ki a GitHub repository-t
4. **Környezeti változók hozzáadása:**
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://mppddnwwtthidfcwiirz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wcGRkbnd3dHRoaWRmY3dpaXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MjY2ODUsImV4cCI6MjA4MjUwMjY4NX0.PksiGnDJ4Q8NtOLZCVk4b_ruv6lojbWBDw-AKHpBNaQ`
5. Kattints **"Deploy"**

**Kész! 2-3 perc múlva az alkalmazás elérhető lesz egy ingyenes URL-en! 🎉**

---

## Vagy: Vercel CLI (Terminálból)

```bash
npx vercel
```

Kövessd az utasításokat, majd add hozzá a környezeti változókat a Vercel Dashboard-ban.

