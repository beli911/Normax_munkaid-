# 🔧 Fejlesztési Munkafolyamat

## ⚠️ **FONTOS: Lokális Fejlesztés Először!**

**Szabály:** Mindig lokálisan fejlesztünk és tesztelünk, csak akkor publikálunk, amikor minden rendben van!

---

## 📋 **Fejlesztési Lépések**

### 1️⃣ **Lokális Fejlesztés**

```bash
# 1. Fejlesztési szerver indítása
npm run dev

# 2. Böngészőben tesztelés
# http://localhost:3000
```

### 2️⃣ **Lokális Tesztelés**

- ✅ Funkciók tesztelése
- ✅ Hibák ellenőrzése
- ✅ UI/UX ellenőrzés
- ✅ Admin funkciók tesztelése
- ✅ Adatbázis műveletek tesztelése

### 3️⃣ **Publikálás (Csak ha minden rendben!)**

```bash
# 1. Git commit (lokális változások)
git add .
git commit -m "Fejlesztés leírása"

# 2. Vercel deployment (MANUÁLIS)
npx vercel --prod

# VAGY

# 2. Git push (ha van remote repository)
git push origin main
# (Ezután Vercel automatikusan deployol, HA be van állítva)
```

---

## 🚫 **NE Tegyél:**

- ❌ **NE** push-olj közvetlenül a main branch-re, ha nincs tesztelve
- ❌ **NE** deployolj Vercel-re, ha lokálisan nem működik
- ❌ **NE** commitolj hibás kódot

---

## ✅ **Tedd:**

- ✅ **MINDIG** teszteld lokálisan először
- ✅ **MINDIG** ellenőrizd, hogy minden funkció működik
- ✅ **CSAK AKKOR** deployolj, amikor biztos vagy, hogy minden rendben van
- ✅ **COMMITOLJ** rendszeresen lokális változásokat (git history)

---

## 🔄 **Javasolt Munkafolyamat**

### **Napi Fejlesztés:**
1. `npm run dev` - Lokális szerver indítása
2. Fejlesztés és tesztelés
3. Git commit (lokális)
4. **NEM deployolunk** minden nap

### **Publikálás (Hetente / Funkció kész):**
1. Teljes lokális tesztelés
2. Minden funkció ellenőrzése
3. **Pre-deployment ellenőrzés:** `./pre-deploy-check.sh`
4. Git commit + tag (ha szükséges)
5. Vercel deployment: `npx vercel --prod`

---

## 📝 **Git Workflow**

### **Lokális Fejlesztés:**
```bash
# Változások
git add .
git commit -m "Fejlesztés: funkció leírása"

# Tag készítése (ha release)
git tag -a "v1.0.1-$(date +%Y%m%d)" -m "Release leírás"
```

### **Publikálás:**
```bash
# Csak akkor, amikor minden kész!
npx vercel --prod
```

---

## 🛡️ **Biztonsági Megjegyzések**

- ⚠️ A `.env.local` fájl **SOHA NE** legyen commitolva
- ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` **SOHA NE** legyen nyilvános
- ✅ Mindig használd a lokális `.env.local` fájlt fejlesztéshez
- ✅ A Vercel környezeti változókat csak deployment-nél használjuk

---

## 🧪 **Tesztelési Checklist**

Mielőtt publikálsz, ellenőrizd:

- [ ] Lokális szerver fut (`npm run dev`)
- [ ] Bejelentkezés működik
- [ ] Admin funkciók működnek
- [ ] Alkalmazott létrehozás működik
- [ ] Munkaidő rögzítés működik
- [ ] Payroll funkció működik
- [ ] Export funkciók működnek
- [ ] Nincs konzol hiba
- [ ] Nincs build hiba (`npm run build`)

---

## 📞 **Segítség**

Ha bármi kérdés van a fejlesztési munkafolyamattal kapcsolatban:
- Nézd meg a `TECHNICAL-DOCUMENTATION.md` fájlt
- Ellenőrizd a `RELEASE-*.md` fájlokat

---

**Utolsó frissítés:** 2026-01-23
