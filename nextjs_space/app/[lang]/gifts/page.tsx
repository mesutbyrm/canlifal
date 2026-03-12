'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Gift, Coins, Search, Send, Check, Loader2, X, Sparkles, UserPlus
} from 'lucide-react'

interface GiftType {
  id: string
  name: string
  nameEn: string
  icon: string
  price: number
  sortOrder: number
}

interface SearchUser {
  id: string
  name: string
  username: string | null
  image: string | null
}

export default function GiftsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()

  const [giftTypes, setGiftTypes] = useState<GiftType[]>([])
  const [selectedTab, setSelectedTab] = useState<'gift' | 'jeton'>('gift')
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null)
  const [jetonAmount, setJetonAmount] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
  const [sending, setSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [showBlockPopup, setShowBlockPopup] = useState(false)
  const [bigGiftPopup, setBigGiftPopup] = useState<{
    senderName: string
    recipientName: string
    giftIcon: string
    giftType: string
    amount: number
  } | null>(null)

  // Theme
  const isFalclub = theme === 'falclub' || theme === 'falci'
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? 'bg-[#0a1628]' : 'bg-[#0f0520]'
  const cardBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-white/5 border-blue-500/20' : 'bg-[#1a0a2e]/80 border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-200' : 'text-purple-200'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const btnGradient = isFacebook ? 'from-blue-500 to-blue-600' : isCosmic ? 'from-blue-500 to-cyan-500' : 'from-fuchsia-500 to-purple-600'
  const inputBg = isFacebook ? 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400' : isCosmic ? 'bg-blue-900/30 border-blue-500/30 text-white placeholder-blue-300' : 'bg-purple-900/30 border-fuchsia-500/30 text-white placeholder-purple-300'
  const tabActive = isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-500 text-white' : 'bg-fuchsia-500 text-white'
  const tabInactive = isFacebook ? 'bg-gray-200 text-gray-600' : isCosmic ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'
  const giftItemBg = isFacebook ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : isCosmic ? 'bg-blue-900/20 border-blue-500/20 hover:border-blue-400/50' : 'bg-purple-900/20 border-fuchsia-500/20 hover:border-fuchsia-400/50'
  const giftItemSelected = isFacebook ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300' : isCosmic ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/30' : 'bg-fuchsia-500/20 border-fuchsia-400 ring-2 ring-fuchsia-400/30'
  const avatarBorder = isFacebook ? 'from-blue-400 to-blue-600' : isCosmic ? 'from-blue-400 to-cyan-500' : 'from-fuchsia-500 to-purple-600'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${language}/login`)
      return
    }
    fetchGiftTypes()
  }, [status])

  const fetchGiftTypes = async () => {
    try {
      const res = await fetch('/api/gifts/types')
      if (res.ok) setGiftTypes(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (res.ok) setSearchResults(await res.json())
    } catch (e) { console.error(e) } finally { setSearching(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchUsers])

  const handleSend = async () => {
    if (!selectedUser) { setErrorMsg(language === 'tr' ? 'L\u00fctfen bir kullan\u0131c\u0131 se\u00e7in' : 'Please select a user'); return }
    if (selectedTab === 'gift' && !selectedGift) { setErrorMsg(language === 'tr' ? 'L\u00fctfen bir hediye se\u00e7in' : 'Please select a gift'); return }
    if (selectedTab === 'jeton' && (!jetonAmount || parseInt(jetonAmount) < 1)) { setErrorMsg(language === 'tr' ? 'Ge\u00e7erli bir jeton miktar\u0131 girin' : 'Enter a valid jeton amount'); return }

    setSending(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const body: Record<string, unknown> = {
        recipientUsername: selectedUser.username || selectedUser.id,
        type: selectedTab
      }
      if (selectedTab === 'gift') body.giftTypeId = selectedGift!.id
      if (selectedTab === 'jeton') body.jetonAmount = parseInt(jetonAmount)

      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(data.message)
        setSelectedGift(null)
        setJetonAmount('')
        setSelectedUser(null)
        setSearchQuery('')
        // Show big gift celebration popup
        if (data.bigGift) {
          setBigGiftPopup(data.bigGift)
        }
      } else if (data.error === 'reciprocal_blocked') {
        // Show the fun block popup
        setShowBlockPopup(true)
        setTimeout(() => setShowBlockPopup(false), 5000)
      } else {
        setErrorMsg(data.error || 'An error occurred')
      }
    } catch (e) {
      console.error(e)
      setErrorMsg('Network error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentColor} animate-spin`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} py-20 px-4 pb-32`}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${btnGradient} flex items-center justify-center mx-auto mb-4`}>
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-2`}>
            {language === 'tr' ? 'Arkada\u015flar\u0131na Hediye G\u00f6nder' : 'Send Gifts to Friends'}
          </h1>
          <p className={textSecondary}>
            {language === 'tr' ? 'Hediye veya jeton g\u00f6ndererek arkada\u015flar\u0131n\u0131 mutlu et' : 'Make your friends happy with gifts or jetons'}
          </p>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-4 bg-green-500/20 border border-green-500/40 rounded-xl flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm flex-1">{successMsg}</p>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 text-green-400" /></button>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3">
              <X className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm flex-1">{errorMsg}</p>
              <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 text-red-400" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Search User */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-2xl p-5 border mb-4 ${cardBg}`}>
          <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}>
            <UserPlus className={`w-5 h-5 ${accentColor}`} />
            {language === 'tr' ? '1. Ki\u015fi Se\u00e7' : '1. Select Person'}
          </h3>

          {selectedUser ? (
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br ${avatarBorder} flex-shrink-0`}>
                {selectedUser.image ? (
                  <Image src={selectedUser.image} alt={selectedUser.name} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{selectedUser.name.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="flex-1">
                <p className={`${textPrimary} font-medium`}>{selectedUser.name}</p>
                <p className={`${textSecondary} text-sm`}>@{selectedUser.username || 'user'}</p>
              </div>
              <button onClick={() => { setSelectedUser(null); setSearchQuery('') }}
                className={`p-2 rounded-lg ${isFacebook ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'tr' ? 'Kullan\u0131c\u0131 ad\u0131 veya isim ara...' : 'Search username or name...'}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm ${inputBg} focus:outline-none`}
              />
              {searching && <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${accentColor} animate-spin`} />}

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && !selectedUser && (
                <div className={`absolute z-20 w-full mt-2 rounded-xl border shadow-xl overflow-hidden ${isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-[#0d1f3c] border-blue-500/30' : 'bg-[#1a0a2e] border-fuchsia-500/30'}`}>
                  {searchResults.map(user => (
                    <button key={user.id} onClick={() => { setSelectedUser(user); setSearchResults([]) }}
                      className={`w-full flex items-center gap-3 p-3 ${isFacebook ? 'hover:bg-gray-50' : isCosmic ? 'hover:bg-blue-900/30' : 'hover:bg-purple-900/30'} transition-colors`}>
                      <div className={`w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br ${avatarBorder}`}>
                        {user.image ? (
                          <Image src={user.image} alt={user.name} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className={`${textPrimary} text-sm font-medium`}>{user.name}</p>
                        <p className={`${textSecondary} text-xs`}>@{user.username || 'user'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Step 2: Choose Type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`rounded-2xl p-5 border mb-4 ${cardBg}`}>
          <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}>
            <Sparkles className={`w-5 h-5 ${accentColor}`} />
            {language === 'tr' ? '2. G\u00f6nderim T\u00fcr\u00fc' : '2. Gift Type'}
          </h3>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setSelectedTab('gift')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${selectedTab === 'gift' ? tabActive : tabInactive}`}>
              🎁 {language === 'tr' ? 'Hediye' : 'Gift'}
            </button>
            <button onClick={() => setSelectedTab('jeton')}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${selectedTab === 'jeton' ? tabActive : tabInactive}`}>
              🪙 {language === 'tr' ? 'Jeton' : 'Jeton'}
            </button>
          </div>

          {selectedTab === 'gift' ? (
            <div className="grid grid-cols-4 gap-2">
              {giftTypes.map(gift => (
                <button key={gift.id} onClick={() => setSelectedGift(gift.id === selectedGift?.id ? null : gift)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                    selectedGift?.id === gift.id ? giftItemSelected : giftItemBg
                  }`}>
                  <span className="text-2xl mb-1">{gift.icon}</span>
                  <span className={`text-[10px] ${textPrimary} font-medium`}>
                    {language === 'tr' ? gift.name : gift.nameEn}
                  </span>
                  <span className={`text-[10px] ${accentColor} font-bold mt-0.5`}>{gift.price} ₺</span>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label className={`${textSecondary} text-sm mb-2 block`}>
                {language === 'tr' ? 'G\u00f6nderilecek jeton miktar\u0131:' : 'Jeton amount to send:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={jetonAmount}
                  onChange={(e) => setJetonAmount(e.target.value)}
                  placeholder="0"
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm ${inputBg} focus:outline-none`}
                />
              </div>
              <div className="flex gap-2 mt-3">
                {[5, 10, 25, 50, 100].map(amt => (
                  <button key={amt} onClick={() => setJetonAmount(String(amt))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      jetonAmount === String(amt) ? tabActive : tabInactive
                    }`}>
                    {amt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Send Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button
            onClick={handleSend}
            disabled={sending || !selectedUser || (selectedTab === 'gift' && !selectedGift) || (selectedTab === 'jeton' && (!jetonAmount || parseInt(jetonAmount) < 1))}
            className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${btnGradient} flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg`}
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                {language === 'tr' ? 'G\u00f6nder' : 'Send'}
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Reciprocal Block Popup */}
      <AnimatePresence>
        {showBlockPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowBlockPopup(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className={`max-w-sm w-full rounded-3xl p-8 text-center border-2 ${
                isCosmic
                  ? 'bg-gradient-to-br from-blue-900 to-indigo-900 border-blue-400/40'
                  : isFacebook
                  ? 'bg-white border-blue-300'
                  : 'bg-gradient-to-br from-purple-900 to-fuchsia-900 border-fuchsia-400/40'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">🔮</div>
              <p className={`text-xl font-bold mb-2 ${isFacebook ? 'text-gray-900' : 'text-white'}`}>
                Kurnazlık yapma
              </p>
              <p className={`text-2xl font-bold mb-4 ${isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-300' : 'text-fuchsia-300'}`}>
                biz geleceği görürüz 😜
              </p>
              <div className={`text-sm ${isFacebook ? 'text-gray-500' : 'text-white/50'}`}>
                {language === 'tr' ? '5 saniye sonra kapanacak...' : 'Closing in 5 seconds...'}
              </div>
              {/* Progress bar */}
              <div className={`mt-4 h-1 rounded-full overflow-hidden ${isFacebook ? 'bg-gray-200' : 'bg-white/10'}`}>
                <div
                  className={`h-full rounded-full ${
                    isFacebook ? 'bg-blue-500' : isCosmic ? 'bg-blue-400' : 'bg-fuchsia-400'
                  }`}
                  style={{
                    animation: 'shrinkBar 5s linear forwards',
                    width: '100%'
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Gift Celebration Popup */}
      <AnimatePresence>
        {bigGiftPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={() => setBigGiftPopup(null)}
          >
            {/* Floating emojis background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => {
                const seed = (i * 37 + 13) % 100
                const seed2 = (i * 53 + 7) % 100
                const emojis = ['🎉', '🎊', '✨', '💎', '🌟', '🔥', '💫', '🪙', bigGiftPopup.giftIcon]
                return (
                  <motion.div
                    key={i}
                    initial={{ y: '110vh', opacity: 0.8, scale: 0.5 + (seed / 100) }}
                    animate={{ y: '-10vh', opacity: 0 }}
                    transition={{ duration: 3 + (seed2 / 33), delay: (seed / 50), repeat: Infinity, repeatDelay: (seed2 / 50) }}
                    className="absolute text-2xl md:text-4xl"
                    style={{ left: `${seed}%` }}
                  >
                    {emojis[i % emojis.length]}
                  </motion.div>
                )
              })}
            </div>

            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotateZ: -10 }}
              animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className={`relative max-w-sm w-full rounded-3xl p-8 text-center border-2 overflow-hidden ${
                isCosmic
                  ? 'bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 border-yellow-400/60'
                  : isFacebook
                  ? 'bg-gradient-to-br from-white to-blue-50 border-yellow-400'
                  : 'bg-gradient-to-br from-purple-900 via-fuchsia-900 to-purple-950 border-yellow-400/60'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 30%, rgba(255,215,0,0.12) 50%, transparent 70%)',
                  animation: 'popupShimmer 2s linear infinite',
                  backgroundSize: '200% 200%'
                }}
              />

              {/* Gift icon with pulse */}
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-7xl mb-3"
              >
                {bigGiftPopup.giftIcon}
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-lg font-bold mb-1" style={{
                  background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  🎉 {language === 'tr' ? 'BÜYÜK HEDİYE!' : 'BIG GIFT!'} 🎉
                </p>
              </motion.div>

              {/* Sender → Recipient */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="my-4"
              >
                <p className={`text-xl font-extrabold ${isFacebook ? 'text-gray-900' : 'text-white'}`}>
                  {bigGiftPopup.senderName}
                </p>
                <p className={`text-3xl my-2 ${isFacebook ? 'text-blue-500' : isCosmic ? 'text-yellow-400' : 'text-yellow-400'}`}>
                  ➜
                </p>
                <p className={`text-xl font-extrabold ${isFacebook ? 'text-gray-900' : 'text-white'}`}>
                  {bigGiftPopup.recipientName}
                </p>
              </motion.div>

              {/* Gift details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={`rounded-2xl py-3 px-4 mb-5 ${
                  isFacebook ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}
              >
                <p className="text-3xl mb-1">{bigGiftPopup.giftIcon}</p>
                <p className={`font-bold text-lg ${isFacebook ? 'text-gray-800' : 'text-yellow-300'}`}>
                  {bigGiftPopup.giftType === 'Jeton'
                    ? `${bigGiftPopup.amount.toLocaleString()} Jeton`
                    : bigGiftPopup.giftType}
                </p>
                {bigGiftPopup.giftType !== 'Jeton' && (
                  <p className={`text-sm ${isFacebook ? 'text-gray-500' : 'text-yellow-400/70'}`}>
                    {bigGiftPopup.amount.toLocaleString()} ₺
                  </p>
                )}
              </motion.div>

              {/* Close button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.65 }}
                onClick={() => setBigGiftPopup(null)}
                className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${btnGradient} hover:opacity-90 transition-all`}
              >
                {language === 'tr' ? 'Harika! ✨' : 'Awesome! ✨'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes shrinkBar {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes popupShimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
      `}</style>
    </div>
  )
}
