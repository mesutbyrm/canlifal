'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { 
  Sparkles, LogOut, User, Shield, Globe, MessageCircle, 
  Menu, X, Video, Trophy, Coins, Home, LayoutGrid, Users,
  Settings, CreditCard, ChevronDown, Camera, Loader2, Radio, Mail
} from 'lucide-react'
import NotificationBell from './notification-bell'
import IncomingCallModal from './incoming-call-modal'
import TellerIncomingRequest from './teller-incoming-request'

export default function Navbar() {
  const { data: session, update: updateSession } = useSession() || {}
  const { language, setLanguage, t } = useLanguage()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [profileImage, setProfileImage] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [hasLiveStreams, setHasLiveStreams] = useState(false)
  const [liveStreamCount, setLiveStreamCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Hide navbar on mobile for profile and messages pages (footer handles navigation there)
  const hideOnMobile = pathname?.includes('/profile') || pathname?.includes('/messages')

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/credits')
        .then(res => res.json())
        .then(data => setCredits(data.credits || 0))
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
      const messageInterval = setInterval(fetchUnreadMessages, 15000)
      
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
    const interval = setInterval(checkStats, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'tr' : 'en')
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
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center border-2 border-gold-500 flex-shrink-0`}>
            <span className="text-deep-purple-950 font-bold text-sm">
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

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-900/30 ${hideOnMobile ? 'hidden md:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-16">
            {/* Main Navigation - 4 items */}
            <div className="flex-1 flex justify-around items-center">
              {/* İstatistikler (Statistics) */}
              <Link
                href={`/${language}/dashboard`}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors px-2"
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-[10px] font-medium">{language === 'tr' ? 'İstatistikler' : 'Statistics'}</span>
              </Link>
              
              {/* Sosyal (Social) - links to home page social feed */}
              <Link
                href={`/${language}`}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors px-2 relative"
              >
                <div className="relative">
                  <Users className="w-6 h-6" />
                  {liveStreamCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-[#fe2c55] rounded-md flex items-center justify-center px-1">
                      <span className="text-white text-[10px] font-bold">{liveStreamCount}</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{language === 'tr' ? 'Sosyal' : 'Social'}</span>
              </Link>
              
              {/* Fal Sohbet Odaları (Fortune Chat Rooms) */}
              <Link
                href={`/${language}/chat`}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors px-2 relative"
              >
                <div className="relative">
                  <MessageCircle className="w-6 h-6" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-[#fe2c55] rounded-md flex items-center justify-center px-1">
                      <span className="text-white text-[10px] font-bold">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{language === 'tr' ? 'Fal Sohbet' : 'Chat Rooms'}</span>
              </Link>
              
              {/* Profile */}
              {session?.user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex flex-col items-center gap-1 px-2"
                  >
                    {/* Golden ornate border for admin */}
                    <div className={`relative ${session.user.role === 'admin' ? 'p-0.5' : ''}`}>
                      {session.user.role === 'admin' && (
                        <div className="absolute inset-0 rounded-full" style={{
                          background: 'linear-gradient(135deg, #d4af37, #f4e4b5, #d4af37, #967117, #d4af37)',
                          padding: '2px'
                        }}>
                          <div className="w-full h-full rounded-full bg-[#0a0118]" />
                        </div>
                      )}
                      <div className={`relative ${session.user.role === 'admin' ? 'w-10 h-10' : 'w-9 h-9'} rounded-full overflow-hidden border-2 ${session.user.role === 'admin' ? 'border-gold-500' : 'border-purple-500/50'}`}>
                        {profileImage || session.user.image ? (
                          <Image
                            src={profileImage || session.user.image || ''}
                            alt={session.user.name || 'Profil'}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
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
                    <div className="absolute right-0 top-full mt-2 w-64 bg-deep-purple-900 border border-purple-700 rounded-xl shadow-xl py-2 z-50">
                      <div className="px-4 py-3 border-b border-purple-700">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar size="xl" showCamera />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{session.user.name}</p>
                            <p className="text-purple-400 text-xs truncate">{session.user.email}</p>
                            <p className="text-gold-400 text-[10px] mt-1 flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {language === 'tr' ? 'Resmi değiştir' : 'Change photo'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Credits display */}
                      <Link
                        href={`/${language}/credits`}
                        className="flex items-center justify-between px-4 py-2 text-gold-400 hover:bg-purple-800/50"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <div className="flex items-center gap-3">
                          <Coins className="w-4 h-4" />
                          {language === 'tr' ? 'Kredilerim' : 'My Credits'}
                        </div>
                        <span className="font-bold">{credits}</span>
                      </Link>
                      
                      <Link
                        href={`/${language}/profile/${session.user.id}`}
                        className="flex items-center gap-3 px-4 py-2 text-purple-200 hover:bg-purple-800/50 hover:text-white"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        {language === 'tr' ? 'Profilim' : 'My Profile'}
                      </Link>
                      
                      <Link
                        href={`/${language}/dashboard`}
                        className="flex items-center gap-3 px-4 py-2 text-purple-200 hover:bg-purple-800/50 hover:text-white"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        {language === 'tr' ? 'Panelim' : 'Dashboard'}
                      </Link>
                      
                      <Link
                        href={`/${language}/settings`}
                        className="flex items-center gap-3 px-4 py-2 text-purple-200 hover:bg-purple-800/50 hover:text-white"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        {language === 'tr' ? 'Ayarlar' : 'Settings'}
                      </Link>

                      {session?.user?.role === 'admin' && (
                        <Link
                          href={`/${language}/admin`}
                          className="flex items-center gap-3 px-4 py-2 text-purple-200 hover:bg-purple-800/50 hover:text-white"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Admin
                        </Link>
                      )}
                      
                      <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-3 px-4 py-2 text-purple-200 hover:bg-purple-800/50 hover:text-white w-full"
                      >
                        <Globe className="w-4 h-4" />
                        {language === 'tr' ? 'English' : 'Türkçe'}
                      </button>
                      
                      <div className="border-t border-purple-700 mt-2 pt-2">
                        <button
                          onClick={() => signOut({ callbackUrl: `/${language}` })}
                          className="flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          {language === 'tr' ? 'Çıkış Yap' : 'Log Out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/${language}/login`}
                  className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors px-2"
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
    </>
  )
}
