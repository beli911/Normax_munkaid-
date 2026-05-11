import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Admin ellenőrzés helper
async function checkAdmin(authHeader) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { isAdmin: false, error: 'Szerver konfiguracios hiba.' }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return { isAdmin: false, error: 'Hianyzik az autentikacio.' }
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData?.user) {
    return { isAdmin: false, error: 'Ervenytelen munkamenet.' }
  }

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { isAdmin: false, error: 'Nincs jogosultsag. Csak admin szerkeszthet es torolhet!' }
  }

  return { isAdmin: true, userId: userData.user.id }
}

// DELETE - Timesheet törlése
export async function DELETE(request) {
  const authHeader = request.headers.get('authorization') || ''
  const adminCheck = await checkAdmin(authHeader)
  
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.error?.includes('jogosultsag') ? 403 : 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Hibas azonosito.' }, { status: 400 })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { error } = await adminClient
    .from('timesheets')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Törlési hiba:', error)
    return NextResponse.json({ error: error.message || 'Hiba a torles soran.' }, { status: 400 })
  }

  return NextResponse.json({ success: true, message: 'Bejegyzes sikeresen torolve.' }, { status: 200 })
}

// PUT - Timesheet frissítése
export async function PUT(request) {
  const authHeader = request.headers.get('authorization') || ''
  const adminCheck = await checkAdmin(authHeader)
  
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.error?.includes('jogosultsag') ? 403 : 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const idFromQuery = searchParams.get('id')
  const { id, work_date, entry_type, start_time, end_time, note, expense_amount, expense_note, is_company_card, status } = body

  if (!id) {
    return NextResponse.json({ error: 'Hibas azonosito.' }, { status: 400 })
  }
  // URL és body id összehasonlítás típusfüggetlenül (string vs number)
  if (idFromQuery != null && idFromQuery !== '' && String(idFromQuery) !== String(id)) {
    return NextResponse.json({ error: 'Az URL es a body azonositoja nem egyezik.' }, { status: 400 })
  }

  const allowedEntryTypes = ['work', 'holiday', 'sick_leave']
  const allowedStatuses = ['pending', 'approved', 'rejected']
  if (entry_type !== undefined && !allowedEntryTypes.includes(entry_type)) {
    return NextResponse.json({ error: 'Ervenytelen entry_type. Lehet: work, holiday, sick_leave.' }, { status: 400 })
  }
  if (status !== undefined && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Ervenytelen status. Lehet: pending, approved, rejected.' }, { status: 400 })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const expenseAmountNum = expense_amount !== undefined ? Number(expense_amount) : undefined
  const expenseAmountValid = expense_amount !== undefined
    ? (expenseAmountNum !== undefined && !isNaN(expenseAmountNum) ? expenseAmountNum : 0)
    : undefined

  // Frissítendő mezők – szövegek trimmelése (szellem szóköz fix)
  const updateData = {}
  if (work_date !== undefined) updateData.work_date = typeof work_date === 'string' ? work_date.trim() : work_date
  if (entry_type !== undefined) updateData.entry_type = entry_type
  if (start_time !== undefined) updateData.start_time = typeof start_time === 'string' ? start_time.trim() : start_time
  if (end_time !== undefined) updateData.end_time = typeof end_time === 'string' ? end_time.trim() : end_time
  if (note !== undefined) updateData.note = note != null ? String(note).trim() || null : null
  if (expense_amount !== undefined) updateData.expense_amount = expenseAmountValid
  if (expense_note !== undefined) updateData.expense_note = expense_note != null ? String(expense_note).trim() || null : null
  if (is_company_card !== undefined) updateData.is_company_card = is_company_card
  if (status !== undefined) updateData.status = status

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nincs frissitendo adat.' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('timesheets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Frissitesi hiba:', error)
    return NextResponse.json({ error: error.message || 'Hiba a frissites soran.' }, { status: 400 })
  }

  return NextResponse.json({ success: true, data }, { status: 200 })
}
