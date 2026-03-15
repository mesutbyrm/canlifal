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
  Settings, CreditCard, ChevronDown, Camera, Loader2, Radio, Mail, Send, AlertCircle
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import CfcCoin from './cfc-coin'
import NotificationBell from './notification-bell'
import IncomingCallModal from './incoming-call-modal'
import TellerIncomingRequest from './teller-incoming-request'

export default function Navbar() {
  const { data: session, update: updateSession } = useSession() || {}
  const { language, setLanguage, t } = useLanguage()
  const { theme } = useSiteTheme()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [jetonBalance, setJetonBalance] = useState<number>(0)
  const [jetonTlRate, setJetonTlRate] = useState<number>(0.5)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [profileImage, setProfileImage] = useState<string>('')
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
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // FalClub theme styling
  const isFalclub = true
  
  // Hide navbar on mobile for profile and messages pages (footer handles navigation there)
  const hideOnMobile = pathname?.includes('/profile') || pathname?.includes('/messages')
  
  // Completely hide navbar on live streaming and live fortune pages
  const hideCompletely = pathname?.includes('/chat/video') || pathname?.includes('/live-room')

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
        .then(data => setProfileImage(data.image || ''))
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
    setLanguage(language === 'en' ? 'tr' : 'en')
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
      alert(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalıdır' : 'File size must be less than 5MB')
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
      alert(language === 'tr' ? 'Yükleme başarısız oldu' : 'Upload failed')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Profile avatar component
  const ProfileAvatar = ({ size = 'md', showCamera = false }: { size?: 'sm' | 'md' | 'lg' | 'xl', showCamera?: boolean }) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-9 h-9',
      lg: 'w-10 h-10',
      xl: 'w-16 h-16'
    }

    const currentImage = profileImage || session?.user?.image

    return (
      <div className="relative">
        {currentImage ? (
          <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gold-500 flex-shrink-0`}>
            <Image
              src={currentImage}
              alt={session?.user?.name || 'Profil'}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center border-2 border-gold-500 flex-shrink-0`}>
            <span className="text-white font-bold text-sm">
              {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        )}
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

  // FalClub theme colors for navbar
  const navBg = 'bg-[#0f0520]/95 border-fuchsia-900/30'
  const navTextColor = 'text-fuchsia-300 hover:text-fuchsia-200'
  const navHoverBg = 'hover:bg-fuchsia-900/30'
  const accentColor = 'text-fuchsia-300'
  
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 ${navBg} backdrop-blur-md border-b ${hideOnMobile ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14">
            {/* Main Navigation - 4 items */}
            <div className="flex-1 flex justify-around items-center">
              {/* İstatistikler (Statistics) */}
              <Link
                href={`/${language}/dashboard`}
                className={`flex flex-col items-center gap-1 ${navTextColor} transition-colors px-3 py-1 rounded-lg ${navHoverBg}`}
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-[10px] font-medium">{language === 'tr' ? 'İstatistikler' : 'Statistics'}</span>
              </Link>
              
              {/* Bildirimler (Notifications) */}
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${navHoverBg}`}>
                <NotificationBell />
                <span className={`text-[10px] font-medium ${navTextColor.split(' ')[0]}`}>{language === 'tr' ? 'Bildirim' : 'Alerts'}</span>
              </div>

              {/* Search */}
              <NavSearch />

              {/* Profile */}
              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-900/30"
                  >
                    {/* Gold border for admin */}
                    <div className={`relative ${session.user.role === 'admin' ? 'p-0.5' : ''}`}>
                      {session.user.role === 'admin' && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-500 to-gold-600" />
                      )}
                      <div className={`relative ${session.user.role === 'admin' ? 'w-10 h-10' : 'w-9 h-9'} rounded-full overflow-hidden border-2 ${session.user.role === 'admin' ? 'border-gold-500' : 'border-purple-500'}`}>
                        {profileImage || session.user.image ? (
                          <Image
                            src={profileImage || session.user.image || ''}
                            alt={session.user.name || 'Profil'}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {session.user.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Admin badge overlay */}
                      {session.user.role === 'admin' && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gold-500 text-[7px] font-bold text-black px-1.5 rounded">
                          ADMIN
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Profile dropdown */}
                  {showProfileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-xl py-2 z-50 bg-[#1a0a2e] border border-fuchsia-700/50">
                      <div className="px-4 py-3 border-b border-fuchsia-700/40">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar size="xl" showCamera />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">{session.user.name}</p>
                            <p className="text-xs truncate text-fuchsia-300">{session.user.email}</p>
                            <p className="text-[10px] mt-1 flex items-center gap-1 text-gold-400">
                              <Camera className="w-3 h-3" />
                              {language === 'tr' ? 'Resmi değiştir' : 'Change photo'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                       {/* CFC display */}
                       <Link
                         href={`/${language}/credits`}
                         className="flex items-center justify-between px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                         onClick={() => setShowProfileMenu(false)}
                       >
                         <div className="flex items-center gap-3">
                           <CfcCoin size={20} />
                           {language === 'tr' ? "CFC'lerim" : 'My CFC'}
                         </div>
                         <span className="font-bold text-gold-400">{credits} CFC</span>
                       </Link>
                       {/* Jeton display with TL */}
                       <Link
                         href={`/${language}/credits`}
                         className="flex items-center justify-between px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                         onClick={() => setShowProfileMenu(false)}
                       >
                         <div className="flex items-center gap-3">
                           <span className="w-5 h-5 text-center text-lg leading-5">🪙</span>
                           {language === 'tr' ? 'Jetonlarım' : 'My Jetons'}
                         </div>
                         <div className="text-right">
                           <span className="font-bold text-amber-400">{jetonBalance}</span>
                           <p className="text-[10px] text-amber-300/70">{(jetonBalance * jetonTlRate).toFixed(0)} TL</p>
                         </div>
                       </Link>
                      
                      {/* Payment Notification / Admin Payment Orders */}
                      {session?.user?.role === 'admin' ? (
                        <Link
                          href={`/${language}/admin/credits`}
                          className="flex items-center gap-3 px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <CreditCard className="w-5 h-5 text-gold-400" />
                          {language === 'tr' ? 'Ödeme Emri' : 'Payment Orders'}
                        </Link>
                      ) : (
                        <button
                          onClick={() => { setShowProfileMenu(false); setShowPaymentModal(true); }}
                          className="flex items-center gap-3 px-4 py-2.5 w-full text-fuchsia-200 hover:bg-fuchsia-800/30"
                        >
                          <Send className="w-5 h-5 text-green-400" />
                          {language === 'tr' ? 'Ödeme Bildir' : 'Notify Payment'}
                        </button>
                      )}
                      
                      <Link
                        href={`/${language}/profile/${session.user.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <User className="w-5 h-5 text-fuchsia-400" />
                        {language === 'tr' ? 'Profilim' : 'My Profile'}
                      </Link>
                      
                      <Link
                        href={`/${language}/dashboard`}
                        className="flex items-center gap-3 px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <LayoutGrid className="w-5 h-5 text-fuchsia-400" />
                        {language === 'tr' ? 'İstatistiklerim' : 'My Statistics'}
                      </Link>
                      
                      <Link
                        href={`/${language}/settings`}
                        className="flex items-center gap-3 px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings className="w-5 h-5 text-fuchsia-400" />
                        {language === 'tr' ? 'Ayarlar' : 'Settings'}
                      </Link>

                      {session?.user?.role === 'admin' && (
                        <Link
                          href={`/${language}/admin`}
                          className="flex items-center gap-3 px-4 py-2.5 text-fuchsia-200 hover:bg-fuchsia-800/30"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Shield className="w-5 h-5 text-gold-400" />
                          Admin
                        </Link>
                      )}
                      
                      <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-3 px-4 py-2.5 w-full text-fuchsia-200 hover:bg-fuchsia-800/30"
                      >
                        <Globe className="w-5 h-5 text-fuchsia-400" />
                        {language === 'tr' ? 'Dil' : 'Language'}
                      </button>
                      
                      <div className="border-t mt-2 pt-2 border-fuchsia-700/40">
                        <button
                          onClick={() => signOut({ callbackUrl: `/${language}` })}
                          className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-900/30 w-full"
                        >
                          <LogOut className="w-5 h-5" />
                          {language === 'tr' ? 'Çıkış Yap' : 'Log Out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/${language}/login`}
                  className="flex flex-col items-center gap-1 text-purple-300 hover:text-gold-400 transition-colors px-3 py-1 rounded-lg hover:bg-purple-900/30"
                >
                  <User className="w-6 h-6" />
                  <span className="text-[11px] font-medium">{language === 'tr' ? 'Giriş' : 'Login'}</span>
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
                    {language === 'tr' ? 'Ödeme Bildirimi Gönderildi!' : 'Payment Notification Sent!'}
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {language === 'tr' ? 'Admin onayı bekleniyor.' : 'Waiting for admin approval.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-fuchsia-400 flex items-center gap-2">
                      <Send className="w-6 h-6" />
                      {language === 'tr' ? 'Ödeme Bildir' : 'Notify Payment'}
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
                        {language === 'tr' 
                          ? 'Ödeme yaptıktan sonra bu formu doldurun. Admin onayladığında jetonlarınız hesabınıza yüklenecektir.'
                          : 'Fill this form after making payment. Your jetons will be loaded when admin approves.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {language === 'tr' ? 'Ödeme Yöntemi *' : 'Payment Method *'}
                      </label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                      >
                        <option value="">{language === 'tr' ? 'Seçiniz...' : 'Select...'}</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.type}>
                            {method.name}
                          </option>
                        ))}
                        <option value="papara">Papara</option>
                        <option value="bank_transfer">{language === 'tr' ? 'Banka Havalesi' : 'Bank Transfer'}</option>
                      </select>
                    </div>
                    
                    {/* Amount */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {language === 'tr' ? 'Ödenen Tutar (TL) *' : 'Amount Paid (TL) *'}
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
                        {language === 'tr' ? 'İşlem No / Referans' : 'Transaction ID / Reference'}
                      </label>
                      <input
                        type="text"
                        value={paymentForm.transactionId}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                        placeholder={language === 'tr' ? 'Varsa işlem numarası' : 'Transaction number if available'}
                      />
                    </div>
                    
                    {/* Sender Name (for bank transfers) */}
                    {paymentForm.paymentMethod === 'bank_transfer' && (
                      <div>
                        <label className="block text-sm text-purple-300 mb-2">
                          {language === 'tr' ? 'Gönderen Ad Soyad' : 'Sender Name'}
                        </label>
                        <input
                          type="text"
                          value={paymentForm.senderName}
                          onChange={(e) => setPaymentForm({ ...paymentForm, senderName: e.target.value })}
                          className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500"
                          placeholder={language === 'tr' ? 'Havaleyi yapan kişinin adı' : 'Name of the person who made the transfer'}
                        />
                      </div>
                    )}
                    
                    {/* Notes */}
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        {language === 'tr' ? 'Not (Opsiyonel)' : 'Note (Optional)'}
                      </label>
                      <textarea
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-lg text-white focus:outline-none focus:border-fuchsia-500 resize-none"
                        placeholder={language === 'tr' ? 'Ek bilgi...' : 'Additional info...'}
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
                      {language === 'tr' ? 'Bildirimi Gönder' : 'Send Notification'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}