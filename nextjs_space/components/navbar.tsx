'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { 
  Sparkles, LogOut, User, Shield, Globe, MessageCircle, 
  Menu, X, Video, Trophy, Coins, Home, LayoutGrid, Users,
  Settings, CreditCard, ChevronDown, Camera, Loader2, Radio
} from 'lucide-react'
import NotificationBell from './notification-bell'
import IncomingCallModal from './incoming-call-modal'
import TellerIncomingRequest from './teller-incoming-request'

export default function Navbar() {
  const { data: session, update: updateSession } = useSession() || {}
  const { language, setLanguage, t } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [profileImage, setProfileImage] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [hasLiveStreams, setHasLiveStreams] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    }

    // Check for live streams
    const checkLiveStreams = () => {
      fetch('/api/video-streams')
        .then(res => res.json())
        .then(data => setHasLiveStreams(Array.isArray(data) && data.length > 0))
        .catch(() => {})
    }
    
    checkLiveStreams()
    const interval = setInterval(checkLiveStreams, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [session])

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0118]/95 backdrop-blur-md border-b border-purple-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Left - Credits */}
            <div className="flex items-center gap-2">
              {session?.user ? (
                <Link
                  href={`/${language}/credits`}
                  className="flex items-center gap-1.5 bg-gold-500/20 px-3 py-1.5 rounded-full hover:bg-gold-500/30 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center">
                    <Coins className="w-3 h-3 text-black" />
                  </div>
                  <span className="text-gold-400 font-semibold text-sm">{credits}</span>
                </Link>
              ) : (
                <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 text-purple-300 hover:text-white text-sm"
                >
                  <Globe className="w-4 h-4" />
                  {language.toUpperCase()}
                </button>
              )}
            </div>

            {/* Center - Logo with Live indicator */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Link href={`/${language}`}>
                <span className="font-serif text-2xl font-bold text-gold-400 tracking-wide" style={{ fontFamily: "'Cinzel', serif" }}>
                  falcı
                </span>
              </Link>
              {hasLiveStreams && (
                <Link href={`/${language}/chat/video`} className="flex items-center gap-1 bg-[#fe2c55] px-1.5 py-0.5 rounded">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-bold animate-pulse">CANLI</span>
                </Link>
              )}
            </div>

            {/* Right - Profile/Auth */}
            <div className="flex items-center gap-2">
              {session?.user ? (
                <>
                  <NotificationBell />
                  <div className="relative">
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center"
                    >
                      <ProfileAvatar size="md" />
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
                          href={`/${language}/credits`}
                          className="flex items-center gap-3 px-4 py-2 text-purple-200 hover:bg-purple-800/50 hover:text-white"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <CreditCard className="w-4 h-4" />
                          {language === 'tr' ? 'Kredi Satın Al' : 'Buy Credits'}
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
                </>
              ) : (
                <Link
                  href={`/${language}/login`}
                  className="flex items-center gap-2 bg-gold-500 text-black px-4 py-1.5 rounded-full font-medium text-sm hover:bg-gold-400 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {language === 'tr' ? 'Giriş' : 'Login'}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        {session?.user && (
          <div className="lg:hidden border-t border-purple-900/30">
            <div className="flex justify-around items-center h-12">
              <Link
                href={`/${language}`}
                className="flex flex-col items-center gap-0.5 text-purple-300 hover:text-gold-400 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px]">{language === 'tr' ? 'Ana' : 'Home'}</span>
              </Link>
              
              <Link
                href={`/${language}/fortunes`}
                className="flex flex-col items-center gap-0.5 text-purple-300 hover:text-gold-400 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px]">{language === 'tr' ? 'Fallar' : 'Fortunes'}</span>
              </Link>
              
              <Link
                href={`/${language}/live-tellers`}
                className="flex flex-col items-center gap-0.5 text-purple-300 hover:text-gold-400 transition-colors"
              >
                <Video className="w-5 h-5" />
                <span className="text-[10px]">{language === 'tr' ? 'Canlı' : 'Live'}</span>
              </Link>
              
              <Link
                href={`/${language}/chat`}
                className="flex flex-col items-center gap-0.5 text-purple-300 hover:text-gold-400 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-[10px]">{language === 'tr' ? 'Sohbet' : 'Chat'}</span>
              </Link>
              
              <Link
                href={`/${language}/social`}
                className="flex flex-col items-center gap-0.5 text-purple-300 hover:text-gold-400 transition-colors"
              >
                <Users className="w-5 h-5" />
                <span className="text-[10px]">{language === 'tr' ? 'Sosyal' : 'Social'}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden lg:block border-t border-purple-900/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-center items-center gap-8 h-10">
              <Link
                href={`/${language}/fortunes`}
                className="text-purple-300 hover:text-gold-400 transition-colors text-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {language === 'tr' ? 'Fallar' : 'Fortunes'}
              </Link>
              
              <Link
                href={`/${language}/live-tellers`}
                className="text-purple-300 hover:text-gold-400 transition-colors text-sm flex items-center gap-1.5"
              >
                <Video className="w-4 h-4" />
                {language === 'tr' ? 'Canlı Falcılar' : 'Live Fortune Tellers'}
              </Link>
              
              <Link
                href={`/${language}/chat`}
                className="text-purple-300 hover:text-gold-400 transition-colors text-sm flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                {language === 'tr' ? 'Sohbet Odaları' : 'Chat Rooms'}
              </Link>
              
              <Link
                href={`/${language}/social`}
                className="text-purple-300 hover:text-gold-400 transition-colors text-sm flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                {language === 'tr' ? 'Sosyal' : 'Social'}
              </Link>
              
              <Link
                href={`/${language}/leaderboard`}
                className="text-purple-300 hover:text-gold-400 transition-colors text-sm flex items-center gap-1.5"
              >
                <Trophy className="w-4 h-4" />
                {language === 'tr' ? 'Sıralama' : 'Leaderboard'}
              </Link>
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
