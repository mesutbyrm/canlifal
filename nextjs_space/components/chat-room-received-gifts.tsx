'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, ChevronDown, ChevronUp } from 'lucide-react'

interface ChatRoomReceivedGiftsProps {
  language: string
  isFacebook: boolean
  isCosmic: boolean
  textPrimary: string
  textSecondary: string
}

interface ReceivedGift {
  id: string
  giftName: string
  giftIcon: string
  senderName: string
  senderImage: string | null
  amount: number
  currencyType: string
  roomName: string
  createdAt: string
}

export default function ChatRoomReceivedGifts({ language, isFacebook, isCosmic, textPrimary, textSecondary }: ChatRoomReceivedGiftsProps) {
  const [gifts, setGifts] = useState<ReceivedGift[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/user/received-gifts')
        if (res.ok) {
          const data = await res.json()
          setGifts(data.gifts || [])
        }
      } catch (err) {
        console.error('Failed to fetch received gifts:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchGifts()
  }, [])

  if (gifts.length === 0 && !loading) return null

  const jetonTotal = gifts.filter(g => g.currencyType === 'jeton').reduce((sum, g) => sum + g.amount, 0)
  const cfcTotal = gifts.filter(g => g.currencyType === 'cfc').reduce((sum, g) => sum + g.amount, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={`rounded-2xl border overflow-hidden ${
        isFacebook ? 'bg-white border-blue-200 shadow' : isCosmic ? 'bg-blue-900/30 border-blue-500/30' : 'bg-purple-900/30 border-fuchsia-500/30'
      }`}>
      <button onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 ${isFacebook ? 'hover:bg-blue-50' : 'hover:bg-white/5'} transition-colors`}>
        <div className="flex items-center gap-2">
          <Gift className={`w-4 h-4 ${isFacebook ? 'text-yellow-500' : 'text-yellow-400'}`} />
          <span className={`text-sm font-semibold ${textPrimary}`}>
            {'Sohbet Odası Hediyeleri'}
          </span>
          <span className={`text-[10px] ${textSecondary}`}>
            ({gifts.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {jetonTotal > 0 && <span className="text-[10px] text-yellow-400">💎{jetonTotal}</span>}
          {cfcTotal > 0 && <span className="text-[10px] text-blue-400">💰{cfcTotal}</span>}
          {isOpen ? <ChevronUp className={`w-4 h-4 ${textSecondary}`} /> : <ChevronDown className={`w-4 h-4 ${textSecondary}`} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`px-3 pb-3 border-t ${isFacebook ? 'border-gray-100' : isCosmic ? 'border-blue-800/30' : 'border-purple-800/30'}`}>
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {gifts.map((g) => (
                  <div key={g.id} className={`flex items-center justify-between p-2 rounded-xl ${
                    isFacebook ? 'bg-gray-50' : isCosmic ? 'bg-blue-900/20' : 'bg-purple-900/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{g.giftIcon}</span>
                      <div>
                        <p className={`text-xs font-medium ${textPrimary}`}>
                          {g.senderName} <span className={textSecondary}>→</span> {g.giftName}
                        </p>
                        <p className={`text-[10px] ${textSecondary}`}>
                          {g.roomName} • {new Date(g.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${g.currencyType === 'jeton' ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {g.amount} {g.currencyType === 'jeton' ? '💎' : '💰'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
