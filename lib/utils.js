// Dátum string normálása (YYYY-MM-DD vagy ISO → Date)
function parseDateSafe(dateString) {
  if (!dateString) return null
  const s = String(dateString)
  return new Date(s.includes('T') ? s : s + 'T00:00:00')
}

// Dátum formázás magyarul
export function formatDate(dateString) {
  const date = parseDateSafe(dateString)
  if (!date || isNaN(date.getTime())) return '-'
  const days = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat']
  const months = ['január', 'február', 'március', 'április', 'május', 'június', 
                 'július', 'augusztus', 'szeptember', 'október', 'november', 'december']
  
  return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`
}

// Rövid dátum formátum
export function formatDateShort(dateString) {
  const date = parseDateSafe(dateString)
  if (!date || isNaN(date.getTime())) return '-'
  return `${date.getDate()}. ${date.getMonth() + 1}.`
}

// Hét napja kisbetűvel (pl. hétfő, kedd) – dátum melletti megjelenítéshez
export function getDayOfWeekShort(dateString) {
  const date = parseDateSafe(dateString)
  if (!date || isNaN(date.getTime())) return ''
  const days = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat']
  return days[date.getDay()]
}

// Idő formátum validáció: HH:mm vagy HH:mm:ss (0-23 óra, 0-59 perc)
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
function isValidTimeString(str) {
  return str && typeof str === 'string' && TIME_REGEX.test(str.trim())
}

// Idő mindig HH:mm stringként (timezone nélkül) – Android/backend konzisztenciához
export function normalizeTimeToHHmm(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (!s) return ''
  const match = s.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/)
  if (!match) return ''
  const h = match[1].padStart(2, '0')
  const m = match[2]
  return `${h}:${m}`
}

// Időtartam számítás (órák és percek) – invalid input → "0 óra"
export function calculateDuration(startTime, endTime) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return '0 óra'
  }
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  if ([startHours, startMinutes, endHours, endMinutes].some(n => isNaN(n))) {
    return '0 óra'
  }
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) {
    return `${hours} óra`
  }
  return `${hours} óra ${minutes} perc`
}

// Időtartam tizedes órákban – invalid input → "0.00"
export function calculateHoursDecimal(startTime, endTime) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return '0.00'
  }
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  if ([startHours, startMinutes, endHours, endMinutes].some(n => isNaN(n))) {
    return '0.00'
  }
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60
  }
  return (totalMinutes / 60).toFixed(2)
}

// Validáció: end_time > start_time (vagy allowOvernight esetén bármi); invalid idő → valid: false
export function validateTimes(startTime, endTime, allowOvernight = false) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return {
      valid: false,
      message: 'Érvényes időformátumot adj meg (pl. 08:00 vagy 08:00:00).'
    }
  }
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  if ([startHours, startMinutes, endHours, endMinutes].some(n => isNaN(n))) {
    return {
      valid: false,
      message: 'Érvényes időformátumot adj meg (pl. 08:00 vagy 08:00:00).'
    }
  }
  const startTotal = startHours * 60 + startMinutes
  const endTotal = endHours * 60 + endMinutes
  if (!allowOvernight && endTotal <= startTotal) {
    return {
      valid: false,
      message: 'A távozási időnek későbbinek kell lennie, mint az érkezési időnek! (Éjszakás műszaknál pipáld: „Másnap fejeződik be”.)'
    }
  }
  return { valid: true }
}

// Igaz, ha end < start (éjszakás / másnapra nyúló)
export function isOvernightShift(startTime, endTime) {
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return false
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startM = sh * 60 + sm
  const endM = eh * 60 + em
  return endM <= startM
}

// Excel-kompatibilis CSV exportálás (pontosvesszővel elválasztva, magyar formátum)
// Az eredeti Excel fájl oszlopstruktúráját követi (2020.július/augusztus formátum)
export function exportToCSV(data, filename = 'munkaido-export.csv') {
  if (!data || data.length === 0) {
    alert('Nincs exportálandó adat!')
    return
  }

  // Excel oszlopok az eredeti formátum szerint (A-Z)
  // A: Dátum, B: Kezdés, C: Vége, D: Órák száma, E: Munkaóra, F: Óradíj, G: Munkadíj
  // H: Cím/telephely, I: Berendezés, J: Munka megnevezése
  // K: Felhasznált anyag, L: Egység ár, M: db/kg, N: Ár
  // O: Anyag ár összesen, P: Fizettek, Q: Nem fizettek
  // R: Kp, S: Átutalás, T: Kiadás/anyagvásárlás, U: Ft (kiadás)
  // V: Össz kiadás, W: Bevétel, X: Ft (bevétel), Y: Össz bevétel, Z: Végösszeg
  const headers = [
    'Dátum',           // A
    'Kezdés',          // B
    'Vége',            // C
    'Órák száma',      // D
    'Munkaóra',        // E
    'Óradíj',          // F (Ft/óra)
    'Munkadíj',        // G (Ft)
    'Cím/telephely',   // H
    'Berendezés',      // I
    'Munka megnevezése', // J
    'Felhasznált anyag', // K
    'Egység ár',       // L
    'db/kg',           // M
    'Ár',              // N
    'Anyag ár összesen', // O
    'Fizettek',        // P
    'Nem fizettek',    // Q
    'Kp',              // R
    'Átutalás',        // S
    'Kiadás/anyagvásárlás', // T
    'Ft (kiadás)',     // U
    'Össz kiadás',     // V
    'Bevétel',         // W
    'Ft (bevétel)',    // X
    'Össz bevétel',    // Y
    'Végösszeg'        // Z
  ]
  
  // CSV sorok
  const rows = data.map(record => {
    const hoursDecimal = calculateHoursDecimal(record.start_time, record.end_time)
    const hours = parseFloat(hoursDecimal)
    
    // Dátum formázása magyar formátumban (YYYY.MM.DD)
    const dateParts = record.work_date.split('-')
    const formattedDate = `${dateParts[0]}.${dateParts[1]}.${dateParts[2]}` // YYYY.MM.DD
    
    // Excel idő formátum (0-1 közötti érték, ahol 1 = 24 óra)
    // Pl. 8 óra = 8/24 = 0.3333...
    const excelTime = hours / 24
    
    const hourlyRate = record.profiles?.hourly_rate ?? null
    const munkadij = hourlyRate !== null ? (hours * Number(hourlyRate)).toFixed(0) : ''
    
    // Megjegyzés a J oszlopba (Munka megnevezése)
    const megjegyzes = record.note || ''
    
    return [
      formattedDate,    // A: Dátum
      record.start_time, // B: Kezdés
      record.end_time,   // C: Vége
      excelTime.toFixed(6).replace('.', ','), // D: Órák száma (Excel idő formátum)
      hours.toFixed(2).replace('.', ','),     // E: Munkaóra (órák száma)
      hourlyRate !== null ? String(hourlyRate).replace('.', ',') : '', // F: Óradíj
      munkadij,          // G: Munkadíj
      '',                // H: Cím/telephely
      '',                // I: Berendezés
      megjegyzes,        // J: Munka megnevezése (megjegyzésből)
      '',                // K: Felhasznált anyag
      '',                // L: Egység ár
      '',                // M: db/kg
      '',                // N: Ár
      '',                // O: Anyag ár összesen
      '',                // P: Fizettek
      '',                // Q: Nem fizettek
      '',                // R: Kp
      '',                // S: Átutalás
      '',                // T: Kiadás/anyagvásárlás
      '',                // U: Ft (kiadás)
      '',                // V: Össz kiadás
      '',                // W: Bevétel
      '',                // X: Ft (bevétel)
      '',                // Y: Össz bevétel
      ''                 // Z: Végösszeg (munkadíj + anyag + kiadás - bevétel)
    ]
  })

  // CSV tartalom pontosvesszővel elválasztva (magyar Excel formátum)
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => {
      // Ha a cella tartalmaz pontosvesszőt, idézőjelek közé tesszük
      const cellStr = String(cell || '')
      if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(';'))
  ].join('\n')

  // BOM hozzáadása UTF-8-hoz (magyar karakterek miatt)
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Excel (.xlsx) exportálás - az eredeti Excel fájl formátumát követi
export function exportToExcel(data, filename = 'munkaido-export.xlsx') {
  if (!data || data.length === 0) {
    alert('Nincs exportálandó adat!')
    return
  }

  // Dinamikus import (csak akkor töltődik be, ha szükséges)
  import('xlsx').then(XLSX => {
    // Excel oszlopok az eredeti formátum szerint (A-Z)
    const headers = [
      'Dátum',           // A
      'Kezdés',          // B
      'Vége',            // C
      'Órák száma',      // D
      'Munkaóra',        // E
      'Óradíj',          // F
      'Munkadíj',        // G
      'Cím/telephely',   // H
      'Berendezés',      // I
      'Munka megnevezése', // J
      'Felhasznált anyag', // K
      'Egység ár',       // L
      'db/kg',           // M
      'Ár',              // N
      'Anyag ár összesen', // O
      'Fizettek',        // P
      'Nem fizettek',    // Q
      'Kp',              // R
      'Átutalás',        // S
      'Kiadás/anyagvásárlás', // T
      'Ft (kiadás)',     // U
      'Össz kiadás',     // V
      'Bevétel',         // W
      'Ft (bevétel)',    // X
      'Össz bevétel',    // Y
      'Végösszeg'        // Z
    ]
    
    // Excel sorok
    const rows = data.map(record => {
      const hoursDecimal = calculateHoursDecimal(record.start_time, record.end_time)
      const hours = parseFloat(hoursDecimal)
      const hourlyRate = record.profiles?.hourly_rate ?? null
      const munkadij = hourlyRate !== null ? Number((hours * Number(hourlyRate)).toFixed(2)) : null
      
      // Dátum formázása
      const dateParts = record.work_date.split('-')
      const formattedDate = `${dateParts[0]}.${dateParts[1]}.${dateParts[2]}` // YYYY.MM.DD
      
      // Excel idő formátum (0-1 közötti érték)
      const excelTime = hours / 24
      
      return [
        formattedDate,    // A: Dátum
        record.start_time, // B: Kezdés
        record.end_time,   // C: Vége
        excelTime,         // D: Órák száma (Excel idő)
        hours,             // E: Munkaóra
        hourlyRate !== null ? Number(hourlyRate) : null, // F: Óradíj
        munkadij,          // G: Munkadíj
        '',                // H: Cím/telephely
        '',                // I: Berendezés
        record.note || '', // J: Munka megnevezése
        '',                // K: Felhasznált anyag
        null,              // L: Egység ár
        null,              // M: db/kg
        null,              // N: Ár
        null,              // O: Anyag ár összesen
        '',                // P: Fizettek
        '',                // Q: Nem fizettek
        null,              // R: Kp
        null,              // S: Átutalás
        '',                // T: Kiadás/anyagvásárlás
        null,              // U: Ft (kiadás)
        null,              // V: Össz kiadás
        '',                // W: Bevétel
        null,              // X: Ft (bevétel)
        null,              // Y: Össz bevétel
        null               // Z: Végösszeg
      ]
    })

    // Munkafüzet létrehozása
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    
    // Oszlop szélességek beállítása (az eredeti Excel szerint)
    worksheet['!cols'] = [
      { wch: 12 }, // A: Dátum
      { wch: 10 }, // B: Kezdés
      { wch: 10 }, // C: Vége
      { wch: 12 }, // D: Órák száma
      { wch: 12 }, // E: Munkaóra
      { wch: 10 }, // F: Óradíj
      { wch: 12 }, // G: Munkadíj
      { wch: 20 }, // H: Cím/telephely
      { wch: 15 }, // I: Berendezés
      { wch: 25 }, // J: Munka megnevezése
      { wch: 20 }, // K: Felhasznált anyag
      { wch: 12 }, // L: Egység ár
      { wch: 10 }, // M: db/kg
      { wch: 12 }, // N: Ár
      { wch: 15 }, // O: Anyag ár összesen
      { wch: 10 }, // P: Fizettek
      { wch: 12 }, // Q: Nem fizettek
      { wch: 10 }, // R: Kp
      { wch: 12 }, // S: Átutalás
      { wch: 20 }, // T: Kiadás/anyagvásárlás
      { wch: 12 }, // U: Ft (kiadás)
      { wch: 12 }, // V: Össz kiadás
      { wch: 15 }, // W: Bevétel
      { wch: 12 }, // X: Ft (bevétel)
      { wch: 12 }, // Y: Össz bevétel
      { wch: 12 }  // Z: Végösszeg
    ]

    // Munkafüzet létrehozása
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Munkaidő')

    // Fájl letöltése
    XLSX.writeFile(workbook, filename)
  }).catch(error => {
    console.error('Excel export hiba:', error)
    alert('Hiba történt az Excel export során. Próbáld meg a CSV exportot!')
  })
}

// Teljes mentés - JSON formátumban (backup célra)
export function exportToJSON(data, filename = 'munkaido-teljes-mentes.json') {
  if (!data || data.length === 0) {
    alert('Nincs exportálandó adat!')
    return
  }

  // Teljes adatstruktúra JSON formátumban
  const exportData = {
    export_date: new Date().toISOString(),
    version: '1.0',
    total_records: data.length,
    records: data.map(record => {
      const hoursDecimal = calculateHoursDecimal(record.start_time, record.end_time)
      const hours = parseFloat(hoursDecimal)
      
      return {
        id: record.id,
        user_id: record.user_id,
        employee: {
          full_name: record.profiles?.full_name || 'Névtelen',
          email: record.profiles?.email || '',
          hourly_rate: record.profiles?.hourly_rate ?? null
        },
        work_date: record.work_date,
        start_time: record.start_time,
        end_time: record.end_time,
        hours: hours,
        hours_decimal: hoursDecimal,
        duration: calculateDuration(record.start_time, record.end_time),
        note: record.note || '',
        created_at: record.created_at
      }
    })
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Teljes Excel export - minden adattal, több munkalappal
export function exportFullExcel(data, employees = [], filename = 'munkaido-teljes-export.xlsx') {
  if (!data || data.length === 0) {
    alert('Nincs exportálandó adat!')
    return
  }

  import('xlsx').then(XLSX => {
    const workbook = XLSX.utils.book_new()

    // 1. MUNKAIDŐ LAP - Részletes adatok az eredeti Excel formátumban
    const headers = [
      'Dátum', 'Kezdés', 'Vége', 'Órák száma', 'Munkaóra', 'Óradíj', 'Munkadíj',
      'Cím/telephely', 'Berendezés', 'Munka megnevezése',
      'Felhasznált anyag', 'Egység ár', 'db/kg', 'Ár',
      'Anyag ár összesen', 'Fizettek', 'Nem fizettek',
      'Kp', 'Átutalás', 'Kiadás/anyagvásárlás', 'Ft (kiadás)',
      'Össz kiadás', 'Bevétel', 'Ft (bevétel)', 'Össz bevétel', 'Végösszeg'
    ]

    const rows = data.map(record => {
      const hoursDecimal = calculateHoursDecimal(record.start_time, record.end_time)
      const hours = parseFloat(hoursDecimal)
      const hourlyRate = record.profiles?.hourly_rate ?? null
      const munkadij = hourlyRate !== null ? Number((hours * Number(hourlyRate)).toFixed(2)) : null
      const dateParts = record.work_date.split('-')
      const formattedDate = `${dateParts[0]}.${dateParts[1]}.${dateParts[2]}`
      const excelTime = hours / 24

      return [
        formattedDate,
        record.start_time,
        record.end_time,
        excelTime,
        hours,
        hourlyRate !== null ? Number(hourlyRate) : null, // Óradíj
        munkadij, // Munkadíj
        '', // Cím/telephely
        '', // Berendezés
        record.note || '', // Munka megnevezése
        '', '', '', '', // Anyag oszlopok
        null, // Anyag ár összesen
        '', '', // Fizettek/Nem fizettek
        null, null, // Kp, Átutalás
        '', null, // Kiadás
        null, // Össz kiadás
        '', null, // Bevétel
        null, // Össz bevétel
        null // Végösszeg
      ]
    })

    const worksheet1 = XLSX.utils.aoa_to_sheet([headers, ...rows])
    worksheet1['!cols'] = Array(26).fill(null).map(() => ({ wch: 12 }))
    XLSX.utils.book_append_sheet(workbook, worksheet1, 'Munkaidő')

    // 2. ÖSSZESÍTŐ LAP - Statisztikák dolgozónként
    const summaryHeaders = ['Munkavállaló', 'Email', 'Összes nap', 'Összes óra', 'Átlagos óra/nap']
    const employeeStats = {}

    data.forEach(record => {
      const empId = record.user_id
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          name: record.profiles?.full_name || 'Névtelen',
          email: record.profiles?.email || '',
          days: new Set(),
          totalHours: 0
        }
      }
      employeeStats[empId].days.add(record.work_date)
      employeeStats[empId].totalHours += parseFloat(calculateHoursDecimal(record.start_time, record.end_time))
    })

    const summaryRows = Object.values(employeeStats).map(stat => [
      stat.name,
      stat.email,
      stat.days.size,
      stat.totalHours.toFixed(2).replace('.', ','),
      (stat.totalHours / stat.days.size).toFixed(2).replace('.', ',')
    ])

    const worksheet2 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows])
    worksheet2['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'Összesítő')

    // 3. NAPI BONTÁSBAN LAP - Dátum szerint csoportosítva
    const dailyHeaders = ['Dátum', 'Munkavállaló', 'Kezdés', 'Vége', 'Órák', 'Megjegyzés']
    const dailyData = {}
    
    data.forEach(record => {
      const date = record.work_date
      if (!dailyData[date]) {
        dailyData[date] = []
      }
      dailyData[date].push([
        record.work_date,
        record.profiles?.full_name || 'Névtelen',
        record.start_time,
        record.end_time,
        calculateHoursDecimal(record.start_time, record.end_time).replace('.', ','),
        record.note || ''
      ])
    })

    const dailyRows = Object.keys(dailyData).sort().flatMap(date => dailyData[date])
    const worksheet3 = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows])
    worksheet3['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(workbook, worksheet3, 'Napi bontás')

    XLSX.writeFile(workbook, filename)
  }).catch(error => {
    console.error('Teljes Excel export hiba:', error)
    alert('Hiba történt a teljes export során!')
  })
}


