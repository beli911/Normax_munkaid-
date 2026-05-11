# ✅ Teszt ellenőrzés – Munkaidő App

Ezt a listát érdemes végigpörgetni minden nagyobb frissítés vagy kiadás előtt.

---

## Automatizált ellenőrzés

```bash
npm run lint
npm run build
```

Mindkettő sikeres legyen (0 hiba).

---

## Manuális tesztlista

### Bejelentkezés
- [ ] Login: helyes adatokkal belépés működik
- [ ] Login: hibás adatoknál általános hibaüzenet (nem technikai)
- [ ] Kijelentkezés után átirányítás loginra

### Dolgozói oldal (főoldal)
- [ ] Új bejegyzés: Munka (dátum, kezdés, vége, megjegyzés) → Mentés sikeres
- [ ] Új bejegyzés: Szabadság / Betegszabadság → Mentés sikeres
- [ ] Duplikátum: ugyanarra a napra második mentés → hibaüzenet
- [ ] Üres időmezők (Munka) → "Kérjük, töltse ki az időpontokat!"
- [ ] Saját lista: bejegyzések megjelennek, "Szerkesztés" gomb látható
- [ ] Módosítási kérés: Szerkesztés → modal → módosítás → "Módosítás kérése" → sikeres üzenet, "Módosításra vár" badge
- [ ] Jóváhagyott kérésnél: zöld "Javítás jóváhagyva" badge látható

### Admin
- [ ] Admin belépés: főoldalról Admin link → dashboard betölt
- [ ] Táblázat: dátum, dolgozó, idő, megjegyzés látható
- [ ] **Késői rögzítés:** Ha van olyan sor, ahol work_date és created_at > 5 nap → sárga ⚠️ ikon a dátum mellett, tooltip: "Utólag rögzítve! (X nappal később...)"
- [ ] Szűrés: dátum / dolgozó szűrő működik
- [ ] Titkos szerkesztő: soron 3× kattintás → modal → mentés/törlés működik
- [ ] Jóváhagyandó módosítások: ha van pending kérés → szekció látható, Elfogadás/Elutasítás működik
- [ ] Export: CSV / Excel letöltés indul

### Pénzügyi elszámolás
- [ ] Admin → Pénzügyi Elszámolás → lista betölt
- [ ] Hétváltás (előző/következő) működik
- [ ] Sorra kattintás → tételes bontás megjelenik

### Egyéb
- [ ] Téma váltás (világos/sötét) működik
- [ ] Mobil nézetben (vagy keskeny ablak) a táblázat/űrlap nem törik el

---

## Késői rögzítés (Late Entry) – specifikus

- A **Dátum** oszlopban csak akkor jelenik meg a ⚠️ ikon, ha a bejegyzés **5 napnál később** lett rögzítve (created_at − work_date > 5 nap).
- Érvénytelen vagy hiányzó dátum esetén az ikon **nem** jelenik meg (nem dob hibát).
- Tooltip: "Utólag rögzítve! (X nappal később rögzítve. Rögzítés ideje: YYYY.MM.dd.)"

---

*Utolsó frissítés: átrendezés + késői rögzítés észlelés + teszt lista.*
