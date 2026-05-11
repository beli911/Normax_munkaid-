# Képernyőképek ellenőrzése – funkciók tesztje

A teszteket a **Playwright E2E** futtatta automatikusan. Bejelentkezés: **benner213** / **Belike911**.

---

## Futtatás

```bash
npx playwright test e2e/full-flow.spec.js --project=chromium
```

**Eredmény:** 6/6 teszt sikeres (utolsó futtatás).

---

## Képernyőképek és elvárás (így kell kinézniük)

| Fájl | Funkció | Mit kell látni – ellenőrizve |
|------|---------|------------------------------|
| **01-login-ures.png** | Bejelentkezési oldal (üres) | „Bejelentkezés” címsor, Felhasználónév és Jelszó mező üresen, „Belépés” gomb. Sötét téma. Nincs Supabase figyelmeztetés (mert .env.local be van állítva). |
| **02-login-kitoltve.png** | Login űrlap kitöltve | Ugyanaz, de Felhasználónév: benner213, Jelszó kitöltve (maszkolva), Belépés gomb. |
| **03-fooldal-bejelentkezve.png** | Főoldal bejelentkezés után | „Munkaidő” fejléc, „Üdv, beli!” (vagy a profil neve), Admin link (ha admin a user), Kijelentkezés, Munkaidő űrlap (dátum, érkezés, távozás, stb.), lista alatta. |
| **04-admin-oldal.png** | Admin dashboard | Admin felület: dolgozók, jelenléti ívek, export, Pénzügyi Elszámolás link, stb. Csak admin userrel elérhető. |
| **05-payroll-havi.png** | Bérszámfejtés (havi) | „Tartozások Kezelése”, **Hónap kiválasztása**, „Előző Hónap” / „Következő Hónap”, középen pl. „2026. JANUÁR” (vagy aktuális hónap). Táblázat: alkalmazottak, órák, tartozások, Kifizetés gomb. |
| **06-fooldal-uj-bejegyzes.png** | Főoldal – űrlap és lista | Ugyanaz mint 03: munkaidő űrlap (új bejegyzés), „Saját bejegyzések” lista. |

---

## Funkciók egyesével – mit teszteltünk

1. **Login oldal** – Megjelenik a Bejelentkezés űrlap, helyes címkék és mezők.
2. **Login kitöltés** – Felhasználónév és jelszó mező kitölthető.
3. **Bejelentkezés** – Belépés gomb után átirányít a főoldalra, megjelenik „Munkaidő” és a felhasználó neve.
4. **Főoldal** – Munkaidő űrlap és saját bejegyzések listája látható.
5. **Admin oldal** – Admin felhasználóval elérhető, admin dashboard betölt.
6. **Bérszámfejtés (havi)** – Hónapválasztó (nem hét!), „2026. JANUÁR” stílusú megjelenítés, tartozások táblázata.

---

## Összefoglalás

- **Bejelentkezés:** működik (benner213 @ munkaido.local + jelszó).
- **Főoldal:** megjelenik a felhasználó neve és a munkaidő űrlap/listája.
- **Admin:** csak admin userrel, dashboard és pénzügyi menü elérhető.
- **Bérszámfejtés:** **havi** (hónapválasztó, nem heti).

A képernyőképek a **`teszt-kepernyokepek/`** mappában vannak. Ha valami nem úgy néz ki, mint fent, futtasd újra a teszteket és nézd meg a friss képeket.
