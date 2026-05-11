'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns'
import { hu } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { CheckCircle, LogOut, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import TimesheetForm from './components/TimesheetForm'
import TimesheetList from './components/TimesheetList'
import ThemeToggle from './components/ThemeToggle'
import NewFeaturePopup from './components/NewFeaturePopup'
import { calculateHoursDecimal, normalizeTimeToHHmm } from '@/lib/utils'

function monthSummary(records) {
  let workHours = 0
  const workDates = new Set()
  let holidayDays = 0
  let sickDays = 0
  for (const r of records || []) {
    if (r.entry_type === 'work' && r.start_time && r.end_time) {
      const s = normalizeTimeToHHmm(r.start_time)
      const e = normalizeTimeToHHmm(r.end_time)
      if (s && e) {
        workHours += parseFloat(calculateHoursDecimal(s, e))
        workDates.add(r.work_date)
      }
    } else if (r.entry_type === 'holiday') {
      holidayDays += 1
    } else if (r.entry_type === 'sick_leave') {
      sickDays += 1
    }
  }
  return {
    workHours: Math.round(workHours * 100) / 100,
    workDayCount: workDates.size,
    holidayDays,
    sickDays,
    entryCount: (records || []).length
  }
}

export default function TimeSheetForm() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('')
  const [myRecords, setMyRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [recordsMonth, setRecordsMonth] = useState(() => startOfMonth(new Date()))
  const router = useRouter()

  const monthStartStr = useMemo(() => format(startOfMonth(recordsMonth), 'yyyy-MM-dd'), [recordsMonth])
  const monthEndStr = useMemo(() => format(endOfMonth(recordsMonth), 'yyyy-MM-dd'), [recordsMonth])
  const monthTitle = useMemo(
    () => format(recordsMonth, 'yyyy. MMMM', { locale: hu }),
    [recordsMonth]
  )
  const summary = useMemo(() => monthSummary(myRecords), [myRecords])
  const isViewingCurrentMonth = isSameMonth(recordsMonth, new Date())

  const fetchMyRecords = useCallback(async () => {
    setLoadingRecords(true)
    setMyRecords([])
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingRecords(false)
      return
    }

    const start = format(startOfMonth(recordsMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(recordsMonth), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', user.id)
      .gte('work_date', start)
      .lte('work_date', end)
      .order('work_date', { ascending: false })
      .limit(400)

    if (!error && data) {
      setMyRecords(data)
    } else {
      setMyRecords([])
    }
    setLoadingRecords(false)
  }, [recordsMonth])

  useEffect(() => {
    const checkUser = async () => {
      setInitialLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, full_name')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profil lekérési hiba:', profileError)
        if (profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Felhasználó',
              is_admin: false
            })
          if (insertError) {
            console.error('Profil létrehozási hiba:', insertError)
          }
        }
      }

      if (profile) {
        if (profile.is_admin) setIsAdmin(true)
        if (profile.full_name) setUserName(profile.full_name)
      }

      setInitialLoading(false)
    }
    checkUser()
  }, [router])

  useEffect(() => {
    if (initialLoading) return
    fetchMyRecords()
  }, [initialLoading, fetchMyRecords])

  useEffect(() => {
    const handleTimesheetSaved = () => {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      fetchMyRecords()
    }
    window.addEventListener('timesheet-saved', handleTimesheetSaved)
    return () => window.removeEventListener('timesheet-saved', handleTimesheetSaved)
  }, [fetchMyRecords])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const goPrevMonth = () => setRecordsMonth((d) => subMonths(d, 1))
  const goNextMonth = () => setRecordsMonth((d) => addMonths(d, 1))
  const goCurrentMonth = () => setRecordsMonth(startOfMonth(new Date()))

  const hoursFormatted = summary.workHours.toLocaleString('hu-HU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

  const emptyListMessage = `Nincs bejegyzés ebben a hónapban (${monthTitle}).`

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Betöltés...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <NewFeaturePopup />

      <div className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800/50 p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="font-bold text-gray-800 dark:text-gray-100">Munkaidő</h1>
          {userName && <p className="text-xs text-gray-500 dark:text-gray-400">Üdv, {userName}!</p>}
        </div>
        <div className="flex gap-3 items-center">
          <ThemeToggle />
          {isAdmin && (
            <button onClick={() => router.push('/admin')} className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium text-sm hover:text-blue-700 dark:hover:text-blue-300">
              <Shield size={18} /> Admin
            </button>
          )}
          <button onClick={handleLogout} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Kijelentkezés">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 mt-4">
        <TimesheetForm />
      </div>

      <div className="max-w-lg mx-auto p-4 mt-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 border border-gray-200 dark:border-gray-800 p-4 mb-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Előző hónap"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{monthTitle}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {monthStartStr} – {monthEndStr}
              </p>
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Következő hónap"
            >
              <ChevronRight size={22} />
            </button>
          </div>
          {!isViewingCurrentMonth && (
            <button
              type="button"
              onClick={goCurrentMonth}
              className="w-full mb-3 py-2 text-sm font-medium rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              Ugrás erre a hónapra (aktuális)
            </button>
          )}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 px-3 py-3 text-sm text-gray-800 dark:text-gray-100 space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-gray-600 dark:text-gray-400">Ledolgozott (munkaóra)</span>
              <span className="font-bold tabular-nums">{hoursFormatted} óra</span>
            </div>
            {summary.workDayCount > 0 && (
              <div className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>Munkával töltött napok</span>
                <span className="tabular-nums">{summary.workDayCount}</span>
              </div>
            )}
            {(summary.holidayDays > 0 || summary.sickDays > 0) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                {summary.holidayDays > 0 && <span>Szabadság: {summary.holidayDays} nap</span>}
                {summary.sickDays > 0 && <span>Beteg: {summary.sickDays} nap</span>}
              </div>
            )}
            <div className="text-[11px] text-gray-500 dark:text-gray-500 pt-1">
              {summary.entryCount} bejegyzés ebben a hónapban · csak ez a hónap töltődik be
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={fetchMyRecords}
              disabled={loadingRecords}
              className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline disabled:opacity-50"
            >
              {loadingRecords ? 'Frissítés...' : 'Frissítés'}
            </button>
          </div>
        </div>

        <TimesheetList
          key={monthStartStr}
          timesheets={myRecords}
          loading={loadingRecords}
          onRefresh={fetchMyRecords}
          emptyMessage={emptyListMessage}
        />
      </div>

      {success && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 animate-bounce">
          <div className="bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
            <CheckCircle size={24} />
            <span className="font-bold">Sikeresen mentve!</span>
          </div>
        </div>
      )}
    </div>
  )
}
