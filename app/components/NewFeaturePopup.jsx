'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function NewFeaturePopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Ellenőrizzük a localStorage-t
    const hasUsedNewVersion = localStorage.getItem('hasUsedNewVersion')
    
    // Ha még nem használta, mutassuk meg
    if (hasUsedNewVersion !== 'true') {
      setShow(true)
      
      // Automatikusan bezár 5 másodperc után
      const timer = setTimeout(() => {
        setShow(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up">
      <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 dark:border-gray-700 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Bezárás"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="text-4xl">🌙</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-100 mb-1">
              Újdonság: Megérkezett a Sötét Mód!
            </h3>
            <p className="text-sm text-gray-400">
              Most már választhatsz a világos és sötét mód között. A választásod automatikusan megjegyződik!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
