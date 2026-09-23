'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Loader2, Heart, Star, ArrowLeft, Wifi, WifiOff, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TELLER_LEVELS } from '@/lib/teller-levels'

interface FavoriteTellerItem {
  id: string
  tellerId: string
  teller: {
    id: string; userId: string; displayName: string; avatar: string | null;
    specialties: string[]; rating: number; isOnline: boolean; pricePerSession: number; tellerLevel: string;
  }
}

export default function FavorilerPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteTellerItem[]>([])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/favorite-tellers')
      .then(r => r.json())
      .then(d => { setFavorites(d.favorites || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session])

  const handleRemove = async (tellerId: string) => {
    await fetch('/api/favorite-tellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tellerId }),
    })
    setFavorites(favorites.filter(f => f.tellerId !== tellerId))
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-pink-400" /> Favori Falcılarım</h1>
          <p className="text-xs text-gray-400">Kaydettiğin falcılara hızlı erişim</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-2">Henüz favori falcın yok</p>
          <Link href="/canli-falcilar" className="text-purple-400 text-sm hover:underline">Falcıları Keşfet →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((f, i) => {
            const lvl = TELLER_LEVELS[f.teller.tellerLevel as keyof typeof TELLER_LEVELS] || TELLER_LEVELS.bronze
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <Link href={`/canli-falcilar`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden">
                      {f.teller.avatar ? <Image src={f.teller.avatar} alt={f.teller.displayName} width={48} height={48} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-lg">{lvl.emoji}</div>}
                    </div>
                    {f.teller.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-950" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white truncate">{f.teller.displayName}</span>
                      <span className="text-xs">{lvl.emoji}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400" />{f.teller.rating.toFixed(1)}</span>
                      <span>{f.teller.pricePerSession} J/dk</span>
                      <span className={f.teller.isOnline ? 'text-green-400' : 'text-gray-600'}>{f.teller.isOnline ? '● Çevrimiçi' : '○ Çevrimdışı'}</span>
                    </div>
                    {f.teller.specialties.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {f.teller.specialties.slice(0, 3).map((s, si) => (
                          <span key={si} className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                <button onClick={() => handleRemove(f.tellerId)} className="p-2 text-gray-500 hover:text-red-400 transition-all flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
