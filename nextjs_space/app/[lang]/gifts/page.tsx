'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Gift, Coins, Search, Send, Check, Loader2, X, Sparkles, UserPlus,
  ArrowLeft, Heart, Wallet, ChevronRight, Star, Zap
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
  const [userJetonBalance, setUserJetonBalance] = useState(0)
  const [bigGiftPopup, setBigGiftPopup] = useState<{
    senderName: string
    recipientName: string
    giftIcon: string
    giftType: string
    amount: number
  } | null>(null)

  // Theme - simplified for dark theme focus
  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${language}/login`)
      return
    }
    fetchGiftTypes()
    fetchBalance()
  }, [status])

  const fetchGiftTypes = async () => {
    try {
      const res = await fetch('/api/gifts/types')
      if (res.ok) setGiftTypes(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json()
        setUserJetonBalance(data.jetonBalance || 0)
      }
    } catch (e) { console.error(e) }
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
    if (!selectedUser) { setErrorMsg(language === 'tr' ? 'Lütfen bir kullanıcı seçin' : 'Please select a user'); return }
    if (selectedTab === 'gift' && !selectedGift) { setErrorMsg(language === 'tr' ? 'Lütfen bir hediye seçin' : 'Please select a gift'); return }
    if (selectedTab === 'jeton' && (!jetonAmount || parseInt(jetonAmount) < 5)) { setErrorMsg(language === 'tr' ? 'Minimum 5 jeton gönderebilirsiniz' : 'Minimum 5 jetons required'); return }
    if (selectedTab === 'jeton' && parseInt(jetonAmount) > 100000) { setErrorMsg(language === 'tr' ? 'Maksimum 100.000 jeton gönderebilirsiniz' : 'Maximum 100,000 jetons allowed'); return }

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
        fetchBalance()
        if (data.bigGift) {
          setBigGiftPopup(data.bigGift)
        }
      } else if (data.error === 'reciprocal_blocked') {
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

  const totalCost = selectedTab === 'gift' ? (selectedGift?.price || 0) : (parseInt(jetonAmount) || 0)
  const canSend = selectedUser && ((selectedTab === 'gift' && selectedGift) || (selectedTab === 'jeton' && jetonAmount && parseInt(jetonAmount) >= 5 && parseInt(jetonAmount) <= 100000))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"
          >
            <Gift className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-purple-300 text-sm">{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#150525] to-[#0a0118] pt-16 sm:pt-20 px-3 sm:px-4 pb-32">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <motion.div 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30"
            animate={{ boxShadow: ['0 0 20px rgba(236,72,153,0.3)', '0 0 40px rgba(236,72,153,0.5)', '0 0 20px rgba(236,72,153,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {language === 'tr' ? '🎁 Hediye Gönder' : '🎁 Send Gift'}
          </h1>
          <p className="text-purple-200/70 text-sm sm:text-base">
            {language === 'tr' ? 'Arkadaşlarını mutlu et!' : 'Make your friends happy!'}
          </p>
        </motion.div>

        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/30 rounded-xl sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <p className="text-amber-200/70 text-xs sm:text-sm">{language === 'tr' ? 'Bakiyeniz' : 'Your Balance'}</p>
                <p className="text-white font-bold text-lg sm:text-xl">{userJetonBalance.toLocaleString()} <span className="text-amber-400 text-sm">Jeton</span></p>
              </div>
            </div>
            <Link 
              href={`/${language}/credits`}
              className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-lg sm:rounded-xl text-xs sm:text-sm hover:from-amber-600 hover:to-yellow-600 transition-all flex items-center gap-1"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              {language === 'tr' ? 'Yükle' : 'Top Up'}
            </Link>
          </div>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl sm:rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-emerald-200 text-sm flex-1">{successMsg}</p>
              <button onClick={() => setSuccessMsg('')} className="p-1"><X className="w-4 h-4 text-emerald-400" /></button>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl sm:rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-red-200 text-sm flex-1">{errorMsg}</p>
              <button onClick={() => setErrorMsg('')} className="p-1"><X className="w-4 h-4 text-red-400" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Search User */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-fuchsia-500 flex items-center justify-center text-xs font-bold">1</div>
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />
            {language === 'tr' ? 'Kişi Seç' : 'Select Person'}
          </h3>

          {selectedUser ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded-xl"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 flex-shrink-0 ring-2 ring-fuchsia-400/50">
                {selectedUser.image ? (
                  <Image src={selectedUser.image} alt={selectedUser.name} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">{selectedUser.name.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate text-sm sm:text-base">{selectedUser.name}</p>
                <p className="text-fuchsia-300 text-xs sm:text-sm truncate">@{selectedUser.username || 'user'}</p>
              </div>
              <button onClick={() => { setSelectedUser(null); setSearchQuery('') }}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'tr' ? 'Kullanıcı adı veya isim ara...' : 'Search username or name...'}
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-xl bg-purple-900/50 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 text-sm sm:text-base transition-all"
              />
              {searching && <Loader2 className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400 animate-spin" />}

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && !selectedUser && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-30 w-full mt-2 rounded-xl border border-purple-500/30 shadow-2xl overflow-hidden bg-[#1a0a2e] max-h-60 overflow-y-auto"
                  >
                    {searchResults.map((user, i) => (
                      <motion.button 
                        key={user.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => { setSelectedUser(user); setSearchResults([]) }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-purple-900/50 transition-colors border-b border-purple-500/10 last:border-b-0"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600">
                          {user.image ? (
                            <Image src={user.image} alt={user.name} width={48} height={48} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div>
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{user.name}</p>
                          <p className="text-purple-300 text-xs truncate">@{user.username || 'user'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Step 2: Choose Type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-fuchsia-500 flex items-center justify-center text-xs font-bold">2</div>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />
            {language === 'tr' ? 'Ne Göndermek İstiyorsun?' : 'What to Send?'}
          </h3>

          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4 p-1 bg-purple-900/50 rounded-xl">
            <button onClick={() => setSelectedTab('gift')}
              className={`flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                selectedTab === 'gift' 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' 
                  : 'text-purple-300 hover:text-white'
              }`}>
              🎁 {language === 'tr' ? 'Hediye' : 'Gift'}
            </button>
            <button onClick={() => setSelectedTab('jeton')}
              className={`flex-1 py-2.5 sm:py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                selectedTab === 'jeton' 
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg' 
                  : 'text-purple-300 hover:text-white'
              }`}>
              🪙 {language === 'tr' ? 'Jeton' : 'Jeton'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {selectedTab === 'gift' ? (
              <motion.div
                key="gifts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3"
              >
                {giftTypes.map((gift, i) => (
                  <motion.button 
                    key={gift.id} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedGift(gift.id === selectedGift?.id ? null : gift)}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex flex-col items-center p-2.5 sm:p-3 rounded-xl border transition-all ${
                      selectedGift?.id === gift.id 
                        ? 'bg-gradient-to-br from-pink-500/30 to-purple-500/30 border-pink-500 ring-2 ring-pink-400/30 shadow-lg shadow-pink-500/20' 
                        : 'bg-purple-900/30 border-purple-500/30 hover:border-fuchsia-500/50'
                    }`}
                  >
                    {selectedGift?.id === gift.id && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    <span className="text-2xl sm:text-3xl mb-1">{gift.icon}</span>
                    <span className="text-white text-[10px] sm:text-xs font-medium text-center leading-tight">
                      {language === 'tr' ? gift.name : gift.nameEn}
                    </span>
                    <span className="text-fuchsia-400 text-[10px] sm:text-xs font-bold mt-0.5">{gift.price}</span>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="jeton"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="relative mb-3">
                  <Coins className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                  <input
                    type="number"
                    min="5"
                    max="100000"
                    value={jetonAmount}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100000)) {
                        setJetonAmount(val)
                      }
                    }}
                    placeholder={language === 'tr' ? 'Jeton miktarı girin...' : 'Enter jeton amount...'}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-xl bg-purple-900/50 border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-lg font-medium"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[10, 25, 50, 100, 250, 500, 1000].map(amt => (
                    <button 
                      key={amt} 
                      onClick={() => setJetonAmount(String(amt))}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        jetonAmount === String(amt) 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' 
                          : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Balance Check */}
                {jetonAmount && parseInt(jetonAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl text-sm ${
                      parseInt(jetonAmount) > userJetonBalance 
                        ? 'bg-red-500/20 border border-red-500/40' 
                        : parseInt(jetonAmount) < 5
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-emerald-500/20 border border-emerald-500/40'
                    }`}
                  >
                    {parseInt(jetonAmount) > userJetonBalance ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-red-300">⚠️ {(parseInt(jetonAmount) - userJetonBalance).toLocaleString()} jeton eksik</span>
                        <Link 
                          href={`/${language}/credits`}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold"
                        >
                          {language === 'tr' ? 'Yükle' : 'Top Up'}
                        </Link>
                      </div>
                    ) : parseInt(jetonAmount) < 5 ? (
                      <span className="text-amber-300">⚠️ {language === 'tr' ? 'Minimum 5 jeton' : 'Minimum 5 jetons'}</span>
                    ) : (
                      <span className="text-emerald-300">✅ {parseInt(jetonAmount).toLocaleString()} jeton gönderilecek</span>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Send Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button
            onClick={handleSend}
            disabled={sending || !canSend || totalCost > userJetonBalance}
            className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-base sm:text-lg shadow-lg ${
              selectedTab === 'gift' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/30 hover:shadow-pink-500/50' 
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-500/30 hover:shadow-amber-500/50'
            }`}
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                {language === 'tr' ? 'Gönder' : 'Send'}
                {canSend && totalCost > 0 && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                    {totalCost.toLocaleString()} Jeton
                  </span>
                )}
              </>
            )}
          </button>
        </motion.div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href={`/${language}`} className="inline-flex items-center gap-2 text-purple-300/70 hover:text-fuchsia-300 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            {language === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
          </Link>
        </div>
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
                    {bigGiftPopup.amount.toLocaleString()} Jeton
                  </p>
                )}
              </motion.div>

              {/* Close button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.65 }}
                onClick={() => setBigGiftPopup(null)}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 transition-all"
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
