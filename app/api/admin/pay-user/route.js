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

  // Admin ellenőrzés
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
  const userId = body?.userId
  const amount = body?.amount
  const cutoffDate = body?.cutoffDate // Záró dátum (opcionális)

  if (!userId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: 'Hibas felhasznalo vagy osszeg.' }, { status: 400 })
  }

  if (cutoffDate != null && cutoffDate !== '') {
    const d = new Date(cutoffDate)
    if (d.toString() === 'Invalid Date') {
      return NextResponse.json({ error: 'Ervenytelen zaro datum.' }, { status: 400 })
    }
  }

  // Ha van cutoffDate, akkor a heti fizetési függvényt használjuk
  // Különben az eredeti execute_payment-t (visszafelé kompatibilitás)
  const rpcFunction = cutoffDate ? 'execute_payment_until' : 'execute_payment'
  const rpcParams = cutoffDate 
    ? {
        p_user_id: userId,
        p_amount: parseFloat(amount),
        p_cutoff_date: cutoffDate
      }
    : {
        p_user_id: userId,
        p_amount: parseFloat(amount)
      }

  // Biztonságos kifizetés végrehajtása az adatbázis függvénnyel
  // Ez egy tranzakció-biztos művelet
  const { data, error } = await authClient.rpc(rpcFunction, rpcParams)

  if (error) {
    console.error('Fizetési hiba:', error)
    return NextResponse.json({ error: error.message || 'Fizetesi hiba.' }, { status: 400 })
  }

  return NextResponse.json(
    { success: true, payment_id: data?.payment_id },
    { status: 200 }
  )
}
