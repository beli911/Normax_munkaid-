# Kódolási és biztonsági hibák / kockázatok – jegyzék

**Összegyűjtve:** csak listázva, semmi nem lett módosítva a kódban.  
**Cél:** stabil, hibamentes alkalmazás – ezeket később érdemes javítani.

---

## 1. API route-ok – hibakezelés

### 1.1 `request.json()` nincs try-catch-ben

**Fájlok:**  
`app/api/admin/create-user/route.js`, `app/api/admin/pay-user/route.js`, `app/api/admin/reset-password/route.js`, `app/api/admin/update-user/route.js`, `app/api/admin/timesheets/route.js` (PUT)

**Probléma:** Ha a kliens hibás vagy nem JSON body-t küld (pl. üres body, nem JSON), a `await request.json()` kivételt dob. A route nem kezeli, így 500-as válasz és nem kívánatos hibaüzenet jöhet.

**Javaslat:** A body olvasását tegyük try-catch blokkba, és invalid JSON / üres body esetén 400-as válasz + egyértelmű hibaüzenet.

---

### 1.2 Kliens oldali `response.json()` nincs try-catch-ben

**Fájlok:**  
`app/admin/page.js` (több hely: create user, update user, pay, secret edit – `const payload = await response.json()`),  
`app/admin/payroll/page.js` (`handlePayment`: `const result = await response.json()`)

**Probléma:** Ha a szerver nem JSON-t ad vissza (pl. 500 HTML oldal, gateway hiba), a `response.json()` kivételt dob. A catch ágban a hiba üzenete nem feltétlenül értelmezhető a felhasználónak.

**Javaslat:** `response.json()` hívás try-catch-ben, és ha a válasz nem JSON vagy üres body, kezeljük külön (pl. „Szerverhiba, próbáld újra” üzenet).

---

## 2. Admin oldal – triple-click (titkos szerkesztő)

**Fájl:** `app/admin/page.js`  
**Körülbelül:** 328–364. sor

**Probléma:** A `clickTimers` objektum a komponens törzsében van: `const clickTimers = {}`. Minden újrarendereléskor új objektum jön létre, a korábbi kattintásszámlálók elvesznek. Emiatt a három kattintásos (triple-click) detektálás gyakorlatilag nem működik megbízhatóan.

**Javaslat:** `clickTimers` tárolása `useRef({})`-ben (vagy más, renderen át megmaradó state), hogy a kattintások száma ne törlődjön minden renderkor.

---

## 3. API – bemenetek validálása

### 3.1 `update-user` – `hourlyRate` típusa

**Fájl:** `app/api/admin/update-user/route.js`  
**Körülbelül:** 44., 84–86. sor

**Probléma:** A `hourlyRate` csak akkor kerül be az `updatePayload`-ba, ha `typeof hourlyRate === 'number'`. A kliens gyakran stringet küld (pl. `"1500"`). Ilyenkor `hourly_rate` nem frissül, a felhasználó számára „nem mentődött” hatást kelt.

**Javaslat:** `hourlyRate` elfogadása szám és string formában is, pl. `const rate = typeof hourlyRate === 'number' ? hourlyRate : parseFloat(hourlyRate);` és csak ezután ellenőrizni, hogy szám-e és nem NaN.

---

### 3.2 `pay-user` – `cutoffDate` formátum

**Fájl:** `app/api/admin/pay-user/route.js`  
**Körülbelül:** 43., 52–57. sor

**Probléma:** A `cutoffDate` nem ellenőrzött. Hibás vagy nem dátum-szerű string esetén az adatbázis függvény elutasíthatja, a hibaüzenet pedig kevésbé egyértelmű.

**Javaslat:** Dátum formátum ellenőrzés (pl. YYYY-MM-DD regex vagy `new Date(cutoffDate)` + `isNaN`) és invalid esetben 400-as válasz egyértelmű szöveggel.

---

### 3.3 `timesheets` PUT – enum és típusok

**Fájl:** `app/api/admin/timesheets/route.js`  
**Körülbelül:** 84–106. sor

**Probléma:**  
- `entry_type` és `status` nincs ellenőrizve az engedélyezett értékekre (`work` / `holiday` / `sick_leave`, illetve `pending` / `approved` / `rejected`). Érvénytelen érték adatbázis szinten hibát okozhat.  
- `work_date`, `start_time`, `end_time` formátumát nem validáljuk (pl. dátum ISO, idő HH:mm).  
- `expense_amount` stringként is jöhet a JSON-ból; érdemes számításként kezelni (pl. `Number()` / `parseFloat`) és csak számot engedni.

**Javaslat:** Enum whitelist ellenőrzés, dátum/idő formátum és szám típus validáció, invalid esetben 400 + világos hibaüzenet.

---

### 3.4 `reset-password` – `userId` formátum

**Fájl:** `app/api/admin/reset-password/route.js`  
**Körülbelül:** 40–45. sor

**Probléma:** A `userId` csak trim-elve van, UUID formátumra nincs ellenőrzés. Nem UUID string esetén a Supabase `updateUserById` hibázhat, a válasz kevésbé informatív.

**Javaslat:** UUID regex vagy megfelelő könyvtárral ellenőrizni; nem UUID esetén 400-as válasz.

---

## 4. Biztonsági / működési megfontolások

### 4.1 Rate limiting hiánya

**Fájlok:**  
`app/api/admin/create-user/route.js`, `app/login/page.js`

**Probléma:**  
- Nincs rate limit a felhasználó létrehozásán: sok kérés = sok új user, abuse lehetőség.  
- Nincs rate limit a bejelentkezésen: jelszó tippelgetés (brute force) kipróbálható.

