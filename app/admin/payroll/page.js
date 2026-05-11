'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, Clock, CheckCircle, AlertCircle, Users, ChevronDown, ChevronRight, ChevronLeft, Calendar } from 'lucide-react'

// Segédfüggvény: Forint formázás
const formatCurrency = (amount) => {
  if (!amount || amount === 0) return '0 Ft'
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('HUF', 'Ft')
}

// Segédfüggvény: Dátum formázás
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// Segédfüggvény: Hónap első napja
const getFirstDayOfMonth = (date) => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Segédfüggvény: Hónap utolsó napja
const getLastDayOfMonth = (date) => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

// Segédfüggvény: Hónap megjelenítése magyarul (pl. "2026. JANUÁR")
const formatMonthName = (date) => {
  const months = [
    'JANUÁR', 'FEBRUÁR', 'MÁRCIUS', 'ÁPRILIS', 'MÁJUS', 'JÚNIUS',
    'JÚLIUS', 'AUGUSZTUS', 'SZEPTEMBER', 'OKTÓBER', 'NOVEMBER', 'DECEMBER'
  ]
  const d = new Date(date)
  return `${d.getFullYear()}. ${months[d.getMonth()]}`
}

// Típus badge komponens
const getTypeBadge = (type) => {
  switch (type) {
    case 'holiday':
      return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">Szabadság 🏖️</span>
    case 'sick_leave':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Betegszabadság 🤒</span>
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Munka 💼</span>
  }
}

