'use client'
import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/')
        router.refresh()
      } else {
        setChecking(false)
      }
    }
    checkSession()
  }, [router])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Ékezetes karakterek lecserélése ASCII karakterekre (ugyanaz, mint a user creation-nél)
    const removeAccents = (str) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Ékezetek eltávolítása
        .replace(/[^a-z0-9@._-]/g, '') // Csak alfanumerikus karakterek, @, ., _, - maradhat
    }

    const normalized = username.trim().toLowerCase()
    const cleanUsername = removeAccents(normalized)
    const email = normalized.includes('@') 
      ? removeAccents(normalized) 
      : `${cleanUsername}@munkaido.local`
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Bejelentkezési hiba:', error)
      alert('Hibás email cím vagy jelszó.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Ellenőrzés...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl dark:shadow-gray-800/50 w-full max-w-md border border-gray-200 dark:border-gray-800">
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm">
            A Supabase nincs beállítva. Töltsd ki a <code className="bg-black/10 dark:bg-white/10 px-1 rounded">.env.local</code> fájlt (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY), majd indítsd újra: <code className="bg-black/10 dark:bg-white/10 px-1 rounded">npm run dev</code>.
          </div>
        )}
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Bejelentkezés
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Felhasználónév</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="pl. kovacs.janos"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tipp: ékezet nélkül add meg (példa: &quot;Belián&quot; → &quot;belian&quot;).
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jelszó</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50">
            {loading ? 'Betöltés...' : 'Belépés'}
          </button>
        </form>
      </div>
    </div>
  )
}
