# 🔧 SUPABASE_SERVICE_ROLE_KEY Hozzáadása

## ⚠️ **HIBA: "Szerver konfiguracios hiba."**

Ez a hiba akkor jelentkezik, amikor hiányzik a `SUPABASE_SERVICE_ROLE_KEY` környezeti változó a Vercel-en.

---

## 📋 **Megoldás: Service Role Key Hozzáadása**

### 1. **Service Role Key Beszerzése**

1. Menj a **[Supabase Dashboard](https://supabase.com/dashboard)**-ba
2. Válaszd ki a projektet
3. Menj a **Settings** → **API** menüpontba
4. Keresd meg a **service_role** key-t (⚠️ **SOHA NE OSZD MEG NYILVÁNOSAN!**)
5. Másold ki a teljes key-t

### 2. **Hozzáadása Vercel-hez**

1. Menj a **[Vercel Dashboard](https://vercel.com/benner213-1469s-projects/munkaido-app/settings/environment-variables)**-ba
2. Kattints az **"Add New"** gombra
3. Add meg:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (a másolt service_role key)
   - **Environment:** Válaszd ki mindhármat:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. Kattints **Save**

### 3. **Redeploy**

1. Menj a **Deployments** fülre
2. Kattints a legutóbbi deployment-re
3. Kattints a **⋯** (három pont) menüre
4. Válaszd a **Redeploy** opciót
5. Várj 1-2 percet

---

## ✅ **Ellenőrzés**

A deployment után próbáld meg újra:
1. Nyisd meg: https://munkaido-app.vercel.app/admin
2. Próbáld meg létrehozni egy alkalmazottat
3. Ha sikeres, akkor minden rendben! 🎉

---

## 🔒 **Biztonsági Megjegyzés**

- ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` **SOHA NE** legyen `NEXT_PUBLIC_*` prefix-szel!
- ⚠️ Ez a key **teljes admin hozzáférést** ad az adatbázishoz
- ⚠️ **SOHA NE** commitold a `.env.local` fájlt a git-be
- ✅ A Vercel automatikusan titkosítja a környezeti változókat

---

## 📝 **Gyors Parancs (Ha van hozzáférése a key-hez)**

Ha van hozzáférése a service role key-hez, futtasd:

```bash
echo "SERVICE_ROLE_KEY_ÉRTÉKE" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "SERVICE_ROLE_KEY_ÉRTÉKE" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview
echo "SERVICE_ROLE_KEY_ÉRTÉKE" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY development
```

---

**Utolsó frissítés:** 2026-01-19
