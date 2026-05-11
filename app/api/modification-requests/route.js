import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function getAuthenticatedUser(authHeader) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Szerver konfiguracios hiba.' }
  }
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return { user: null, error: 'Hianyzik az autentikacio.' }
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData?.user) {
    return { user: null, error: 'Ervenytelen munkamenet.' }
  }
  return { user: userData.user, error: null }
}

// POST – dolgozó módosítási kérést hoz létre
export async function POST(request) {
  const authHeader = request.headers.get('authorization') || ''
  const { user, error: authError } = await getAuthenticatedUser(authHeader)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Bejelentkezés szükséges.' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { timesheet_id, new_entry_type, new_start_time, new_end_time, new_note } = body
  if (!timesheet_id) {
    return NextResponse.json({ error: 'Hianyzik a timesheet_id.' }, { status: 400 })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: timesheet, error: tsError } = await adminClient
    .from('timesheets')
    .select('id, user_id')
    .eq('id', timesheet_id)
    .single()

  if (tsError || !timesheet) {
    return NextResponse.json({ error: 'A bejegyzés nem található.' }, { status: 404 })
  }
  if (timesheet.user_id !== user.id) {
    return NextResponse.json({ error: 'Csak a saját bejegyzésedet módosíthatod kérni.' }, { status: 403 })
  }

  const allowedEntryTypes = ['work', 'holiday', 'sick_leave']
  if (new_entry_type !== undefined && new_entry_type !== null && !allowedEntryTypes.includes(new_entry_type)) {
    return NextResponse.json({ error: 'Ervenytelen new_entry_type.' }, { status: 400 })
  }

  const { data: existing } = await adminClient
    .from('modification_requests')
    .select('id')
    .eq('timesheet_id', timesheet_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ehhez a bejegyzéshez már van függőben lévő módosítási kérés.' }, { status: 400 })
  }

  const insert = {
    timesheet_id,
    user_id: user.id,
    new_entry_type: new_entry_type ?? null,
    new_start_time: new_start_time != null ? String(new_start_time).trim() || null : null,
    new_end_time: new_end_time != null ? String(new_end_time).trim() || null : null,
    new_note: new_note != null ? String(new_note).trim() || null : null,
    status: 'pending'
  }

  const { data: created, error: insertError } = await adminClient
    .from('modification_requests')
    .insert([insert])
    .select()
    .single()

  if (insertError) {
    console.error('modification_requests insert:', insertError)
    return NextResponse.json({ error: insertError.message || 'Hiba a kérés mentésekor.' }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: created }, { status: 200 })
}