export default function PayrollPage() {
  const [loading, setLoading] = useState(false)
  const [unpaidData, setUnpaidData] = useState([])
  const [payingUserId, setPayingUserId] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [detailsData, setDetailsData] = useState({})
  const [loadingDetails, setLoadingDetails] = useState(new Set())
  
  // Hónapválasztó state
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Számított értékek a lekérdezéshez
  const selectedMonthStart = getFirstDayOfMonth(currentDate).toISOString().split('T')[0]
  const selectedMonthEnd = getLastDayOfMonth(currentDate).toISOString().split('T')[0]
  
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      // Automatikusan betöltjük a tartozásokat
      fetchUnpaidData()
    }
    checkAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])
  
  // Hónap változásakor újra betöltjük az adatokat
  useEffect(() => {
    if (selectedMonthStart && selectedMonthEnd) {
      fetchUnpaidData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthStart, selectedMonthEnd])

  const fetchUnpaidData = useCallback(async () => {
    setLoading(true)
    try {
      // get_weekly_report - tetszőleges dátumtartományt fogad (hónapra is működik)
      const { data, error } = await supabase.rpc('get_weekly_report', {
        p_start_date: selectedMonthStart,
        p_end_date: selectedMonthEnd
      })

      if (error) {
        console.error('Tartozás hiba:', error)
        alert('Hiba történt az adatok lekérése során: ' + error.message)
        return
      }

      setUnpaidData(data || [])
      // Részletek cache törlése, mert új hónap van kiválasztva
      setDetailsData({})
      setExpandedRows(new Set())
    } catch (err) {
      console.error('Tartozás hiba:', err)
      alert('Hiba történt: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedMonthStart, selectedMonthEnd])

  const fetchUserDetails = async (userId) => {
    if (detailsData[userId]) {
      return
    }

    setLoadingDetails(prev => new Set(prev).add(userId))

    try {
      // get_weekly_details_for_user - tetszőleges dátumtartományt fogad
      const { data, error } = await supabase.rpc('get_weekly_details_for_user', {
        p_start_date: selectedMonthStart,
        p_end_date: selectedMonthEnd,
        p_user_id: userId
      })

      if (error) {
        console.error('Részletek hiba:', error)
        alert('Hiba történt a részletek lekérése során: ' + error.message)
        return
      }

      setDetailsData(prev => ({
        ...prev,
        [userId]: data || []
      }))
    } catch (err) {
      console.error('Részletek hiba:', err)
      alert('Hiba történt: ' + err.message)
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const toggleRow = async (userId) => {
    const newExpanded = new Set(expandedRows)
    
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
      await fetchUserDetails(userId)
    }
    
    setExpandedRows(newExpanded)
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  const isCurrentMonth = () => {
    const today = new Date()
    return currentDate.getFullYear() === today.getFullYear() && 
           currentDate.getMonth() === today.getMonth()
  }

  const handlePayment = async (userId, amount, e) => {
    e.stopPropagation()

    if (!confirm(`Biztosan kifizeted a ${formatCurrency(amount)} összeget a kiválasztott hónapra (${formatMonthName(currentDate)})?`)) {
      return
    }

    setPayingUserId(userId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Nincs bejelentkezve')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('Nincs érvényes munkamenet')
      }

      const response = await fetch('/api/admin/pay-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          amount,
          cutoffDate: selectedMonthEnd // Záró dátum (hónap vége)
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fizetési hiba')
      }

      // Sikeres fizetés után frissítjük a listát
      await fetchUnpaidData()
      setDetailsData(prev => {
        const newData = { ...prev }
        delete newData[userId]
        return newData
      })
      setExpandedRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      alert('✅ Fizetés sikeresen rögzítve!')
    } catch (err) {
      console.error('Fizetési hiba:', err)
      alert('Hiba történt a fizetés során: ' + err.message)
    } finally {
      setPayingUserId(null)
    }
  }

  // Összesítések számítása (új mezőnevekkel)
  const totalDue = unpaidData.reduce((sum, item) => sum + parseFloat(item.grand_total || 0), 0)
  const totalWages = unpaidData.reduce((sum, item) => sum + parseFloat(item.total_wages || 0), 0)
  const totalExpenses = unpaidData.reduce((sum, item) => sum + parseFloat(item.total_expenses || 0), 0)
  const totalCompanyExpenses = unpaidData.reduce((sum, item) => sum + parseFloat(item.company_expenses || 0), 0)
  const totalHours = unpaidData.reduce((sum, item) => sum + parseFloat(item.total_hours || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Fejléc */}
      <div className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800/50 p-4 flex justify-between items-center sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="p-3 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Vissza az admin oldalra"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <DollarSign size={24} className="text-green-600 dark:text-green-400" />
              Tartozások Kezelése
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fizetetlen munkabér és anyagköltségek - Havi bontás</p>
          </div>
        </div>
        <button
          onClick={fetchUnpaidData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Frissítés...' : '🔄 Frissítés'}
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 mt-4">
        {/* Hónapválasztó Navigáció */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 mb-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Hónap kiválasztása</h2>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigateMonth('prev')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium text-sm"
              >
                <ChevronLeft size={18} />
                Előző Hónap
              </button>
              
              <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                  {formatMonthName(currentDate)}
                </p>
              </div>
              
              <button
                onClick={() => navigateMonth('next')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium text-sm"
              >
                Következő Hónap
                <ChevronRight size={18} />
              </button>
              
              {!isCurrentMonth() && (
                <button
                  onClick={goToCurrentMonth}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                >
                  Jelenlegi Hónap
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Összesítő statisztikák */}
        {unpaidData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <Users size={24} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Alkalmazottak</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{unpaidData.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={24} className="text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Összes óra</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalHours.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={24} className="text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Anyagköltség (Kifizetendő)</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalExpenses)}</p>
                  {totalCompanyExpenses > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      + {formatCurrency(totalCompanyExpenses)} 💳 (céges)
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 border-2 border-green-500 dark:border-green-600">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={24} className="text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Összes tartozás</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalDue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Táblázat */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Fizetetlen tartozások</h2>
            {unpaidData.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Összesen: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalDue)}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Adatok betöltése...</p>
            </div>
          ) : unpaidData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 opacity-50 text-green-500 dark:text-green-400" />
              <p className="font-medium">Nincs fizetetlen tartozás a kiválasztott hónapban!</p>
              <p className="text-sm mt-2">Minden kifizetés rendben van. 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                      {/* Chevron oszlop */}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Alkalmazott
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fizetetlen Munkaóra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Munkadíj (Ft)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Anyagköltség (Ft)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Végösszeg (Fizetendő)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Művelet
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {unpaidData.map((item, index) => {
                    const isExpanded = expandedRows.has(item.user_id)
                    const details = detailsData[item.user_id] || []
                    const isLoadingDetails = loadingDetails.has(item.user_id)

                    return (
                      <>
                        {/* Fő sor */}
                        <tr 
                          key={item.user_id || index} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                          onClick={() => toggleRow(item.user_id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isExpanded ? (
                              <ChevronDown size={20} className="text-gray-400 dark:text-gray-500" />
                            ) : (
                              <ChevronRight size={20} className="text-gray-400 dark:text-gray-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.full_name || '-'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Óradíj: {formatCurrency(item.hourly_rate || 0)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                              {parseFloat(item.total_hours || 0).toFixed(2)} óra
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {formatCurrency(item.total_wages || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {parseFloat(item.total_expenses || 0) > 0 && (
                                <div className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                  <AlertCircle size={16} />
                                  {formatCurrency(item.total_expenses || 0)}
                                </div>
                              )}
                              {parseFloat(item.company_expenses || 0) > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <span>💳</span>
                                  {formatCurrency(item.company_expenses || 0)} (céges)
                                </div>
                              )}
                              {parseFloat(item.total_expenses || 0) === 0 && parseFloat(item.company_expenses || 0) === 0 && (
                                <span className="text-gray-400 dark:text-gray-500">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(item.grand_total || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {item.is_fully_paid ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-bold flex items-center gap-1">
                                  <CheckCircle size={14} />
                                  KIFIZETVE
                                </span>
                                {item.payment_date && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(item.payment_date)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handlePayment(item.user_id, item.grand_total, e)}
                                disabled={payingUserId === item.user_id}
                                className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
                              >
                                {payingUserId === item.user_id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Fizetés...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={16} />
                                    Kifizetés Rögzítése
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Részletező sor */}
                        {isExpanded && (
                          <tr key={`details-${item.user_id}`}>
                            <td colSpan={7} className="px-0 py-0">
                              <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                {isLoadingDetails ? (
                                  <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-600">Részletek betöltése...</p>
                                  </div>
                                ) : details.length === 0 ? (
                                  <div className="p-8 text-center text-gray-500">
                                    <p className="text-sm">Nincs részletes adat a kiválasztott hónapban</p>
                                  </div>
                                ) : (
                                  <div className="p-6">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Tételes bontás:</h3>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 rounded-lg shadow-sm dark:shadow-gray-800/50">
                                        <thead className="bg-gray-100 dark:bg-gray-800">
                                          <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dátum</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Típus</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Leírás</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Munkaóra</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Munkadíj</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Költség/Anyag</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Napi Összesen</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                          {details.map((detail, detailIndex) => (
                                            <tr key={detailIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {formatDate(detail.work_date)}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                {getTypeBadge(detail.entry_type)}
                                              </td>
                                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                                                <div className="flex items-center gap-2">
                                                  {detail.description || '-'}
                                                  {detail.is_paid && (
                                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-bold">
                                                      ✓
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                {parseFloat(detail.hours || 0) > 0 ? `${detail.hours.toFixed(2)} óra` : '-'}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                {formatCurrency(detail.wage_amount || 0)}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                {parseFloat(detail.expense_amount || 0) > 0 ? (
                                                  <div className="flex items-center gap-1">
                                                    {detail.is_company_card ? (
                                                      <span className="font-bold text-gray-500 dark:text-gray-400" title="Céges kártya - nem adódik hozzá a fizetéshez">
                                                        💳 {formatCurrency(detail.expense_amount)}
                                                      </span>
                                                    ) : (
                                                      <span className="font-bold text-red-600 dark:text-red-400" title="Saját zseb - hozzáadódik a fizetéshez">
                                                        {formatCurrency(detail.expense_amount)}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                                                {formatCurrency(detail.total_daily || 0)}
                                              </td>
                                            </tr>
                                          ))}
                                          {/* Részletek összesítő sor */}
                                          <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-700">
                                            <td colSpan={3} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">ÖSSZESEN</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                                              {details.reduce((sum, d) => sum + parseFloat(d.hours || 0), 0).toFixed(2)} óra
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                              {formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.wage_amount || 0), 0))}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                              <div className="flex flex-col gap-1">
                                                {details.reduce((sum, d) => sum + (d.is_company_card ? 0 : parseFloat(d.expense_amount || 0)), 0) > 0 && (
                                                  <span className="text-red-600 dark:text-red-400 font-bold">
                                                    {formatCurrency(details.reduce((sum, d) => sum + (d.is_company_card ? 0 : parseFloat(d.expense_amount || 0)), 0))}
                                                  </span>
                                                )}
                                                {details.reduce((sum, d) => sum + (d.is_company_card ? parseFloat(d.expense_amount || 0) : 0), 0) > 0 && (
                                                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                    💳 {formatCurrency(details.reduce((sum, d) => sum + (d.is_company_card ? parseFloat(d.expense_amount || 0) : 0), 0))} (céges)
                                                  </span>
                                                )}
                                                {details.reduce((sum, d) => sum + parseFloat(d.expense_amount || 0), 0) === 0 && (
                                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                                              {formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.total_daily || 0), 0))}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                  {/* Összesítő sor */}
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap"></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">ÖSSZESEN</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {totalHours.toFixed(2)} óra
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatCurrency(totalWages)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col gap-1">
                        {totalExpenses > 0 && (
                          <span className="text-red-600 dark:text-red-400 font-bold">
                            {formatCurrency(totalExpenses)}
                          </span>
                        )}
                        {totalCompanyExpenses > 0 && (
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            💳 {formatCurrency(totalCompanyExpenses)} (céges)
                          </span>
                        )}
                        {totalExpenses === 0 && totalCompanyExpenses === 0 && (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg text-green-600 dark:text-green-400">
                      {formatCurrency(totalDue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
