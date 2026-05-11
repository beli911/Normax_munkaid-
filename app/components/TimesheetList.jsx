'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateShort, calculateDuration, normalizeTimeToHHmm, validateTimes, isOvernightShift } from '@/lib/utils'
import { Clock, Calendar, Pencil, Hourglass, X, CheckCircle, Banknote } from 'lucide-react'

const getTypeBadge = (type) => {
  switch (type) {
    case 'holiday':
      return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-medium">🏖️ Szabadság</span>
    case 'sick_leave':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">🤒 Betegszabadság</span>
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium">💼 Munka</span>
  }
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">✓ Elfogadva</span>
    case 'rejected':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">✗ Elutasítva</span>
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-medium">⏳ Függőben</span>
  }
}

/** Kifizetés (payment_id) független a jóváhagyási státusztól — ezt külön jelezzük. */
const getPaymentBadge = (record) => {
  if (!record?.payment_id) return null
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/35 text-emerald-900 dark:text-emerald-200 font-semibold"
      title="A bérszámfejtésben rögzített kifizetés"
    >
      <Banknote size={14} aria-hidden />
      Kifizetve
    </span>
  )
}

export default function TimesheetList({ timesheets, loading = false, onRefresh, emptyMessage }) {
  const [pendingTimesheetIds, setPendingTimesheetIds] = useState(new Set())
  const [approvedTimesheetIds, setApprovedTimesheetIds] = useState(new Set())
  const [editModalRecord, setEditModalRecord] = useState(null)
  const [editForm, setEditForm] = useState({ new_entry_type: 'work', new_start_time: '08:00', new_end_time: '16:30', new_note: '' })
  const [editError, setEditError] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  const fetchModificationStates = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [pendingRes, approvedRes] = await Promise.all([
      supabase.from('modification_requests').select('timesheet_id').eq('user_id', user.id).eq('status', 'pending'),
      supabase.from('modification_requests').select('timesheet_id').eq('user_id', user.id).eq('status', 'approved')
    ])
    setPendingTimesheetIds(new Set((pendingRes.data || []).map(r => r.timesheet_id)))
    setApprovedTimesheetIds(new Set((approvedRes.data || []).map(r => r.timesheet_id)))
  }

  useEffect(() => {
    if (!timesheets?.length) return
    fetchModificationStates()
  }, [timesheets?.length])

  const openEditModal = (record) => {
    setEditModalRecord(record)
    setEditForm({
      new_entry_type: record.entry_type || 'work',
      new_start_time: record.start_time ? normalizeTimeToHHmm(record.start_time) || '08:00' : '08:00',
      new_end_time: record.end_time ? normalizeTimeToHHmm(record.end_time) || '16:30' : '16:30',
      new_note: record.note || ''
    })
    setEditError(null)
  }

  const closeEditModal = () => {
    setEditModalRecord(null)
    setEditError(null)
  }

  const handleSubmitModificationRequest = async (e) => {
    e.preventDefault()
    if (!editModalRecord) return
    setEditError(null)
    setSubmitLoading(true)
    try {
      if (editForm.new_entry_type === 'work') {
        const startNorm = normalizeTimeToHHmm(editForm.new_start_time)
        const endNorm = normalizeTimeToHHmm(editForm.new_end_time)
        if (!startNorm || !endNorm) {
          setEditError('Kérjük, töltse ki az időpontokat!')
          setSubmitLoading(false)
          return
        }
        const overnight = isOvernightShift(startNorm, endNorm)
        const validation = validateTimes(startNorm, endNorm, overnight)
        if (!validation.valid) {
          setEditError(validation.message)
          setSubmitLoading(false)
          return
        }
      }
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setEditError('Nincs aktív munkamenet.')
        setSubmitLoading(false)
        return
      }
      const response = await fetch('/api/modification-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          timesheet_id: editModalRecord.id,
          new_entry_type: editForm.new_entry_type,
          new_start_time: editForm.new_entry_type === 'work' ? normalizeTimeToHHmm(editForm.new_start_time) : null,
          new_end_time: editForm.new_entry_type === 'work' ? normalizeTimeToHHmm(editForm.new_end_time) : null,
          new_note: editForm.new_note?.trim() || null
        })
      })
      let payload
      try { payload = await response.json() } catch { payload = {} }
      if (!response.ok) {
        setEditError(payload?.error || 'Nem sikerült a kérés mentése.')
        setSubmitLoading(false)
        return
      }
      closeEditModal()
      await fetchModificationStates()
      onRefresh?.()
      alert('✅ Módosítási kérés elküldve. Az admin hamarosan elbírálja.')
    } catch (err) {
      console.error(err)
      setEditError(err.message || 'Hiba történt.')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-2"></div>
        <p>Betöltés...</p>
      </div>
    )
  }

  if (!timesheets || timesheets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Calendar size={48} className="mx-auto mb-2 opacity-50" />
        <p>{emptyMessage || 'Még nincs rögzített bejegyzés'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={20} className="text-gray-700 dark:text-gray-300" />
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Saját rögzítések</h2>
      </div>

      <div className="space-y-3">
        {timesheets.map((record) => {
          const hasPending = pendingTimesheetIds.has(record.id)
          const hasApproved = approvedTimesheetIds.has(record.id)
          return (
            <div key={record.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="font-bold text-gray-800 dark:text-gray-100">{formatDateShort(record.work_date)}</div>
                    {getTypeBadge(record.entry_type)}
                    {record.payment_id ? getPaymentBadge(record) : getStatusBadge(record.status)}
                    {hasPending ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium" title="Módosítás elbírálás alatt">
                        <Hourglass size={14} /> Módosításra vár ⏳
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                        title="Módosítási kérés"
                      >
                        <Pencil size={14} /> Szerkesztés
                      </button>
                    )}
                    {hasApproved && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium" title="Javítás jóváhagyva">
                        <CheckCircle size={14} /> Javítás jóváhagyva
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{record.work_date}</div>
                  {record.entry_type === 'work' && record.start_time && record.end_time && (
                    <div className="mt-2">
                      <div className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block mb-1">
                        {record.start_time?.slice(0, 5)} - {record.end_time?.slice(0, 5)}
                        {isOvernightShift(record.start_time, record.end_time) && (
                          <span className="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400" title="Éjszakás műszak (másnapra nyúlik)">(+1 nap)</span>
                        )}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium ml-2 inline-block">
                        {calculateDuration(record.start_time, record.end_time)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {record.note && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 truncate max-w-full" title={record.note}>{record.note}</p>
              )}
              {!hasPending && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    ✏️ Szerkesztéshez kattints a „Szerkesztés” gombra – az admin jóváhagyja a módosítást.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Módosítási kérés modal */}
      {editModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeEditModal}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto pb-24" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">✏️ Módosítási kérés</h3>
              <button type="button" onClick={closeEditModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitModificationRequest} className="p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dátum: <strong>{editModalRecord.work_date}</strong>. A kért módosításokat az admin jóváhagyja.
              </p>
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Típus</label>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { value: 'work', label: 'Munka', icon: '💼' },
                    { value: 'holiday', label: 'Szabadság', icon: '🏖️' },
                    { value: 'sick_leave', label: 'Betegszabadság', icon: '🤒' }
                  ].map(t => (
                    <label key={t.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="new_entry_type"
                        value={t.value}
                        checked={editForm.new_entry_type === t.value}
                        onChange={e => setEditForm({ ...editForm, new_entry_type: e.target.value })}
                        className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.icon} {t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {editForm.new_entry_type === 'work' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Kezdés</label>
                    <input
                      type="time"
                      required={editForm.new_entry_type === 'work'}
                      value={editForm.new_start_time}
                      onChange={e => setEditForm({ ...editForm, new_start_time: normalizeTimeToHHmm(e.target.value) || e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Vége</label>
                    <input
                      type="time"
                      required={editForm.new_entry_type === 'work'}
                      value={editForm.new_end_time}
                      onChange={e => setEditForm({ ...editForm, new_end_time: normalizeTimeToHHmm(e.target.value) || e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Megjegyzés</label>
                <textarea
                  rows={3}
                  value={editForm.new_note}
                  onChange={e => setEditForm({ ...editForm, new_note: e.target.value })}
                  placeholder="Opcionális megjegyzés..."
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeEditModal} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                  Mégse
                </button>
                <button type="submit" disabled={submitLoading} className="flex-1 py-3 rounded-xl bg-blue-600 dark:bg-blue-500 text-white font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50">
                  {submitLoading ? 'Küldés...' : 'Módosítás kérése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
