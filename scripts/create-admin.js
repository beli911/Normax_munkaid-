// Admin felhasználó létrehozása
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// .env.local fájl beolvasása
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Hiba: Hiányoznak a környezeti változók!')
  console.error('Ellenőrizd, hogy a .env.local fájlban vannak-e a Supabase kulcsok.')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function createAdmin() {
  try {
    console.log('🔐 Admin felhasználó létrehozása...')
    
    const email = 'admin@munkaido.local'
    const password = 'Belike911'
    const fullName = 'Admin'

    // 1. Létrehozzuk a felhasználót
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (userError) {
      if (userError.message.includes('already registered') || userError.message.includes('already exists')) {
        console.log('⚠️  A felhasználó már létezik. Frissítjük az admin jogosultságot...')
        
        // Ha már létezik, lekérjük a felhasználót
        const { data: existingUser } = await adminClient.auth.admin.listUsers()
        const adminUser = existingUser.users.find(u => u.email === email)
        
        if (!adminUser) {
          console.error('❌ Nem található a felhasználó!')
          process.exit(1)
        }

        // Frissítjük a profilt
        const { error: profileError } = await adminClient
          .from('profiles')
          .upsert({
            id: adminUser.id,
            email: email,
            full_name: fullName,
            is_admin: true
          })

        if (profileError) {
          console.error('❌ Hiba a profil frissítésekor:', profileError.message)
          process.exit(1)
        }

        console.log('✅ Admin jogosultság beállítva!')
        console.log('\n📋 Bejelentkezési adatok:')
        console.log('   Felhasználónév: admin')
        console.log('   Jelszó: Belike911')
        console.log('\n🎉 Kész! Most már be tudsz jelentkezni az admin felhasználóval!')
        process.exit(0)
      } else {
        throw userError
      }
    }

    if (!userData?.user) {
      throw new Error('Nem sikerült létrehozni a felhasználót')
    }

    console.log('✅ Felhasználó létrehozva!')

    // 2. Várunk egy kicsit, hogy a trigger lefusson
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 3. Beállítjuk az admin jogosultságot
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userData.user.id,
        email: email,
        full_name: fullName,
        is_admin: true
      })

    if (profileError) {
      console.error('⚠️  Figyelem: A profil automatikusan létrejött, de az admin jogosultságot manuálisan kell beállítani.')
      console.error('   Menj a Supabase Dashboard → Table Editor → profiles tábla')
      console.error(`   Keresd meg a felhasználót (email: ${email}) és állítsd az is_admin mezőt true-ra.`)
      console.error('   Hiba:', profileError.message)
    } else {
      console.log('✅ Admin jogosultság beállítva!')
    }

    console.log('\n📋 Bejelentkezési adatok:')
    console.log('   Felhasználónév: admin')
    console.log('   Jelszó: Belike911')
    console.log('\n🎉 Kész! Most már be tudsz jelentkezni az admin felhasználóval!')

  } catch (error) {
    console.error('❌ Hiba:', error.message)
    process.exit(1)
  }
}

createAdmin()
