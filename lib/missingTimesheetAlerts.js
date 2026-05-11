import { addDays, differenceInCalendarDays, startOfDay, parseISO } from 'date-fns'

function parseLocalWorkDate(ymd) {
  if (!ymd || typeof ymd !== 'string') return null
  const p = ymd.split('-').map(Number)
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null
  const [y, mo, d] = p
  const dt = new Date(y, mo - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/**
 * Határidő: a work_date napja + a következő nap (másnap) végéig lehet rögzíteni.
 * Ha a mentés (created_at) naptára a 3. naptól esik, „későn rögzítve”.
 *
 * Nem jelez „hiányzó napot”: szabadnapon nincs rögzítés, az nem hiba.
 *
 * @returns {number} 0 ha időben, egyébként hány nappal a határidő után lett rögzítve (1-től)
 */
export function getRecordingDelayDays(workDateYmd, createdAtIso) {
  const workLocal = parseLocalWorkDate(workDateYmd)
  if (!workLocal || !createdAtIso) return 0
  let created
  try {
    created = parseISO(String(createdAtIso))
  } catch {
    return 0
  }
  if (Number.isNaN(created.getTime())) return 0

  const recordedDay = startOfDay(created)
  const firstOverdue = startOfDay(addDays(workLocal, 2))
  if (recordedDay < firstOverdue) return 0
  return differenceInCalendarDays(recordedDay, firstOverdue) + 1
}
