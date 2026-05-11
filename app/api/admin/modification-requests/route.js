import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
    return { isAdmin: false, error: 'Nincs jogosultsag.' }
  }
  return { isAdmin: true, userId: userData.user.id }
}

const adminClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// GET – jóváhagyandó (pending) módosítási kérelmek listája
export async function GET(request) {
  const authHeader = request.headers.get('authorization') || ''
  const adminCheck = await checkAdmin(authHeader)
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.error?.includes('jogosultsag') ? 403 : 401 })
  }

  const client = adminClient()
  const { data: requests, error } = await client
    .from('modification_requests')
    .select(`
      id,
      timesheet_id,
      user_id,
      new_entry_type,
      new_start_time,
      new_end_time,
      new_note,
      status,
      created_at,
      timesheets (
        work_date,
        entry_type,
        start_time,
        end_time,
        note,
        profiles (full_name, email)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('modification_requests list:', error)
    return NextResponse.json({ error: error.message || 'Hiba a listázáskor.' }, { status: 400 })
  }

  return NextResponse.json({ data: requests || [] }, { status: 200 })
}

// PATCH – jóváhagyás vagy elutasítás
export async function PATCH(request) {
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

  const { id: requestId, action } = body
  if (!requestId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Hibas parameterek: id es action (approve/reject) kell.' }, { status: 400 })
  }

  const client = adminClient()

  const { data: req, error: fetchError } = await client
    .from('modification_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !req) {
    return NextResponse.json({ error: 'A kérés nem található vagy már elbírálva.' }, { status: 404 })
  }

  if (action === 'reject') {
    const { error: updateError } = await client
      .from('modification_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: adminCheck.userId })
      .eq('id', requestId)
    if (updateError) {
      console.error('modification_requests reject:', updateError)
      return NextResponse.json({ error: updateError.message || 'Hiba az elutasításkor.' }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: 'Elutasítva.' }, { status: 200 })
  }

  // action === 'approve' – frissítjük a timesheets sort, majd a kérést
  const updateData = {}
  if (req.new_entry_type !== undefined && req.new_entry_type !== null) updateData.entry_type = req.new_entry_type
  if (req.new_start_time !== undefined && req.new_start_time !== null) updateData.start_time = req.new_start_time
  if (req.new_end_time !== undefined && req.new_end_time !== null) updateData.end_time = req.new_end_time
  if (req.new_note !== undefined && req.new_note !== null) updateData.note = req.new_note

  if (Object.keys(updateData).length > 0) {
    const { error: tsError } = await client
      .from('timesheets')
      .update(updateData)
      .eq('id', req.timesheet_id)
    if (tsError) {
      console.error('timesheets update on approve:', tsError)
      return NextResponse.json({ error: tsError.message || 'Hiba a bejegyzés frissítésekor.' }, { status: 400 })
    }
  }

  const { error: updateError } = await client
    .from('modification_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: adminCheck.userId })
    .eq('id', requestId)
  if (updateError) {
    console.error('modification_requests approve:', updateError)
    return NextResponse.json({ error: updateError.message || 'Hiba a jóváhagyáskor.' }, { status: 400 })
  }

  return NextResponse.json({ success: true, message: 'Elfogadva.' }, { status: 200 })
}