**Javaslat:** Rate limiting bevezetése (pl. IP vagy user alapján) a login és az admin user-create végpontokon (Next.js middleware vagy külső szolgáltatás).

---

### 4.2 Bejelentkezési hibaüzenetek

**Fájl:** `app/login/page.js`  
**Körülbelül:** 45–48. sor

**Probléma:** A `error.message` közvetlenül megjelenik (pl. „Invalid login credentials”). Ez általában nem ad túl sok infót a támadónak, de a szöveg pontos megfogalmazása a Supabase verziójától függ; érdemes tudatosan csak általános üzenetet mutatni élesben.

**Javaslat:** Éles környezetben minden auth hiba esetén ugyanazt az általános üzenetet mutatni (pl. „Hibás felhasználónév vagy jelszó”), a konkrét `error.message`-t csak logolni.

---

### 4.3 `pay-user` – melyik Supabase kliens hívja az RPC-t

**Fájl:** `app/api/admin/pay-user/route.js`  
**Körülbelül:** 19–22., 66. sor

**Probléma:** Az RPC hívást a felhasználó tokenjével létrehozott `authClient`-tel végzi az API. Ha az adatbázisban a `execute_payment_until` (és egyéb payment RPC) csak service role vagy más jogosultság alatt fut, a hívás meghiúsulhat.

**Javaslat:** Ellenőrizni az adatbázis oldalon: a payment RPC-nek `SECURITY DEFINER` és megfelelő `GRANT EXECUTE` beállítás kell, hogy a bejelentkezett admin user tokenjével is lefusson. Ha nem, akkor az API-nak service role klienssel kell az RPC-t hívnia.

---

## 5. Utils – edge case-ek

### 5.1 Idő string formátum

**Fájl:** `lib/utils.js`  
**Függvények:** `calculateDuration`, `calculateHoursDecimal`, `validateTimes`

**Probléma:** A `startTime` és `endTime` értékeket `split(':').map(Number)`-rel dolgozzuk fel. Hibás formátum (pl. `"25:00"`, `"ab:cd"`, üres string) esetén `NaN` keletkezik, a számítások és a visszaadott szöveg (pl. „NaN óra”) értelmetlen lehet.

**Javaslat:**  
- Formátum ellenőrzés (pl. HH:mm vagy HH:mm:ss regex).  
- NaN vagy negatív érték esetén biztonságos visszatérés (pl. `'0 óra'`, `'0.00'`) és/vagy explicit validációs hiba.

---

## 6. Egyéb

### 6.1 Timesheets PUT – `id` a body-ban és az URL-ben

**Fájl:** `app/api/admin/timesheets/route.js`  
**Körülbelül:** 51., 84–86., 114. sor

**Probléma:** A PUT kérésben az `id` jön a body-ból is és az URL query-ből is (`?id=...`). A frissítés a body-beli `id`-t használja. Ha a kliens rosszul küldi (pl. body-ban más id mint URL-ben), nem feltétlenül látszik, és a „rossz” rekord frissül.

**Javaslat:** Egyértelművé tenni: vagy csak body-ból, vagy csak URL-ből használjuk az `id`-t, és opcionálisan ellenőrizni, hogy a kettő megegyezik-e; eltérés esetén 400.

---

### 6.2 Adatbázis migráció – `get_weekly_report`

**Probléma:** A payroll oldal a `company_expenses` és `total_expenses` oszlopokat használja. A `get_weekly_report` eredeti (weekly-payment) verziójában nincs `company_expenses`. A céges kártyás rendszer (company-card-system.sql) egy másik `get_weekly_report` definíciót hoz, ami már tartalmazza.

**Javaslat:** Éles és teszt környezetben is ellenőrizni, hogy a ténylegesen futó `get_weekly_report` (pl. a company-card migráció után) adja-e vissza a `company_expenses` (és `total_expenses`) oszlopokat. Ha nem, a payroll összesítések hibásak vagy undefined értékeket kapnak.

---

## Összefoglaló táblázat

| # | Kategória            | Súly (becsült) | Fájl(ok) / terület                          |
|---|----------------------|----------------|---------------------------------------------|
| 1.1 | API – request.json  | Közepes        | Minden admin API route                      |
| 1.2 | Kliens – response.json | Közepes     | admin/page.js, admin/payroll/page.js        |
| 2   | Triple-click nem működik | Magas    | app/admin/page.js                           |
| 3.1 | hourlyRate string   | Közepes        | app/api/admin/update-user/route.js          |
| 3.2 | cutoffDate validáció | Alacsony     | app/api/admin/pay-user/route.js             |
| 3.3 | timesheets PUT enum/típus | Közepes  | app/api/admin/timesheets/route.js           |
| 3.4 | userId UUID          | Alacsony       | app/api/admin/reset-password/route.js       |
| 4.1 | Rate limiting        | Közepes        | create-user, login                          |
| 4.2 | Login hibaüzenet     | Alacsony       | app/login/page.js                           |
| 4.3 | pay-user RPC jog     | Közepes        | app/api/admin/pay-user/route.js             |
| 5.1 | Idő formátum utils   | Közepes        | lib/utils.js                                |
| 6.1 | timesheets id body vs URL | Alacsony  | app/api/admin/timesheets/route.js           |
| 6.2 | get_weekly_report migráció | Közepes   | Adatbázis / payroll frontend                |

---

*Ez a jegyzék csak az összegyűjtött hibákat és kockázatokat tartalmazza; a kódot nem módosítottuk.*
