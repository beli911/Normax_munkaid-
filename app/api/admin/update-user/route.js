import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Szerver konfiguracios hiba.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Hianyzik az autentikacio.' }, { status: 401 })
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Ervenytelen munkamenet.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return NextResponse.json({ error: 'Nincs jogosultsag.' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const userId = (body?.userId || '').trim()
  const fullName = (body?.fullName || '').trim()
  const username = (body?.username || '').trim()
  const password = body?.password || ''
  const hourlyRateRaw = body?.hourlyRate

  if (!userId) {
    return NextResponse.json({ error: 'Hibas felhasznalo azonosito.' }, { status: 400 })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const removeAccents = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9@._-]/g, '')
  }

  if (username) {
    const normalized = username.toLowerCase().trim()
    const cleanUsername = removeAccents(normalized)
    if (!cleanUsername) {
      return NextResponse.json({ error: 'A felhasznalonev ervenytelen.' }, { status: 400 })
    }
    const email = `${cleanUsername}@munkaido.local`
    const { error: emailError } = await adminClient.auth.admin.updateUserById(userId, { email })
    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 400 })
    }
  }

  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'A jelszonak legalabb 6 karakter hosszunak kell lennie.' }, { status: 400 })
    }
    const { error: passError } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (passError) {
      return NextResponse.json({ error: passError.message }, { status: 400 })
    }
  }

  const rate = hourlyRateRaw != null ? Number(hourlyRateRaw) : null
  const hourlyRate = rate != null && !isNaN(rate) ? rate : null

  const updatePayload = {
    full_name: fullName || null,
    hourly_rate: hourlyRate
  }

  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
