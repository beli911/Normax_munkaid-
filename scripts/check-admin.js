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

async function checkAdmin() {
  try {
    const { data: users } = await adminClient.auth.admin.listUsers()
    const adminUser = users.users.find(u => u.email === 'admin@munkaido.local')
    
    if (!adminUser) {
      console.log('❌ Admin felhasználó nem található!')
      return
    }

    console.log('✅ Admin felhasználó található:', adminUser.email)
    console.log('   ID:', adminUser.id)

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single()

    if (error) {
      console.log('❌ Hiba a profil lekérésekor:', error.message)
      return
    }

    if (!profile) {
      console.log('❌ Profil nem található! Létrehozom...')
      const { error: createError } = await adminClient
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: adminUser.email,
          full_name: 'Admin',
          is_admin: true
        })
      if (createError) {
        console.log('❌ Hiba a profil létrehozásakor:', createError.message)
      } else {
        console.log('✅ Profil létrehozva!')
      }
      return
    }

    console.log('📋 Profil adatok:')
    console.log('   Email:', profile.email)
    console.log('   Név:', profile.full_name)
    console.log('   is_admin:', profile.is_admin)

    if (!profile.is_admin) {
      console.log('⚠️  Az is_admin false! Frissítem...')
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', adminUser.id)
      
      if (updateError) {
        console.log('❌ Hiba a frissítéskor:', updateError.message)
      } else {
        console.log('✅ Admin jogosultság beállítva!')
      }
    } else {
      console.log('✅ Admin jogosultság már be van állítva!')
    }

  } catch (error) {
    console.error('❌ Hiba:', error.message)
  }
}

checkAdmin()
