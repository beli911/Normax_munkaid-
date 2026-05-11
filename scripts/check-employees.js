// Alkalmazottak ellenőrzése
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function checkEmployees() {
  try {
    console.log('🔍 Alkalmazottak ellenőrzése...\n')
    
    // 1. Próbáljuk lekérni a profilokat hourly_rate-dal
    // Ha nincs oszlop, akkor hibaüzenet jön

    // 2. Lekérjük az összes profilt
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, hourly_rate, is_admin')
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('❌ Hiba a profilok lekérésekor:', profilesError.message)
      return
    }

    console.log(`📋 Összesen ${profiles?.length || 0} profil található:\n`)

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  Nincs profil az adatbázisban!')
      console.log('   Hozz létre alkalmazottakat az admin felületen.\n')
      return
    }

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name || 'Névtelen'} (${profile.email})`)
      console.log(`   ID: ${profile.id}`)
      console.log(`   Admin: ${profile.is_admin ? 'Igen' : 'Nem'}`)
      console.log(`   Óradíj: ${profile.hourly_rate ? profile.hourly_rate + ' Ft/óra' : 'Nincs beállítva'}`)
      console.log('')
    })


  } catch (error) {
    console.error('❌ Hiba:', error.message)
  }
}

checkEmployees()
