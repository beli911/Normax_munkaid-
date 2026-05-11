#!/usr/bin/env node
/**
 * Éjszakás műszak (overnight) – szoftverteszt
 * Futtatás: node scripts/test-overnight.mjs
 * A lib/utils.js logikáját teszteli (calculateDuration, validateTimes, isOvernightShift).
 */

function isValidTimeString(s) {
  if (s == null || typeof s !== 'string') return false
  return /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/.test(s.trim())
}

function calculateDuration(startTime, endTime) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return '0 óra'
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  if ([startHours, startMinutes, endHours, endMinutes].some(n => isNaN(n))) return '0 óra'
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  if (totalMinutes < 0) totalMinutes += 24 * 60
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return `${hours} óra`
  return `${hours} óra ${minutes} perc`
}

function calculateHoursDecimal(startTime, endTime) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return '0.00'
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  if ([startHours, startMinutes, endHours, endMinutes].some(n => isNaN(n))) return '0.00'
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  if (totalMinutes < 0) totalMinutes += 24 * 60
  return (totalMinutes / 60).toFixed(2)
}

function validateTimes(startTime, endTime, allowOvernight = false) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return { valid: false, message: 'Érvényes időformátumot adj meg.' }
  }
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const startTotal = startHours * 60 + startMinutes
  const endTotal = endHours * 60 + endMinutes
  if (!allowOvernight && endTotal <= startTotal) {
    return { valid: false, message: 'Távozás > érkezés kell.' }
  }
  return { valid: true }
}

function isOvernightShift(startTime, endTime) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return false
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em) <= (sh * 60 + sm)
}

// --- Tesztek ---
let passed = 0
let failed = 0

function ok(cond, name) {
  if (cond) { passed++; console.log('  ✅', name); return }
  failed++; console.log('  ❌', name)
}

function eq(a, b, name) {
  const ok_ = a === b
  if (ok_) { passed++; console.log('  ✅', name, '→', a); return }
  failed++; console.log('  ❌', name, '→ elvárt:', b, ', kaptam:', a)
}

console.log('\n=== Éjszakás műszak – szoftverteszt ===\n')

// 1. Normál nappali (08:00–16:00)
console.log('1. Normál nappali műszak (08:00 – 16:00)')
eq(calculateDuration('08:00', '16:00'), '8 óra', 'Időtartam 8 óra')
eq(calculateHoursDecimal('08:00', '16:00'), '8.00', 'Tizedes óra 8.00')
ok(validateTimes('08:00', '16:00').valid, 'Validáció OK (nappali)')
ok(!isOvernightShift('08:00', '16:00'), 'Nem éjszakás')

// 2. Éjszakás 16:00–02:00 → 10 óra
console.log('\n2. Éjszakás műszak (16:00 – 02:00)')
eq(calculateDuration('16:00', '02:00'), '10 óra', 'Időtartam 10 óra')
eq(calculateHoursDecimal('16:00', '02:00'), '10.00', 'Tizedes óra 10.00')
ok(isOvernightShift('16:00', '02:00'), 'Éjszakásnak detektálódik')
ok(validateTimes('16:00', '02:00', true).valid, 'Validáció OK (allowOvernight=true)')
ok(!validateTimes('16:00', '02:00', false).valid, 'Validáció elutasít (allowOvernight=false)')

// 3. Éjfél átlépés (23:00 – 01:00)
console.log('\n3. Éjfél átlépés (23:00 – 01:00)')
eq(calculateDuration('23:00', '01:00'), '2 óra', 'Időtartam 2 óra')
eq(calculateHoursDecimal('23:00', '01:00'), '2.00', 'Tizedes 2.00')
ok(isOvernightShift('23:00', '01:00'), 'Éjszakás')

// 4. Perces példa (08:30 – 16:45)
console.log('\n4. Perces (08:30 – 16:45)')
eq(calculateDuration('08:30', '16:45'), '8 óra 15 perc', '8 óra 15 perc')
eq(calculateHoursDecimal('08:30', '16:45'), '8.25', '8.25 óra')

// 5. Invalid input
console.log('\n5. Invalid / üres input')
eq(calculateDuration('', '16:00'), '0 óra', 'Üres start → 0 óra')
eq(calculateDuration('08:00', '25:00'), '0 óra', 'Érvénytelen end → 0 óra')
ok(!validateTimes('08:00', '07:00', false).valid, '07:00 < 08:00 elutasítva (nappali)')
ok(validateTimes('08:00', '07:00', true).valid, '07:00 < 08:00 OK (éjszakás)')

// 6. HH:mm:ss formátum (backend)
console.log('\n6. HH:mm:ss formátum (pl. adatbázis)')
ok(isValidTimeString('16:00:00'), '16:00:00 érvényes')
ok(isOvernightShift('16:00:00', '02:00:00'), 'Éjszakás 16:00:00–02:00:00')
eq(calculateDuration('16:00:00', '02:00:00'), '10 óra', 'Időtartam 10 óra (ss formátum)')

console.log('\n--- Eredmény ---')
console.log('Összesen:', passed + failed, '| Sikeres:', passed, '| Sikertelen:', failed)
if (failed > 0) {
  console.log('\n⚠️  Néhány teszt sikertelen.\n')
  process.exit(1)
}
console.log('\n✅ Minden teszt sikeres. Jöhet a szoftver mentés.\n')
process.exit(0)
