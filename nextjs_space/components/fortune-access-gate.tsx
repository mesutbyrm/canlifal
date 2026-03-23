'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Sparkles, LogIn, UserPlus, Play, Coins, ShoppingCart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AdWatchModal from './ad-watch-modal'

interface FortuneAccessGateProps {
  fortuneType: string // e.g. 'tarot', 'coffee'
  cost: number
  children: React.ReactNode
  onAccessGranted?: () => void
}

type AccessStatus = 'loading' | 'allowed' | 'needs_ad' | 'needs_login' | 'needs_cfc' | 'error'

export default function FortuneAccessGate({ fortuneType, cost, children, onAccessGranted }: FortuneAccessGateProps) {
  const { data: session, status: sessionStatus } = useSession() || {}
  const router = useRouter()
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('loading')
  const [showAdModal, setShowAdModal] = useState(false)
  const [adWatched, setAdWatched] = useState(false)
  const [ipStatus, setIpStatus] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [userCredits, setUserCredits] = useState<number | null>(null)

  useEffect(() => {
    if (sessionStatus === 'loading') return
    checkAccess()
  }, [sessionStatus])

  const checkAccess = async () => {
    setAccessStatus('loading')
    try {
      if (!session?.user) {
        // Unregistered user - check IP status
        const res = await fetch('/api/fortune-access/ip-status')
        const data = await res.json()
        setIpStatus(data)

        if (data.canUseFree) {
          setAccessStatus('allowed')
        } else if (data.canWatchAd) {
          setAccessStatus('needs_ad')
        } else {
          setAccessStatus('needs_login')
        }
      } else {
        // Registered user - check CFC
        const res = await fetch('/api/fortune-access/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fortuneType }),
        })
        const data = await res.json()

        if (data.allowed) {
          // Will check again when actually submitting
          setAccessStatus('allowed')
          if (data.newBalance !== undefined) setUserCredits(data.newBalance)
        } else if (data.reason === 'needs_cfc') {
          setAccessStatus('needs_cfc')
          setUserCredits(data.newBalance ?? 0)
          setMessage(data.message)
        } else {
          setAccessStatus('error')
          setMessage(data.message)
        }
      }
    } catch {
      // Default to allowed on error (don't block fortune)
      setAccessStatus('allowed')
    }
  }

  const handleAdReward = () => {
    setAdWatched(true)
    setAccessStatus('allowed')
    setShowAdModal(false)
    onAccessGranted?.()
  }

  // If still loading session
  if (sessionStatus === 'loading' || accessStatus === 'loading') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500 mx-auto" />
        <p className="text-purple-300 mt-3 text-sm">Kontrol ediliyor...</p>
      </div>
    )
  }

  // Access granted - show fortune form
  if (accessStatus === 'allowed') {
    return <>{children}</>
  }

  // Needs ad watching (unregistered, 2nd fortune)
  if (accessStatus === 'needs_ad') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 space-y-4"
        >
          <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
            <Play className="w-10 h-10 text-gold-500 mx-auto mb-2" />
            <h3 className="text-white font-bold text-lg">Günlük Ücretsiz Falınızı Kullandınız</h3>
            <p className="text-purple-300 text-sm mt-2">
              Kısa bir reklam izleyerek 2. ücretsiz fal hakkınızı kazanabilirsiniz!
            </p>
          </div>
          <button
            onClick={() => setShowAdModal(true)}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Reklam İzle & Ücretsiz Fal Baktır
          </button>
          <div className="text-center">
            <p className="text-purple-400 text-xs">veya</p>
            <button
              onClick={() => router.push('/kayit-ol')}
              className="mt-2 text-gold-400 hover:text-gold-300 text-sm underline"
            >
              Üye olarak sınırsız fal baktırın
            </button>
          </div>
        </motion.div>
        <AdWatchModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onRewardEarned={handleAdReward} />
      </>
    )
  }

  // Needs login (unregistered, daily limit reached)
  if (accessStatus === 'needs_login') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6 space-y-4"
      >
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <LogIn className="w-10 h-10 text-purple-400 mx-auto mb-2" />
          <h3 className="text-white font-bold text-lg">Günlük Ücretsiz Fal Hakkınız Doldu</h3>
          <p className="text-purple-300 text-sm mt-2">
            Daha fazla fal baktırmak için giriş yapın veya üye olun
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/giris')}
            className="flex-1 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Giriş Yap
          </button>
          <button
            onClick={() => router.push('/kayit-ol')}
            className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Üye Ol
          </button>
        </div>
      </motion.div>
    )
  }

  // Needs CFC (registered user, insufficient credits)
  if (accessStatus === 'needs_cfc') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 space-y-4"
        >
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <Coins className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <h3 className="text-white font-bold text-lg">Yetersiz CFC</h3>
            <p className="text-purple-300 text-sm mt-2">
              Bu fal <span className="text-gold-400 font-bold">{cost} CFC</span> gerektiriyor.
              Bakiyeniz: <span className="text-red-400 font-bold">{userCredits ?? 0} CFC</span>
            </p>
          </div>

          {/* Watch ad option */}
          <button
            onClick={() => setShowAdModal(true)}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Reklam İzle & Ücretsiz Fal Baktır
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/jeton')}
              className="flex-1 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              CFC Satın Al
            </button>
            <button
              onClick={() => setShowAdModal(true)}
              className="flex-1 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Reklam İzle & Bonus
            </button>
          </div>
        </motion.div>
        <AdWatchModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onRewardEarned={handleAdReward} />
      </>
    )
  }

  // Error fallback
  return (
    <div className="text-center py-6">
      <p className="text-red-400">{message || 'Bir hata oluştu'}</p>
      <button onClick={checkAccess} className="mt-3 text-gold-400 underline text-sm">Tekrar Dene</button>
    </div>
  )
}
