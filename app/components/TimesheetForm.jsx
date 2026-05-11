'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { validateTimes, calculateDuration, normalizeTimeToHHmm, isOvernightShift } from '@/lib/utils'

export default function TimesheetForm() {
  const supabaseClient = supabase
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Default értékek
  const [formData, setFormData] = useState({
    work_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '16:30',
    entry_type: 'work', // 'work' | 'holiday' | 'sick_leave'
    note: ''
  })

  // Éjszakás műszak (vége másnapra esik, pl. 16:00–02:00)
  const [isNextDay, setIsNextDay] = useState(false)
  // Költség mezők
  const [hasExpense, setHasExpense] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [isCompanyCard, setIsCompanyCard] = useState(false) // Céges kártya jelölés

  // Éjszakás: ha vége < kezdés, automatikusan pipáljuk „Másnap fejeződik be”-t (user törölheti)
  useEffect(() => {
    if (formData.entry_type !== 'work') return
    const s = normalizeTimeToHHmm(formData.start_time)
    const e = normalizeTimeToHHmm(formData.end_time)
    if (s && e && isOvernightShift(s, e)) setIsNextDay(true)
  }, [formData.entry_type, formData.start_time, formData.end_time])

  const checkDuplicate = async (date) => {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return false

    const { data } = await supabaseClient
      .from('timesheets')
      .select('id')
      .eq('user_id', user.id)
      .eq('work_date', date)

    return data && data.length > 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        throw new Error('Nincs bejelentkezve')
      }

      // SZIGORÚ VALIDÁCIÓ - Enterprise szintű ellenőrzés
      
      // 1. 'work' típusnál kötelező a megjegyzés
      if (formData.entry_type === 'work' && !formData.note.trim()) {
        setError('A munka leírása kötelező! Írd le röviden, mit csináltál.')
        setLoading(false)
        return
      }

      // 2. 'work' típusnál kötelező az idő; éjszakásnál (vége < kezdés) allowOvernight
      if (formData.entry_type === 'work') {
        const startNorm = normalizeTimeToHHmm(formData.start_time)
        const endNorm = normalizeTimeToHHmm(formData.end_time)
        if (!startNorm || !endNorm) {
          setError('Kérjük, töltse ki az időpontokat!')
          setLoading(false)
          return
        }
        const overnight = isNextDay || isOvernightShift(startNorm, endNorm)
        const validation = validateTimes(startNorm, endNorm, overnight)
        if (!validation.valid) {
          setError(validation.message)
          setLoading(false)
          return
        }
      }

      // 3. Költség validáció
      if (hasExpense) {
        const amount = parseFloat(expenseAmount)
        if (!expenseAmount || isNaN(amount) || amount <= 0) {
          setError('Ha van költség, az összegnek nagyobbnak kell lennie, mint 0 Ft!')
          setLoading(false)
          return
        }
        if (!expenseNote.trim()) {
          setError('Ha van költség, kötelező leírni, mi volt az! (pl. Klímagáz, Üzemanyag, stb.)')
          setLoading(false)
          return
        }
      }

      // Duplikáció ellenőrzés
      const isDuplicate = await checkDuplicate(formData.work_date)
      if (isDuplicate) {
        setError('Erre a napra már van rögzített bejegyzés! A rögzítések nem szerkeszthetők és nem törölhetők.')
        setLoading(false)
        return
      }

      // Adatok előkészítése – minden szöveg trimmelve (szellem szóköz fix)
      const payload = {
        user_id: user.id,
        work_date: (formData.work_date || '').trim() || formData.work_date,
        entry_type: formData.entry_type,
        status: 'pending',
        note: (formData.note || '').trim() || null,
        expense_amount: hasExpense ? parseFloat(String(expenseAmount).trim()) || 0 : 0,
        expense_note: hasExpense ? (expenseNote || '').trim() || null : null,
        is_company_card: hasExpense ? isCompanyCard : false
      }

      // Csak akkor küldünk időt, ha ez 'work' típus – mindig HH:mm string (timezone biztonság)
      if (formData.entry_type === 'work') {
        payload.start_time = normalizeTimeToHHmm(formData.start_time)
        payload.end_time = normalizeTimeToHHmm(formData.end_time)
      } else {
        payload.start_time = null
        payload.end_time = null
      }

      const { error: dbError } = await supabaseClient
        .from('timesheets')
        .insert([payload])

      if (dbError) {
        // SQL Constraint hiba elkapása
        if (dbError.message.includes('check_times_valid')) {
          throw new Error('Hiba: Munka típusnál az érkezés és távozás idő megadása kötelező.')
        } else {
          throw dbError
        }
      }

      // Sikeres mentés után frissítés
      setFormData(prev => ({
        ...prev,
        note: '',
        start_time: '08:00',
        end_time: '16:30'
      }))
      setIsNextDay(false)
      // Költség mezők reset
      setHasExpense(false)
      setExpenseAmount('')
      setExpenseNote('')
      setIsCompanyCard(false)
      
      // FONTOS: Beállítjuk, hogy használta az új verziót (popup ne jelenjen meg többet)
      localStorage.setItem('hasUsedNewVersion', 'true')
      
      // Sikeres üzenet küldése a szülő komponensnek
      const successEvent = new CustomEvent('timesheet-saved', { detail: { type: formData.entry_type } })
      window.dispatchEvent(successEvent)

    } catch (err) {
      console.error(err)
      const isNetworkError = !navigator.onLine || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network')
      setError(isNetworkError ? 'Hálózati hiba. Ellenőrizze az internetkapcsolatot.' : (err.message || 'Hiba történt a mentés során'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 mb-6 border border-gray-200 dark:border-gray-800 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Új bejegyzés rögzítése</h2>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Típus kiválasztása */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Típus</label>
          <div className="flex gap-4">
            {[
              { value: 'work', label: 'Munka', icon: '💼' },
              { value: 'holiday', label: 'Szabadság', icon: '🏖️' },
              { value: 'sick_leave', label: 'Betegszabadság', icon: '🤒' }
            ].map((type) => (
              <label key={type.value} className="flex items-center cursor-pointer flex-1">
                <input
                  type="radio"
                  name="entry_type"
                  value={type.value}
                  checked={formData.entry_type === type.value}
                  onChange={e => setFormData({...formData, entry_type: e.target.value})}
                  className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {type.icon} {type.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Dátum */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Dátum</label>
          <input
            type="date"
            required
            value={formData.work_date}
            onChange={e => setFormData({...formData, work_date: e.target.value})}
            className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-lg font-medium text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Időmezők - Csak ha "work" a típus */}
        {formData.entry_type === 'work' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Érkezés</label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={e => setFormData({...formData, start_time: normalizeTimeToHHmm(e.target.value) || e.target.value})}
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-center text-lg font-medium text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Távozás</label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={e => setFormData({...formData, end_time: normalizeTimeToHHmm(e.target.value) || e.target.value})}
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-center text-lg font-medium text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Éjszakás: vége másnapra esik – auto-pipálás ha vége < kezdés */}
            <label className="flex items-center cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={isNextDay}
                onChange={(e) => setIsNextDay(e.target.checked)}
                className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400 focus:ring-blue-500 rounded"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                🌙 Másnap fejeződik be (+1 nap)
              </span>
            </label>

            {formData.start_time && formData.end_time && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Időtartam:</strong> {calculateDuration(formData.start_time, formData.end_time)}
                </p>
              </div>
            )}
          </>
        )}

        {/* Megjegyzés */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
            Tevékenység / Megjegyzés
            {formData.entry_type === 'work' && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
          </label>
          <textarea
            rows="3"
            required={formData.entry_type === 'work'}
            placeholder={formData.entry_type === 'work' ? 'Írd le röviden mit csináltál... (KÖTELEZŐ!)' : 'Opcionális megjegyzés...'}
            value={formData.note}
            onChange={e => setFormData({...formData, note: e.target.value})}
            className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Költség mezők */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
          <label className="flex items-center cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={hasExpense}
              onChange={(e) => {
                setHasExpense(e.target.checked)
                if (!e.target.checked) {
                  setExpenseAmount('')
                  setExpenseNote('')
                }
              }}
              className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400 focus:ring-blue-500 rounded"
            />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              💰 Volt anyagköltség / tankolás?
            </span>
          </label>

          {hasExpense && (
            <div className="space-y-4 pl-8 border-l-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Összeg (Ft) <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required={hasExpense}
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Pl. 20000"
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-base font-medium text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Költség leírása <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required={hasExpense}
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Pl. Klímagáz, Üzemanyag, Anyagvásárlás..."
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div className="pt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCompanyCard}
                    onChange={(e) => setIsCompanyCard(e.target.checked)}
                    className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400 focus:ring-blue-500 rounded"
                  />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    💳 Céges kártyával fizettem
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
                  {isCompanyCard 
                    ? '⚠️ A költség rögzítve lesz, de NEM adódik hozzá a fizetéshez (céges kártya).'
                    : '✅ A költség hozzáadódik a fizetendő végösszeghez (saját zseb).'}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg dark:shadow-blue-500/50 active:scale-95 transition-transform text-lg disabled:opacity-50 hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          {loading ? 'Mentés...' : 'Rögzítés mentése'}
        </button>
      </form>
    </div>
  )
}
