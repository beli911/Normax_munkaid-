'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, X, TrendingUp, Users, Clock, DollarSign, Calendar, Search, UserPlus, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatDateShort, getDayOfWeekShort, calculateDuration, calculateHoursDecimal, exportToCSV, exportToExcel, exportToJSON, exportFullExcel, isOvernightShift } from '@/lib/utils'
import { getRecordingDelayDays } from '@/lib/missingTimesheetAlerts'
import ThemeToggle from '../components/ThemeToggle'

export default function AdminDashboard() {
  const [records, setRecords] = useState([])
  const [filteredRecords, setFilteredRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')
  const [employees, setEmployees] = useState([])
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [editFullName, setEditFullName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editHourlyRate, setEditHourlyRate] = useState('')
  const [updatingEmployee, setUpdatingEmployee] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [secretEditRecord, setSecretEditRecord] = useState(null)
  const [secretEditData, setSecretEditData] = useState({})
  const [secretEditLoading, setSecretEditLoading] = useState(false)
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [modificationRequests, setModificationRequests] = useState([])
  const [modificationLoading, setModificationLoading] = useState(false)
  const [dismissIssueBanner, setDismissIssueBanner] = useState(false)
  const clickTimers = useRef({})
  const router = useRouter()
  const adminWarnAlertSent = useRef(false)

  const lateRecordingStats = useMemo(() => {
    let count = 0
    for (const r of records) {
      if (getRecordingDelayDays(r.work_date, r.created_at) > 0) count += 1
    }
    return count
  }, [records])

  useEffect(() => {
    if (loading) return
    if (adminWarnAlertSent.current) return
    if (lateRecordingStats === 0) return
    const key = 'admin_munkaido_session_warn'
    try {
      if (sessionStorage.getItem(key)) {
        adminWarnAlertSent.current = true
        return
      }
      sessionStorage.setItem(key, '1')
    } catch {
      /* private mode */
    }
    adminWarnAlertSent.current = true
    alert(
      `Figyelem – munkaidő\n\n${lateRecordingStats} bejegyzés a megengedett „másnapig” határidőn túl lett rögzítve.\n\nA táblázatban a dátum mellett ⚠ és „X nap későn rögzítve” látható. Üres napokra (nem dolgoztak) nem jelez a rendszer.`
    )
  }, [loading, lateRecordingStats])

  const toLoginUsername = (value) => {
    if (!value) return ''
    const normalized = value.toLowerCase().trim()
    return normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9@._-]/g, '')
      .split('@')[0]
  }

  useEffect(() => {
    const fetchAdminData = async () => {
      // 1. Jogosultság ellenőrzés
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 2. Admin jogosultság ellenőrzése
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        alert('Nincs jogosultságod az admin felület megtekintéséhez.')
        router.push('/')
        setLoading(false)
        return
      }

      // 3. Dolgozók lekérése
      // Először próbáljuk hourly_rate-dal, ha nincs oszlop, akkor nélküle
      let profiles, profilesError
      
      const { data: dataWithRate, error: errorWithRate } = await supabase
        .from('profiles')
        .select('id, full_name, email, hourly_rate')
        .order('full_name', { ascending: true })

      if (errorWithRate && errorWithRate.message?.includes('hourly_rate')) {
        // Ha nincs hourly_rate oszlop, próbáljuk nélküle
        console.warn('hourly_rate oszlop nincs, lekérjük nélküle')
        const { data: dataWithoutRate, error: errorWithoutRate } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true })
        profiles = dataWithoutRate
        profilesError = errorWithoutRate
      } else {
        profiles = dataWithRate
        profilesError = errorWithRate
      }

      if (profilesError) {
        console.error('Hiba a profilok lekérésekor:', profilesError)
        alert('Hiba a profilok lekérésekor: ' + profilesError.message + '\n\nFuttasd le az add-hourly-rate.sql fájlt a Supabase SQL Editor-ban!')
      } else {
        setEmployees(profiles || [])
      }

      // 4. Adatok lekérése összekötve a profilokkal
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          profiles (full_name, email, hourly_rate)
        `)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Hiba:', error)
        alert('Hiba történt az adatok lekérése során: ' + error.message)
      } else {
        setRecords(data || [])
        setFilteredRecords(data || [])
      }

      // Jóváhagyandó módosítási kérelmek
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (token) {
        try {
          const modRes = await fetch('/api/admin/modification-requests', {
            headers: { Authorization: `Bearer ${token}` }
          })
          const modPayload = await modRes.json().catch(() => ({}))
          if (modRes.ok && Array.isArray(modPayload.data)) {
            setModificationRequests(modPayload.data)
          }
        } catch (e) {
          console.error('Modification requests fetch:', e)
        }
      }
      setLoading(false)
    }
    fetchAdminData()
  }, [router])

  useEffect(() => {
    let filtered = records

    if (dateFilter) {
      filtered = filtered.filter(record => record.work_date === dateFilter)
    }

    if (employeeSearchTerm) {
      const searchLower = employeeSearchTerm.toLowerCase()
      filtered = filtered.filter(record => {
        const fullName = record.profiles?.full_name || ''
        const email = record.profiles?.email || ''
        return fullName.toLowerCase().includes(searchLower) || 
               email.toLowerCase().includes(searchLower)
      })
    } else if (employeeFilter) {
      filtered = filtered.filter(record => record.user_id === employeeFilter)
    }

    setFilteredRecords(filtered)
  }, [dateFilter, employeeFilter, employeeSearchTerm, records])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreatingUser(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        alert('Nincs aktív munkamenet. Jelentkezz be újra.')
        setCreatingUser(false)
        return
      }

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: newFullName
        })
      })

      let payload
      try {
        payload = await response.json()
      } catch {
        alert('Szerverhiba. Probald ujra kesobb.')
        setCreatingUser(false)
        return
      }
      if (!response.ok) {
        alert(payload?.error || 'Nem sikerult letrehozni a felhasznalot.')
        setCreatingUser(false)
        return
      }

      const loginHint = payload?.loginUsername
        ? `\nBejelentkezesi nev: ${payload.loginUsername}`
        : ''
      alert(`Felhasznalo letrehozva: ${payload.email}${loginHint}`)
      setNewUsername('')
      setNewPassword('')
      setNewFullName('')
      setShowNewUserForm(false)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, hourly_rate')
        .order('full_name', { ascending: true })

      setEmployees(profiles || [])
    } catch (error) {
      console.error('Hiba felhasznalo letrehozasakor:', error)
      alert('Hiba tortent a felhasznalo letrehozasa soran.')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee)
    setEditFullName(employee?.full_name || '')
    const emailPart = employee?.email ? employee.email.split('@')[0] : ''
    setEditUsername(emailPart)
    setEditPassword('')
    setEditHourlyRate(
      employee?.hourly_rate !== null && employee?.hourly_rate !== undefined
        ? String(employee.hourly_rate)
        : ''
    )
  }

  const handleUpdateEmployee = async (e) => {
    e.preventDefault()
    if (!selectedEmployee) {
      alert('Valassz ki egy dolgozot a szerkeszteshez.')
      return
    }

    const hourlyRateValue = editHourlyRate === '' ? null : Number(editHourlyRate.replace(',', '.'))
    if (editHourlyRate !== '' && (Number.isNaN(hourlyRateValue) || hourlyRateValue < 0)) {
      alert('Az oradij legyen ervenyes szam.')
      return
    }

    if (editPassword && editPassword.length < 6) {
      alert('A jelszonak legalabb 6 karakter hosszunak kell lennie.')
      return
    }

    setUpdatingEmployee(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        alert('Nincs aktív munkamenet. Jelentkezz be újra.')
        setUpdatingEmployee(false)
        return
      }

      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: selectedEmployee.id,
          fullName: editFullName,
          username: editUsername,
          password: editPassword,
          hourlyRate: hourlyRateValue
        })
      })

      let payload
      try {
        payload = await response.json()
      } catch {
        alert('Szerverhiba. Probald ujra kesobb.')
        setUpdatingEmployee(false)
        return
      }
      if (!response.ok) {
        alert(payload?.error || 'Nem sikerult a profil frissitese.')
        setUpdatingEmployee(false)
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, hourly_rate')
        .order('full_name', { ascending: true })

      setEmployees(profiles || [])
      const updated = (profiles || []).find(emp => emp.id === selectedEmployee.id)
      setSelectedEmployee(updated || null)
      if (updated) {
        const updatedUsername = updated.email ? updated.email.split('@')[0] : ''
        setEditUsername(updatedUsername)
      }
      setEditPassword('')
      alert('Profil frissitve.')
    } catch (error) {
      console.error('Hiba profil frissiteskor:', error)
      alert('Hiba tortent a profil frissitesekor.')
    } finally {
      setUpdatingEmployee(false)
    }
  }


  const calculateStats = () => {
    if (filteredRecords.length === 0) {
      return {
        totalRecords: 0,
        totalHours: 0,
        uniqueUsers: 0,
        avgHoursPerDay: 0
      }
    }

    const uniqueUsers = new Set(filteredRecords.map(r => r.user_id)).size
    const totalHours = filteredRecords.reduce((sum, record) => {
      return sum + parseFloat(calculateHoursDecimal(record.start_time, record.end_time))
    }, 0)

    const uniqueDates = new Set(filteredRecords.map(r => r.work_date)).size
    const avgHoursPerDay = uniqueDates > 0 ? totalHours / uniqueDates : 0

    return {
      totalRecords: filteredRecords.length,
      totalHours: totalHours.toFixed(2),
      uniqueUsers,
      avgHoursPerDay: avgHoursPerDay.toFixed(2)
    }
  }

  const stats = calculateStats()

  const handleExportCSV = () => {
    exportToCSV(filteredRecords, `munkaido-export-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleExportExcel = () => {
    exportToExcel(filteredRecords, `munkaido-export-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleFullExport = () => {
    exportFullExcel(records, employees, `munkaido-teljes-export-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleJSONExport = () => {
    exportToJSON(records, `munkaido-teljes-mentes-${new Date().toISOString().split('T')[0]}.json`)
  }

  // Triple-click detektálás - Titkos szerkesztő aktiválás (useRef: nem törlődik re-renderkor)
  const handleTripleClick = (record, e) => {
    const recordId = record.id
    const now = Date.now()
    const ref = clickTimers.current

    if (!ref[recordId]) {
      ref[recordId] = { count: 0, lastClick: 0 }
    }

    const timer = ref[recordId]

    if (now - timer.lastClick < 500) {
      timer.count++
    } else {
      timer.count = 1
    }

    timer.lastClick = now

    if (timer.count >= 3) {
      setSecretEditRecord(record)
      setSecretEditData({
        work_date: record.work_date || '',
        entry_type: record.entry_type || 'work',
        start_time: record.start_time || '',
        end_time: record.end_time || '',
        note: record.note || '',
        expense_amount: record.expense_amount || 0,
        expense_note: record.expense_note || '',
        is_company_card: record.is_company_card || false,
        status: record.status || 'pending'
      })
      timer.count = 0
      e.stopPropagation()
    }
  }

  // Titkos szerkesztő bezárása
  const handleCloseSecretEdit = () => {
    setSecretEditRecord(null)
    setSecretEditData({})
  }

  // Titkos szerkesztő mentés
  const handleSaveSecretEdit = async () => {
    if (!secretEditRecord) return
    
    setSecretEditLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        alert('Nincs aktív munkamenet. Jelentkezz be újra.')
        setSecretEditLoading(false)
        return
      }

      const recordId = String(secretEditRecord.id)
      const response = await fetch(`/api/admin/timesheets?id=${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          id: recordId,
          ...secretEditData
        })
      })

      let payload
      try {
        payload = await response.json()
      } catch {
        alert('Szerverhiba. Probald ujra kesobb.')
        setSecretEditLoading(false)
        return
      }
      if (!response.ok) {
        alert(payload?.error || 'Nem sikerult a frissites.')
        setSecretEditLoading(false)
        return
      }

      // Frissítjük a listát
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          profiles (full_name, email, hourly_rate)
        `)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Hiba:', error)
      } else {
        setRecords(data || [])
        setFilteredRecords(data || [])
      }

      handleCloseSecretEdit()
      alert('✅ Bejegyzés sikeresen frissítve!')
    } catch (error) {
      console.error('Hiba a frissiteskor:', error)
      alert('Hiba történt a frissites soran.')
    } finally {
      setSecretEditLoading(false)
    }
  }

  // Titkos szerkesztő törlés
  const fetchModificationRequests = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return
    setModificationLoading(true)
    try {
      const res = await fetch('/api/admin/modification-requests', { headers: { Authorization: `Bearer ${token}` } })
      const payload = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(payload.data)) setModificationRequests(payload.data)
    } finally {
      setModificationLoading(false)
    }
  }

  const handleModificationReview = async (requestId, action) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return
    try {
      const res = await fetch('/api/admin/modification-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: requestId, action })
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload?.error || 'Hiba történt.')
        return
      }
      await fetchModificationRequests()
      if (action === 'approve') {
        const { data } = await supabase.from('timesheets').select('*, profiles (full_name, email, hourly_rate)').order('work_date', { ascending: false }).order('created_at', { ascending: false })
        if (data) {
          setRecords(data)
          setFilteredRecords(data)
        }
      }
      alert(action === 'approve' ? '✅ Elfogadva.' : 'Elutasítva.')
    } catch (e) {
      console.error(e)
      alert('Hiba történt.')
    }
  }

  const handleDeleteSecretEdit = async () => {
    if (!secretEditRecord) return
    
    if (!confirm(`⚠️ VÉGLEGESEN törölni szeretnéd ezt a bejegyzést?\n\nDátum: ${secretEditRecord.work_date}\nMunkavállaló: ${secretEditRecord.profiles?.full_name || 'Névtelen'}\n\nEz a művelet nem visszavonható!`)) {
      return
    }

    setSecretEditLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        alert('Nincs aktív munkamenet. Jelentkezz be újra.')
        setSecretEditLoading(false)
        return
      }

      const response = await fetch(`/api/admin/timesheets?id=${secretEditRecord.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      let payload
      try {
        payload = await response.json()
      } catch {
        alert('Szerverhiba. Probald ujra kesobb.')
        setSecretEditLoading(false)
        return
      }
      if (!response.ok) {
        alert(payload?.error || 'Nem sikerult a torles.')
        setSecretEditLoading(false)
        return
      }

      // Frissítjük a listát
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          profiles (full_name, email, hourly_rate)
        `)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Hiba:', error)
      } else {
        setRecords(data || [])
        setFilteredRecords(data || [])
      }

      handleCloseSecretEdit()
      alert('✅ Bejegyzés sikeresen törölve!')
    } catch (error) {
      console.error('Hiba a torleskor:', error)
      alert('Hiba történt a torles soran.')
    } finally {
      setSecretEditLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Betöltés...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => router.push('/')} className="p-3 bg-white dark:bg-gray-900 rounded-full shadow dark:shadow-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 shrink-0">
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              {lateRecordingStats > 0 && (
                <span className="relative shrink-0" title={`${lateRecordingStats} sor: határidőn túl rögzítve`}>
                  <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400 md:h-9 md:w-9" aria-hidden />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {lateRecordingStats > 99 ? '99+' : lateRecordingStats}
                  </span>
                </span>
              )}
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                Adminisztrációs Áttekintés
              </h1>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <ThemeToggle />
            <button
              onClick={() => router.push('/admin/payroll')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              <DollarSign size={18} />
              Pénzügyi Elszámolás
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
              title="CSV exportálás (Excel-kompatibilis)"
            >
              <Download size={18} />
              <span className="hidden md:inline">CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              title="Excel exportálás (.xlsx)"
            >
              <Download size={18} />
              <span className="hidden md:inline">Excel</span>
            </button>
            <button
              onClick={handleFullExport}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
              title="Teljes Excel export (több munkalappal)"
            >
              <Download size={18} />
              <span className="hidden md:inline">Teljes Excel</span>
            </button>
            <button
              onClick={handleJSONExport}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-medium"
              title="JSON backup (teljes mentés)"
            >
              <Download size={18} />
              <span className="hidden md:inline">JSON Backup</span>
            </button>
          </div>
        </div>

        {lateRecordingStats > 0 && !dismissIssueBanner && (
          <div
            className="mb-6 rounded-xl border border-amber-400 bg-amber-50 p-4 shadow-sm dark:border-amber-600 dark:bg-amber-950/50"
            role="alert"
          >
            <div className="flex justify-between gap-2 border-b border-amber-200 pb-2 dark:border-amber-800">
              <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">
                Későn rögzített bejegyzések
              </h2>
              <button
                type="button"
                onClick={() => setDismissIssueBanner(true)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-amber-900 hover:bg-amber-200/60 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Elrejtés
              </button>
            </div>
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-100/90">
              Csak olyan soroknál jelez a rendszer, ahol van bejegyzés, de a mentés a megengedett „nap + másnap” határidőn túl történt. Ha valaki nem dolgozott és nincs rögzítés, azt nem listázzuk.
            </p>
            <p className="mt-2 text-sm font-medium text-amber-950 dark:text-amber-50">
              Érintett sorok száma: <strong>{lateRecordingStats}</strong> — részletek a táblázat dátum oszlopában (⚠).
            </p>
          </div>
        )}

        {/* Jóváhagyandó módosítások */}
        {modificationRequests.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              ✏️ Jóváhagyandó módosítások
            </h2>
            {modificationLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Betöltés...</p>
            ) : (
              <div className="space-y-4">
                {modificationRequests.map((req) => {
                  const ts = Array.isArray(req.timesheets) ? req.timesheets[0] || {} : req.timesheets || {}
                  const profile = ts.profiles || {}
                  const oldEntry = ts.entry_type || '-'
                  const oldStart = ts.start_time ?? '-'
                  const oldEnd = ts.end_time ?? '-'
                  const oldNote = (ts.note || '').slice(0, 80) + ((ts.note || '').length > 80 ? '…' : '')
                  const newEntry = req.new_entry_type ?? oldEntry
                  const newStart = req.new_start_time ?? oldStart
                  const newEnd = req.new_end_time ?? oldEnd
                  const newNote = (req.new_note ?? '').slice(0, 80) + ((req.new_note || '').length > 80 ? '…' : '')
                  const entryLabel = (v) => (v === 'work' ? 'Munka' : v === 'holiday' ? 'Szabadság' : v === 'sick_leave' ? 'Betegszabadság' : v)
                  return (
                    <div key={req.id} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{profile.full_name || profile.email || 'Névtelen'}</span>
                        <span className="text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{ts.work_date}</span>
                      </div>
                      <div className="text-sm space-y-1 mb-3">
                        {(oldEntry !== newEntry || oldStart !== newStart || oldEnd !== newEnd) && (
                          <p className="text-gray-700 dark:text-gray-300">
                            Típus: <span className="line-through">{entryLabel(oldEntry)}</span> ➔ <strong>{entryLabel(newEntry)}</strong>
                            {oldStart !== newStart && (
                              <> · Kezdés: <span className="line-through">{oldStart}</span> ➔ <strong>{newStart}</strong></>
                            )}
                            {oldEnd !== newEnd && (
                              <> · Vége: <span className="line-through">{oldEnd}</span> ➔ <strong>{newEnd}</strong></>
                            )}
                          </p>
                        )}
                        {(oldNote !== newNote || (req.new_note != null && req.new_note !== '')) && (
                          <p className="text-gray-600 dark:text-gray-400">
                            Megjegyzés: <span className="line-through">{oldNote || '–'}</span> ➔ <strong>{newNote || '–'}</strong>
                          </p>
                        )}
                        {oldEntry === newEntry && oldStart === newStart && oldEnd === newEnd && (!req.new_note || req.new_note === (ts.note || '')) && (
                          <p className="text-gray-500 dark:text-gray-400">Nincs megjeleníthető változás (csak jóváhagyás/elutasítás).</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleModificationReview(req.id, 'approve')}
                          className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm font-medium"
                        >
                          ✅ Elfogadás
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModificationReview(req.id, 'reject')}
                          className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 text-sm font-medium"
                        >
                          ❌ Elutasítás
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Statisztikák */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Összes rögzítés</span>
                <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalRecords}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Összes óra</span>
                <Clock size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalHours}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Munkavállalók</span>
                <Users size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.uniqueUsers}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Átlagos óra/nap</span>
                <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.avgHoursPerDay}</div>
            </div>
          </div>
        )}


        {/* Alkalmazott lista és szerkesztés */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-6 mb-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Alkalmazottak</h2>
            <button
              onClick={() => {
                setShowNewUserForm(true)
                setNewUsername('')
                setNewPassword('')
                setNewFullName('')
                setSelectedEmployee(null)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-sm font-medium"
            >
              <UserPlus size={18} />
              Új alkalmazott
            </button>
          </div>
          
          {/* Alkalmazottak Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {employees.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400">
                <Users size={48} className="mx-auto mb-2 opacity-50" />
                <p>Nincs alkalmazott.</p>
              </div>
            ) : (
              employees.map(employee => {
                const initials = (employee.full_name || employee.email || '??')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                
                const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-indigo-600']
                const colorIndex = employee.id ? parseInt(employee.id.slice(0, 2), 16) % colors.length : 0
                const avatarColor = colors[colorIndex]
                
                return (
                  <button
                    key={employee.id}
                    onClick={() => handleSelectEmployee(employee)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedEmployee?.id === employee.id
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`${avatarColor} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                        {initials}
                      </div>
                      
                      {/* Adatok */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                          {employee.full_name || employee.email || 'Névtelen'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {employee.email}
                        </div>
                        {employee.hourly_rate && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                            {parseFloat(employee.hourly_rate).toLocaleString('hu-HU')} Ft/óra
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          
          {/* Szerkesztő Panel */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            {selectedEmployee ? (
              <div>
                <h3 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-4">
                  Szerkesztés: {selectedEmployee.full_name || selectedEmployee.email}
                </h3>
                <form onSubmit={handleUpdateEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teljes név</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Felhasználónév</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">A felhasználónév változtatása a belépési címet is módosítja.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Óradíj (Ft/óra)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editHourlyRate}
                      onChange={(e) => setEditHourlyRate(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="pl. 1500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Új jelszó</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Legalabb 6 karakter"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={updatingEmployee}
                      className="bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 dark:hover:bg-green-600 transition disabled:opacity-50"
                    >
                      {updatingEmployee ? 'Mentés...' : '💾 Mentés'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(null)}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Mégse
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Válassz ki egy alkalmazottat a szerkesztéshez</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Új alkalmazott hozzáadása (Collapsible) */}
        {showNewUserForm && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 p-6 mb-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <UserPlus size={20} />
                Új alkalmazott hozzáadása
              </h2>
              <button
                onClick={() => {
                  setShowNewUserForm(false)
                  setNewUsername('')
                  setNewPassword('')
                  setNewFullName('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                disabled={creatingUser}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Felhasználónév</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="pl. kovacs.janos"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Bejelentkezési név: {toLoginUsername(newUsername) || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jelszó</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teljes név (opcionális)</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="pl. Kovacs Janos"
                />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {creatingUser ? 'Létrehozás...' : '✅ Alkalmazott létrehozása'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewUsername('')
                    setNewPassword('')
                    setNewFullName('')
                  }}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Szűrő Toolbar */}
        <div className="bg-gray-900 dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-800/50 p-4 mb-6 border border-gray-800 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Dátum mező ikonnal */}
            <div className="relative flex-1">
              <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 rounded-lg text-gray-100 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            
            {/* Kereső mező ikonnal */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Keresés név vagy email alapján..."
                value={employeeSearchTerm}
                onChange={(e) => {
                  setEmployeeSearchTerm(e.target.value)
                  setEmployeeFilter('') // Töröljük a select filtert, ha keresünk
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 rounded-lg text-gray-100 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Akció gombok */}
            <div className="flex gap-2">
              {(dateFilter || employeeFilter || employeeSearchTerm) && (
                <button
                  onClick={() => {
                    setDateFilter('')
                    setEmployeeFilter('')
                    setEmployeeSearchTerm('')
                  }}
                  className="flex items-center gap-1 px-4 py-2.5 bg-gray-700 dark:bg-gray-700 text-gray-200 dark:text-gray-300 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-600 transition text-sm font-medium"
                >
                  <X size={16} />
                  Törlés
                </button>
              )}
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2.5 bg-gray-700 dark:bg-gray-700 text-gray-200 dark:text-gray-300 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-600 transition text-sm font-medium"
              >
                {showStats ? '📊 Elrejt' : '📊 Mutat'}
              </button>
            </div>
          </div>
        </div>

        
        {/* Táblázat */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-800/50 overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 uppercase text-xs font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 md:px-6 py-4 text-gray-600 dark:text-gray-200">Dátum</th>
                  <th className="px-4 md:px-6 py-4 text-gray-600 dark:text-gray-200">Munkavállaló</th>
                  <th className="px-4 md:px-6 py-4 text-gray-600 dark:text-gray-200 hidden md:table-cell">Email</th>
                  <th className="px-4 md:px-6 py-4 text-center text-gray-600 dark:text-gray-200">Időtartam</th>
                  <th className="px-4 md:px-6 py-4 text-center text-gray-600 dark:text-gray-200">Óra</th>
                  <th className="px-4 md:px-6 py-4 text-gray-600 dark:text-gray-200">Megjegyzés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-200 dark:border-gray-800">
                    <td 
                      className="px-4 md:px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={(e) => handleTripleClick(record, e)}
                      title="🕵️ 3x kattintás a szerkesztéshez"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
                        <span>
                          {formatDateShort(record.work_date)}{' '}
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {getDayOfWeekShort(record.work_date)}
                          </span>
                        </span>
                        {(() => {
                          const delayDays = getRecordingDelayDays(record.work_date, record.created_at)
                          if (delayDays <= 0) return null
                          let createdStr = ''
                          try {
                            const cd = parseISO(String(record.created_at))
                            if (!Number.isNaN(cd.getTime())) createdStr = format(cd, 'yyyy.MM.dd. HH:mm')
                          } catch { /* ignore */ }
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400"
                              title={
                                createdStr
                                  ? `A megengedett határidőn túl rögzítve. Mentés ideje: ${createdStr}`
                                  : 'A megengedett határidőn túl rögzítve (nap + másnap után).'
                              }
                            >
                              <AlertTriangle size={18} className="shrink-0" aria-hidden />
                              <span className="text-xs font-bold leading-tight">
                                {delayDays} nap későn rögzítve
                              </span>
                            </span>
                          )
                        })()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">{record.work_date}</div>
                    </td>
                    <td 
                      className="px-4 md:px-6 py-4 cursor-pointer"
                      onClick={(e) => handleTripleClick(record, e)}
                      title="🕵️ 3x kattintás a szerkesztéshez"
                    >
                      <div className="font-bold text-gray-900 dark:text-white">{record.profiles?.full_name || 'Névtelen'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">{record.profiles?.email}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {record.profiles?.email}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      {record.start_time && record.end_time ? (
                        <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded inline-block text-gray-900 dark:text-white">
                          {record.start_time} - {record.end_time}
                          {isOvernightShift(record.start_time, record.end_time) && (
                            <span className="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400" title="Éjszakás műszak">(+1 nap)</span>
                          )}
                        </div>
                      ) : record.entry_type === 'holiday' ? (
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Szabadság</span>
                      ) : record.entry_type === 'sick_leave' ? (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Betegszabadság</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      {record.start_time && record.end_time ? (
                        <div className="font-bold text-green-700 dark:text-green-400">
                          {calculateDuration(record.start_time, record.end_time)}
                        </div>
                      ) : record.entry_type === 'holiday' ? (
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Szabadság</span>
                      ) : record.entry_type === 'sick_leave' ? (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Betegszabadság</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4 max-w-[200px]">
                      <div className="truncate text-gray-500 dark:text-gray-400" title={record.note || (record.entry_type === 'holiday' ? 'Szabadság' : record.entry_type === 'sick_leave' ? 'Betegszabadság' : '')}>
                        {(record.note != null && String(record.note).trim() !== '') ? (String(record.note).slice(0, 50) + (record.note.length > 50 ? '…' : '')) : (record.entry_type === 'holiday' ? <span className="text-purple-600 dark:text-purple-400 font-medium">Szabadság</span> : record.entry_type === 'sick_leave' ? <span className="text-red-600 dark:text-red-400 font-medium">Betegszabadság</span> : <span className="text-gray-400 dark:text-gray-500">-</span>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecords.length === 0 && (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              {dateFilter ? 'Nincs rögzítés ezen a napon.' : 'Nincs megjeleníthető adat.'}
            </div>
          )}
        </div>

        {filteredRecords.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Összesen <strong>{filteredRecords.length}</strong> rögzítés
            {dateFilter && ` a(z) ${dateFilter} dátumra`}
          </div>
        )}
      </div>

      {/* Titkos Szerkesztő Modal */}
      {secretEditRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-800/50 max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🕵️ Titkos Szerkesztő</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {secretEditRecord.profiles?.full_name || 'Névtelen'} - {secretEditRecord.work_date}
                  </p>
                </div>
                <button
                  onClick={handleCloseSecretEdit}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                  disabled={secretEditLoading}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dátum</label>
                  <input
                    type="date"
                    value={secretEditData.work_date}
                    onChange={(e) => setSecretEditData({...secretEditData, work_date: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={secretEditLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Típus</label>
                  <select
                    value={secretEditData.entry_type}
                    onChange={(e) => setSecretEditData({...secretEditData, entry_type: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={secretEditLoading}
                  >
                    <option value="work">💼 Munka</option>
                    <option value="holiday">🏖️ Szabadság</option>
                    <option value="sick_leave">🤒 Betegszabadság</option>
                  </select>
                </div>
              </div>

              {secretEditData.entry_type === 'work' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kezdés</label>
                    <input
                      type="time"
                      value={secretEditData.start_time}
                      onChange={(e) => setSecretEditData({...secretEditData, start_time: e.target.value})}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={secretEditLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vége</label>
                    <input
                      type="time"
                      value={secretEditData.end_time}
                      onChange={(e) => setSecretEditData({...secretEditData, end_time: e.target.value})}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={secretEditLoading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Megjegyzés</label>
                <textarea
                  rows="3"
                  value={secretEditData.note}
                  onChange={(e) => setSecretEditData({...secretEditData, note: e.target.value})}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={secretEditLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Költség összeg (Ft)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={secretEditData.expense_amount}
                    onChange={(e) => setSecretEditData({...secretEditData, expense_amount: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={secretEditLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Költség leírása</label>
                  <input
                    type="text"
                    value={secretEditData.expense_note}
                    onChange={(e) => setSecretEditData({...secretEditData, expense_note: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Pl. Klímagáz, Üzemanyag..."
                    disabled={secretEditLoading}
                  />
                </div>
              </div>

              {secretEditData.expense_amount > 0 && (
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secretEditData.is_company_card}
                      onChange={(e) => setSecretEditData({...secretEditData, is_company_card: e.target.checked})}
                      className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400 focus:ring-blue-500 rounded"
                      disabled={secretEditLoading}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      💳 Céges kártyával fizettem
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Státusz</label>
                <select
                  value={secretEditData.status}
                  onChange={(e) => setSecretEditData({...secretEditData, status: e.target.value})}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={secretEditLoading}
                >
                  <option value="pending">⏳ Függőben</option>
                  <option value="approved">✓ Elfogadva</option>
                  <option value="rejected">✗ Elutasítva</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={handleCloseSecretEdit}
                disabled={secretEditLoading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                Mégse
              </button>
              <button
                onClick={handleDeleteSecretEdit}
                disabled={secretEditLoading}
                className="px-6 py-3 bg-red-600 dark:bg-red-500 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                🗑️ TÖRLÉS
              </button>
              <button
                onClick={handleSaveSecretEdit}
                disabled={secretEditLoading}
                className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                {secretEditLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Mentés...
                  </>
                ) : (
                  <>
                    💾 MENTÉS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
