'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import NavSearch from '@/components/nav-search'
import { 
  Sparkles, LogOut, User, Shield, Globe, MessageCircle, 
  Menu, X, Video, Trophy, Coins, Home, LayoutGrid, Users,
  Settings, CreditCard, ChevronDown, Camera, Loader2, Radio, Mail, Send, AlertCircle, BookOpen,
  Search, Plus, Minus, TrendingDown
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import CfcCoin from './cfc-coin'
import NotificationBell from './notification-bell'
import IncomingCallModal from './incoming-call-modal'
import FramedAvatar from './framed-avatar'
import TellerIncomingRequest from './teller-incoming-request'
import UserLevelBadge from './user-level-badge'
// ThemeToggle removed - color mode is now controlled from admin panel

export default function Navbar() {
  const { data: session, update: updateSession } = useSession() || {}
  const { language, setLanguage, t } = useLanguage()
  const { theme, colorMode } = useSiteTheme()
  const isLight = colorMode === 'light'
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [jetonBalance, setJetonBalance] = useState<number>(0)
  const [jetonTlRate, setJetonTlRate] = useState<number>(0.5)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [profileImage, setProfileImage] = useState<string>('')
  const [profileFrameUrl, setProfileFrameUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [hasLiveStreams, setHasLiveStreams] = useState(false)
  const [liveStreamCount, setLiveStreamCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Array<{id: string, name: string, type: string}>>([])
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: '',
    amount: '',
    transactionId: '',
    senderName: '',
    notes: ''
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)
  
  // Admin Jeton/CFC Management
  const [showAdminJetonModal, setShowAdminJetonModal] = useState(false)
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [adminSearchResults, setAdminSearchResults] = useState<Array<{id: string; name: string; username: string | null; email: string; image: string | null; role: string}>>([])
  const [adminSearching, setAdminSearching] = useState(false)
  const [selectedAdminUser, setSelectedAdminUser] = useState<{id: string; name: string; username?: string | null; email: string; image?: string | null; jetonBalance?: number; credits?: number} | null>(null)
  const [adminAdjustCurrency, setAdminAdjustCurrency] = useState<'jeton' | 'cfc'>('jeton')
  const [adminAdjustAmount, setAdminAdjustAmount] = useState('')
  const [adminAdjustReason, setAdminAdjustReason] = useState('')
  const [adminAdjusting, setAdminAdjusting] = useState(false)
  const adminSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // FalClub theme styling
  const isFalclub = true
  
  // Hide navbar on mobile for profile and messages pages (footer handles navigation there)
  const hideOnMobile = pathname?.includes('/profil') || pathname?.includes('/mesajlar')
  
  // Completely hide navbar on live streaming and live fortune pages
  const hideCompletely = pathname?.includes('/sohbet/video') || pathname?.includes('/canli-oda')

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/credits')
        .then(res => res.json())
        .then(data => {
          setCredits(data.credits || 0)
          setJetonBalance(data.jetonBalance || 0)
          if (data.jetonTlRate) setJetonTlRate(data.jetonTlRate)
        })
        .catch(() => {})
      
      // Fetch profile image
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          setProfileImage(data.image || '')
          const frameUrl = data.adminAssignedFrame?.imageUrl || data.profileFrame?.imageUrl || null
          setProfileFrameUrl(frameUrl)
        })
        .catch(() => {})
      
      // Fetch unread messages count
      const fetchUnreadMessages = () => {
        fetch('/api/messages?unreadCount=true')
          .then(res => res.json())
          .then(data => setUnreadMessages(data.unreadCount || 0))
          .catch(() => {})
      }
      fetchUnreadMessages()
      const messageInterval = setInterval(fetchUnreadMessages, 30000)
      
      return () => clearInterval(messageInterval)
    }
  }, [session])

  useEffect(() => {
    // Check for live streams and online users
    const checkStats = () => {
      fetch('/api/video-streams')
        .then(res => res.json())
        .then(data => {
          const count = Array.isArray(data) ? data.length : 0
          setHasLiveStreams(count > 0)
          setLiveStreamCount(count)
        })
        .catch(() => {})
      
      fetch('/api/public-stats')
        .then(res => res.json())
        .then(data => setOnlineUsers(data.totalOnline || 1))
        .catch(() => {})
    }
    
    checkStats()
    const interval = setInterval(checkStats, 45000) // Check every 45 seconds
    return () => clearInterval(interval)
  }, [])

  const toggleLanguage = () => {
    // Turkish only - no language toggle needed
  }

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (showPaymentModal) {
      fetch('/api/payment-methods')
        .then(res => res.json())
        .then(data => setPaymentMethods(data || []))
        .catch(() => {})
    }
  }, [showPaymentModal])

  const handlePaymentSubmit = async () => {
    if (!paymentForm.paymentMethod || !paymentForm.amount) {
      return
    }
    setSubmittingPayment(true)
    try {
      const res = await fetch('/api/payments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      })
      if (res.ok) {
        setPaymentSuccess(true)
        setPaymentForm({ paymentMethod: '', amount: '', transactionId: '', senderName: '', notes: '' })
        setTimeout(() => {
          setShowPaymentModal(false)
          setPaymentSuccess(false)
        }, 2000)
      }
    } catch (err) {
      console.error('Payment notification error:', err)
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır')
      return
    }

    setUploadingImage(true)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true })
      })

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, cloud_storage_path } = await presignedRes.json()
      const url = new URL(uploadUrl)
      const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') || ''
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (signedHeaders.includes('content-disposition')) headers['Content-Disposition'] = 'attachment'

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file })
      if (!uploadRes.ok) throw new Error('Failed to upload file')

      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })

      if (urlRes.ok) {
        const { url: imageUrl } = await urlRes.json()
        
        // Save to profile
        const saveRes = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl })
        })

        if (saveRes.ok) {
          setProfileImage(imageUrl)
          // Update session
          if (updateSession) {
            await updateSession({ image: imageUrl })
          }
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Yükleme başarısız oldu')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Admin: Instant user search for jeton management
  const adminSearchUsers = (query: string) => {
    setAdminSearchQuery(query)
    if (adminSearchTimeoutRef.current) clearTimeout(adminSearchTimeoutRef.current)
    if (!query || query.length < 1) {
      setAdminSearchResults([])
      return
    }
    adminSearchTimeoutRef.current = setTimeout(async () => {
      setAdminSearching(true)
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          setAdminSearchResults(data.users || [])
        }
      } catch { setAdminSearchResults([]) }
      finally { setAdminSearching(false) }
    }, 150)
  }

  const handleAdminSelectUser = async (user: typeof adminSearchResults[0]) => {
    // Fetch user's balance details
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(user.email)}&limit=1`)
      if (res.ok) {
        const data = await res.json()
        const users = data.users || data || []
        const found = users.find((u: any) => u.id === user.id)
        setSelectedAdminUser({
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          jetonBalance: found?.jetonBalance ?? 0,
          credits: found?.credits ?? 0,
        })
      } else {
        setSelectedAdminUser({
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
        })
      }
    } catch {
      setSelectedAdminUser({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      })
    }
    setAdminSearchQuery('')
    setAdminSearchResults([])
  }

  const handleAdminAdjust = async (isAdd: boolean) => {
    if (!selectedAdminUser || !adminAdjustAmount) return
    setAdminAdjusting(true)
    try {
      const amount = isAdd ? Math.abs(Number(adminAdjustAmount)) : -Math.abs(Number(adminAdjustAmount))
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedAdminUser.id, amount, currency: adminAdjustCurrency, reason: adminAdjustReason }),
      })
      if (res.ok) {
        // Reset
        setSelectedAdminUser(null)
        setAdminAdjustAmount('')
        setAdminAdjustReason('')
        setShowAdminJetonModal(false)
      }
    } catch (err) {
      console.error('Admin adjust error:', err)
    } finally {
      setAdminAdjusting(false)
    }
  }

  // Profile avatar component
  const ProfileAvatar = ({ size = 'md', showCamera = false }: { size?: 'sm' | 'md' | 'lg' | 'xl', showCamera?: boolean }) => {
    const sizePixels = { sm: 32, md: 36, lg: 40, xl: 64 }

    return (
      <div className="relative">
        <FramedAvatar
          src={profileImage || session?.user?.image}
          alt={session?.user?.name || 'Profil'}
          size={sizePixels[size]}
          frameUrl={profileFrameUrl}
          fallbackInitial={session?.user?.name?.charAt(0) || 'U'}
          borderColor="border-gold-500"
        />
        {showCamera && (
          <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-gold-400 transition-colors shadow-lg">
            {uploadingImage ? (
              <Loader2 className="w-3 h-3 text-black animate-spin" />
            ) : (
              <Camera className="w-3 h-3 text-black" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
          </label>
        )}
      </div>
    )
  }

  // Don't render navbar on live streaming and live fortune pages
  if (hideCompletely) {
    return null
  }

  // Theme colors for navbar - Facebook for light, FalClub for dark
  const navBg = isLight 
    ? 'bg-white border-[#E4E6EB]'
    : 'bg-[#0f0520]/95 border-fuchsia-900/30'
  const navTextColor = isLight
    ? 'text-[#65676B] hover:text-[#1877F2]'
    : 'text-fuchsia-300 hover:text-fuchsia-200'
  const navHoverBg = isLight
    ? 'hover:bg-[#F0F2F5]'
    : 'hover:bg-fuchsia-900/30'
  const accentColor = isLight ? 'text-[#1877F2]' : 'text-fuchsia-300'
  
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 ${navBg} backdrop-blur-md border-b ${hideOnMobile ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14">
            {/* Main Navigation - 4 items */}
            <div className="flex-1 flex justify-around items-center">
              {/* İstatistikler (Statistics) */}
              <Link
                href={`/panel`}
                className={`flex flex-col items-center gap-1 ${navTextColor} transition-colors px-3 py-1 rounded-lg ${navHoverBg}`}
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-[10px] font-medium">{'İstatistikler'}</span>
              </Link>
              
              {/* Bildirimler (Notifications) */}
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${navHoverBg}`}>
                <NotificationBell />
                <span className={`text-[10px] font-medium ${navTextColor.split(' ')[0]}`}>{'Bildirim'}</span>
              </div>

              {/* Search */}
              <NavSearch />

              {/* Profile */}
              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg ${isLight ? 'hover:bg-[#F0F2F5]' : 'hover:bg-purple-900/30'}`}
                  >
                    {/* Profile avatar with frame */}
                    <div className="relative">
                      <FramedAvatar
                        src={profileImage || session.user.image}
                        alt={session.user.name || 'Profil'}
                        size={session.user.role === 'admin' ? 40 : 36}
                        frameUrl={profileFrameUrl}
                        fallbackInitial={session.user.name?.charAt(0) || 'U'}
                        borderColor={session.user.role === 'admin' ? 'border-gold-500' : 'border-purple-500'}
                      />
                      {/* Admin badge overlay */}
                      {session.user.role === 'admin' && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gold-500 text-[7px] font-bold text-black px-1.5 rounded z-20">
                          ADMIN
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Profile dropdown */}
                  {showProfileMenu && (
                    <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl shadow-xl py-2 z-50 ${isLight ? 'bg-white border border-[#E4E6EB]' : 'bg-[#1a0a2e] border border-fuchsia-700/50'}`}>
                      <div className={`px-4 py-3 border-b ${isLight ? 'border-[#E4E6EB]' : 'border-fuchsia-700/40'}`}>
                        <div className="flex items-center gap-3">
                          <ProfileAvatar size="xl" showCamera />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${isLight ? 'text-[#050505]' : 'text-white'} ${(session.user as any).role === 'admin' ? 'effect-glitch' : ''}`} data-text={session.user.name}>{session.user.name}</p>
                            <p className={`text-xs truncate ${isLight ? 'text-[#65676B]' : 'text-fuchsia-300'}`}>{session.user.email}</p>
                            <div className="mt-1">
                              <UserLevelBadge compact />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                       {/* CFC display */}
                       <Link
                         href={`/jeton`}
                         className={`flex items-center justify-between px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                         onClick={() => setShowProfileMenu(false)}
                       >
                         <div className="flex items-center gap-3">
                           <CfcCoin size={20} />
                           {"CFC'lerim"}
                         </div>
                         <span className={`font-bold ${isLight ? 'text-[#1877F2]' : 'text-gold-400'}`}>{credits} CFC</span>
                       </Link>
                       {/* Jeton display with TL */}
                       <Link
                         href={`/jeton`}
                         className={`flex items-center justify-between px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                         onClick={() => setShowProfileMenu(false)}
                       >
                         <div className="flex items-center gap-3">
                           <span className="w-5 h-5 text-center text-lg leading-5">🪙</span>
                           {'Jetonlarım'}
                         </div>
                         <div className="text-right">
                           <span className={`font-bold ${isLight ? 'text-[#1877F2]' : 'text-amber-400'}`}>{jetonBalance}</span>
                           <p className={`text-[10px] ${isLight ? 'text-[#65676B]' : 'text-amber-300/70'}`}>{(jetonBalance * jetonTlRate).toFixed(0)} TL</p>
                         </div>
                       </Link>
                      
                      {/* Payment Notification / Admin Payment Orders */}
                      {session?.user?.role === 'admin' ? (
                        <>
                          <Link
                            href={`/admin/credits`}
                            className={`flex items-center gap-3 px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <CreditCard className={`w-5 h-5 ${isLight ? 'text-[#1877F2]' : 'text-gold-400'}`} />
                            {'Ödeme Emri'}
                          </Link>
                          <button
                            onClick={() => { setShowProfileMenu(false); setShowAdminJetonModal(true); }}
                            className={`flex items-center gap-3 px-4 py-2.5 w-full ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                          >
                            <Coins className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                            {'Jeton/CFC Yönet'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setShowProfileMenu(false); setShowPaymentModal(true); }}
                          className={`flex items-center gap-3 px-4 py-2.5 w-full ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                        >
                          <Send className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                          {'Ödeme Bildir'}
                        </button>
                      )}
                      
                      <Link
                        href={`/profil/${session.user.id}`}
                        className={`flex items-center gap-3 px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <User className={`w-5 h-5 ${isLight ? 'text-[#1877F2]' : 'text-fuchsia-400'}`} />
                        {'Profilim'}
                      </Link>
                      
                      <Link
                        href={`/panel`}
                        className={`flex items-center gap-3 px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <LayoutGrid className={`w-5 h-5 ${isLight ? 'text-[#1877F2]' : 'text-fuchsia-400'}`} />
                        {'İstatistiklerim'}
                      </Link>

                      <Link
                        href={`/blog`}
                        className={`flex items-center gap-3 px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <BookOpen className={`w-5 h-5 ${isLight ? 'text-[#1877F2]' : 'text-fuchsia-400'}`} />
                        {'Blog'}
                      </Link>
                      
                      <Link
                        href={`/ayarlar`}
                        className={`flex items-center gap-3 px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings className={`w-5 h-5 ${isLight ? 'text-[#1877F2]' : 'text-fuchsia-400'}`} />
                        {'Ayarlar'}
                      </Link>

                      {session?.user?.role === 'admin' && (
                        <Link
                          href={`/admin`}
                          className={`flex items-center gap-3 px-4 py-2.5 ${isLight ? 'text-[#050505] hover:bg-[#F0F2F5]' : 'text-fuchsia-200 hover:bg-fuchsia-800/30'}`}
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Shield className={`w-5 h-5 ${isLight ? 'text-[#1877F2]' : 'text-gold-400'}`} />
                          Admin
                        </Link>
                      )}
                      
                      {/* Language toggle removed - Turkish only site */}
                      
                      <div className={`border-t mt-2 pt-2 ${isLight ? 'border-[#E4E6EB]' : 'border-fuchsia-700/40'}`}>
                        <button
                          onClick={() => signOut({ callbackUrl: `/` })}
                          className={`flex items-center gap-3 px-4 py-2.5 w-full ${isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/30'}`}
                        >
                          <LogOut className="w-5 h-5" />
                          {'Çıkış Yap'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/giris`}
                  className={`flex flex-col items-center gap-1 transition-colors px-3 py-1 rounded-lg ${isLight ? 'text-[#65676B] hover:text-[#1877F2] hover:bg-[#F0F2F5]' : 'text-purple-300 hover:text-gold-400 hover:bg-purple-900/30'}`}
                >
                  <User className="w-6 h-6" />
                  <span className="text-[11px] font-medium">{'Giriş'}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Click outside to close profile menu */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {/* Incoming Call Modal for users */}
      <IncomingCallModal />
      
      {/* Teller Incoming Request - shows popup for fortune tellers anywhere on the site */}
      <TellerIncomingRequest />

      {/* Payment Notification Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
            onClick={() => !submittingPayment && setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] border border-fuchsia-500/30 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {paymentSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">
                    {'Ödeme Bildirimi Gönderildi!'}
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {'Admin onayı bekleniyor.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-fuchsia-400 flex items-center gap-2">
                      <Send className="w-6 h-6" />
                      {'Ödeme Bildir'}
                    </h3>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="p-2 hover:bg-fuchsia-800/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-purple-400" />
                    </button>
                  </div>
                  
                  <div className="bg-fuchsia-900/30 border border-fuchsia-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-purple-300">
                        {'Ödeme yaptıktan sonra bu formu doldurun. Admin onayladığında jetonlarınız hesabınıza yüklenecektir.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {'Ödeme Yöntemi *'}
                      </label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                      >
                        <option value="">{'Seçiniz...'}</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.type}>
                            {method.name}
                          </option>
                        ))}
                        <option value="papara">Papara</option>
                        <option value="bank_transfer">{'Banka Havalesi'}</option>
                      </select>
                    </div>
                    
                    {/* Amount */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {'Ödenen Tutar (TL) *'}
                      </label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                        placeholder="100"
                      />
                    </div>
                    
                    {/* Transaction ID */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {'İşlem No / Referans'}
                      </label>
                      <input
                        type="text"
                        value={paymentForm.transactionId}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                        placeholder={'Varsa işlem numarası'}
                      />
                    </div>
                    
                    {/* Sender Name (for bank transfers) */}
                    {paymentForm.paymentMethod === 'bank_transfer' && (
                      <div>
                        <label className="block text-sm text-purple-300 mb-2">
                          {'Gönderen Ad Soyad'}
                        </label>
                        <input
                          type="text"
                          value={paymentForm.senderName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, senderName: e.target.value })}
                          className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                          placeholder={'Havaleyi yapan kişinin adı'}
                        />
                      </div>
                    )}
                    
                    {/* Notes */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {'Not (Opsiyonel)'}
                      </label>
                      <textarea
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500 resize-none"
                        placeholder={'Ek bilgi...'}
                        rows={2}
                      />
                    </div>
                    
                    <button
                      onClick={handlePaymentSubmit}
                      disabled={submittingPayment || !paymentForm.paymentMethod || !paymentForm.amount}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-4"
                    >
                      {submittingPayment ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {'Bildirimi Gönder'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Jeton/CFC Management Modal */}
      <AnimatePresence>
        {showAdminJetonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
            onClick={() => { if (!adminAdjusting) { setShowAdminJetonModal(false); setSelectedAdminUser(null); setAdminSearchQuery(''); setAdminSearchResults([]); setAdminAdjustAmount(''); setAdminAdjustReason(''); } }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#1a0a2e] border-fuchsia-500/30'} border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isLight ? 'text-gray-800' : 'text-amber-400'}`}>
                  <Coins className="w-6 h-6" />
                  Jeton / CFC Yönet
                </h3>
                <button
                  onClick={() => { setShowAdminJetonModal(false); setSelectedAdminUser(null); setAdminSearchQuery(''); setAdminSearchResults([]); setAdminAdjustAmount(''); setAdminAdjustReason(''); }}
                  className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-fuchsia-800/50'}`}
                >
                  <X className={`w-5 h-5 ${isLight ? 'text-gray-500' : 'text-purple-400'}`} />
                </button>
              </div>

              {!selectedAdminUser ? (
                /* Step 1: User Search */
                <div>
                  <label className={`block text-sm mb-2 ${isLight ? 'text-gray-600' : 'text-purple-300'}`}>
                    Kullanıcı Ara (isim, kullanıcı adı veya e-posta)
                  </label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-purple-400'}`} />
                    <input
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => {
                        setAdminSearchQuery(e.target.value);
                        adminSearchUsers(e.target.value);
                      }}
                      placeholder="En az 1 karakter yazın..."
                      className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none ${isLight ? 'bg-gray-100 border border-gray-200 text-gray-800 focus:border-blue-500 placeholder-gray-400' : 'bg-fuchsia-900/30 border border-fuchsia-500/30 text-white focus:border-fuchsia-500 placeholder-purple-400/60'}`}
                      autoFocus
                    />
                    {adminSearching && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isLight ? 'border-blue-500' : 'border-fuchsia-400'}`} />
                    )}
                  </div>

                  {adminSearchResults.length > 0 && (
                    <div className={`mt-2 rounded-lg border max-h-64 overflow-y-auto ${isLight ? 'bg-white border-gray-200' : 'bg-[#120826] border-fuchsia-500/20'}`}>
                      {adminSearchResults.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => handleAdminSelectUser(u)}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isLight ? 'hover:bg-blue-50 border-b border-gray-100 last:border-0' : 'hover:bg-fuchsia-800/30 border-b border-fuchsia-500/10 last:border-0'}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isLight ? 'bg-blue-100 text-blue-600' : 'bg-fuchsia-900/50 text-fuchsia-300'}`}>
                            {u.image ? (
                              <img src={u.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              (u.name?.[0] || u.username?.[0] || '?').toUpperCase()
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>
                              {u.name || u.username}
                            </div>
                            <div className={`text-xs truncate ${isLight ? 'text-gray-500' : 'text-purple-400'}`}>
                              @{u.username} · {u.email}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? (isLight ? 'bg-red-100 text-red-600' : 'bg-red-900/40 text-red-400') : u.role === 'teller' ? (isLight ? 'bg-purple-100 text-purple-600' : 'bg-purple-900/40 text-purple-400') : (isLight ? 'bg-gray-100 text-gray-500' : 'bg-fuchsia-900/30 text-purple-300')}`}>
                            {u.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {adminSearchQuery.length >= 1 && !adminSearching && adminSearchResults.length === 0 && (
                    <p className={`text-sm mt-3 text-center ${isLight ? 'text-gray-400' : 'text-purple-400/60'}`}>
                      Kullanıcı bulunamadı
                    </p>
                  )}
                </div>
              ) : (
                /* Step 2: Adjust Balance */
                <div>
                  {/* Selected User Card */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${isLight ? 'bg-blue-50 border border-blue-100' : 'bg-fuchsia-900/20 border border-fuchsia-500/20'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isLight ? 'bg-blue-100 text-blue-600' : 'bg-fuchsia-900/50 text-fuchsia-300'}`}>
                      {selectedAdminUser.image ? (
                        <img src={selectedAdminUser.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        (selectedAdminUser.name?.[0] || selectedAdminUser.username?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>
                        {selectedAdminUser.name || selectedAdminUser.username}
                      </div>
                      <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-purple-400'}`}>
                        Jeton: {selectedAdminUser.jetonBalance ?? 0} · CFC: {selectedAdminUser.credits ?? 0}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedAdminUser(null); setAdminSearchQuery(''); setAdminSearchResults([]); setAdminAdjustAmount(''); setAdminAdjustReason(''); }}
                      className={`text-xs px-2 py-1 rounded ${isLight ? 'text-blue-600 hover:bg-blue-100' : 'text-fuchsia-400 hover:bg-fuchsia-800/40'}`}
                    >
                      Değiştir
                    </button>
                  </div>

                  {/* Currency Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setAdminAdjustCurrency('jeton')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${adminAdjustCurrency === 'jeton' ? (isLight ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' : 'bg-amber-900/40 text-amber-400 border-2 border-amber-500') : (isLight ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-fuchsia-900/20 text-purple-400 border border-fuchsia-500/20')}`}
                    >
                      💰 Jeton
                    </button>
                    <button
                      onClick={() => setAdminAdjustCurrency('cfc')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${adminAdjustCurrency === 'cfc' ? (isLight ? 'bg-purple-100 text-purple-700 border-2 border-purple-400' : 'bg-purple-900/40 text-purple-400 border-2 border-purple-500') : (isLight ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-fuchsia-900/20 text-purple-400 border border-fuchsia-500/20')}`}
                    >
                      🎖️ CFC
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <label className={`block text-sm mb-1 ${isLight ? 'text-gray-600' : 'text-purple-300'}`}>Miktar</label>
                    <input
                      type="number"
                      min="0"
                      value={adminAdjustAmount}
                      onChange={(e) => setAdminAdjustAmount(e.target.value)}
                      placeholder="Örn: 100"
                      className={`w-full px-4 py-3 rounded-lg focus:outline-none ${isLight ? 'bg-gray-100 border border-gray-200 text-gray-800 focus:border-blue-500 placeholder-gray-400' : 'bg-fuchsia-900/30 border border-fuchsia-500/30 text-white focus:border-fuchsia-500 placeholder-purple-400/60'}`}
                    />
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <label className={`block text-sm mb-1 ${isLight ? 'text-gray-600' : 'text-purple-300'}`}>Sebep (opsiyonel)</label>
                    <input
                      type="text"
                      value={adminAdjustReason}
                      onChange={(e) => setAdminAdjustReason(e.target.value)}
                      placeholder="Ör: Hediye, Düzeltme..."
                      className={`w-full px-4 py-3 rounded-lg focus:outline-none ${isLight ? 'bg-gray-100 border border-gray-200 text-gray-800 focus:border-blue-500 placeholder-gray-400' : 'bg-fuchsia-900/30 border border-fuchsia-500/30 text-white focus:border-fuchsia-500 placeholder-purple-400/60'}`}
                    />
                  </div>

                  {/* Profit Warning for Jeton */}
                  {adminAdjustCurrency === 'jeton' && adminAdjustAmount && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-xs ${isLight ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-orange-900/20 border border-orange-500/20 text-orange-300'}`}>
                      <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Jeton eklerseniz platform kârı otomatik olarak <strong>{(parseFloat(adminAdjustAmount) * 0.5).toFixed(2)} ₺</strong> düşecektir. Çıkardığınızda kâr aynı miktarda artacaktır.
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAdminAdjust(true)}
                      disabled={adminAdjusting || !adminAdjustAmount || parseFloat(adminAdjustAmount) <= 0}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-600/80 text-white hover:bg-green-600'}`}
                    >
                      <Plus className="w-4 h-4" />
                      {adminAdjusting ? 'Yükleniyor...' : 'Ekle'}
                    </button>
                    <button
                      onClick={() => handleAdminAdjust(false)}
                      disabled={adminAdjusting || !adminAdjustAmount || parseFloat(adminAdjustAmount) <= 0}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600/80 text-white hover:bg-red-600'}`}
                    >
                      <Minus className="w-4 h-4" />
                      {adminAdjusting ? 'Yükleniyor...' : 'Çıkar'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}