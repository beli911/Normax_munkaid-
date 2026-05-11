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
  const username = (body?.username || '').trim()
  const password = body?.password || ''
  const fullName = (body?.fullName || '').trim()

  if (!username || password.length < 6) {
    return NextResponse.json({ error: 'Hibas felhasznalonev vagy jelszo.' }, { status: 400 })
  }

  // Ékezetes karakterek lecserélése ASCII karakterekre az email címhez
  const removeAccents = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Ékezetek eltávolítása
      .replace(/[^a-z0-9@._-]/g, '') // Csak alfanumerikus karakterek, @, ., _, - maradhat
  }

  const normalized = username.toLowerCase().trim()
  const cleanUsername = removeAccents(normalized)
  const cleanEmail = normalized.includes('@') ? removeAccents(normalized) : ''
  const email = cleanEmail || `${cleanUsername}@munkaido.local`
  const loginUsername = cleanEmail ? cleanEmail.split('@')[0] : cleanUsername

  if (!loginUsername) {
    return NextResponse.json({ error: 'A felhasznalonev ervenytelen. Hasznalj betuket es szamokat.' }, { status: 400 })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || username }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    { userId: data.user?.id, email: data.user?.email, loginUsername },
    { status: 201 }
  )
}
