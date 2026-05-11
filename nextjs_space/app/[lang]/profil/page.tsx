'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import Image from 'next/image'
import Link from 'next/link'
import {
  Settings, Grid3X3, Bookmark, Heart, Eye,
  Camera, Sparkles, X,
  Pin, PinOff, BookmarkPlus, BookmarkMinus, Loader2,
  Star, BadgeCheck, Video, Check, Clock, Calendar,
  Bell, RefreshCw, User, Phone, ChevronRight, ChevronDown, ChevronUp,
  AlertCircle, CreditCard, Power, Gift, Trophy, Award, Wallet, Send,
  ChevronLeft, Menu, LogOut, BarChart3, Shield, Crown, DollarSign,
  Users, Coins, MessageSquareWarning, Layers, Building2, UserPlus
} from 'lucide-react'
import { format } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'
import ChatRoomReceivedGifts from '@/components/chat-room-received-gifts'
import UserLevelBadge from '@/components/user-level-badge'
import FramedAvatar from '@/components/framed-avatar'
import MembershipBadge from '@/components/membership-badge'

interface UserProfile {
  id: string
  name: string
  username: string | null
  email: string
  image: string | null
  bio: string | null
  credits: number
  followersCount: number
  followingCount: number
  likesCount: number
  postsCount: number
  fortunesCount: number
  profileFrameId?: string | null
  adminAssignedFrameId?: string | null
  profileFrame?: { id: string; name: string; imageUrl: string } | null
  adminAssignedFrame?: { id: string; name: string; imageUrl: string } | null
  membership?: string
}

interface Post {
  id: string
  imageUrl: string | null
  content: string
  fortuneType?: string
  viewCount: number
  isPinned?: boolean
  _count: { likes: number }
}

interface Fortune {
  id: string
  fortuneType: string
  inputData: string
  aiResponse: string
  language: string
  viewCount: number
  isSaved: boolean
  isPinned: boolean
  pinnedAt: string | null
  createdAt: string
}

interface FollowUser {
  id: string
  name: string
  username: string | null
  image: string | null
}

interface TellerProfile {
  id: string
  displayName: string
  bio: string | null
  avatar: string | null
  specialties: string[]
  pricePerSession: number
  rating: number
  totalSessions: number
  isOnline: boolean
  isVerified: boolean
  isActive: boolean
  applicationStatus: string
  totalEarnings: number
  canGoOnline: boolean
  canChat: boolean
  canStartSession: boolean
  canSetPrice: boolean
  canEditProfile: boolean
  canViewEarnings: boolean
  canWithdraw: boolean
  maxSessionsPerDay: number
  commissionRate: number
}

interface TellerAward {
  id: string
  awardType: string
  title: string
  startDate: string
  endDate: string
}

interface TellerGiftSender {
  senderName: string
  senderImage: string | null
  totalAmount: number
  giftCount: number
}

interface TellerSession {
  id: string
  fortuneType: string
  status: string
  creditsCharged: number
  maxMinutes: number
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  user: {
    name: string | null
    image: string | null
  }
}

const FORTUNE_TYPE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot', en: 'Tarot Reading' },
  astrology: { tr: 'Astroloji', en: 'Astrology' },
  palmistry: { tr: 'El Falı', en: 'Palm Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  general: { tr: 'Genel Danışmanlık', en: 'General Consultation' }
}

const SESSION_STATUS: Record<string, { tr: string; en: string; color: string }> = {
  pending: { tr: 'Bekliyor', en: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  active: { tr: 'Aktif', en: 'Active', color: 'bg-green-500/20 text-green-400' },
  completed: { tr: 'Tamamlandı', en: 'Completed', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { tr: 'İptal', en: 'Cancelled', color: 'bg-red-500/20 text-red-400' }
}

const FORTUNE_ICONS: Record<string, string> = {
  coffee: '☕', tarot: '🃏', horoscope: '♈', daily_horoscope: '🔮',
  palm: '✋', dream: '💤', love: '❤️', numerology: '🔢',
  angel: '👼', aura: '🌈', birthchart: '🌟', yesno: '❓',
  katina: '🂴', kursundokme: '🧊', istikhara: '🌙'
}

const FORTUNE_THUMBNAIL_IMAGES: Record<string, string> = {
  coffee: '/fortunes/coffee.jpg',
  tarot: '/fortunes/tarot.jpg',
  horoscope: '/fortunes/horoscope.jpg',
  daily_horoscope: '/fortunes/horoscope.jpg',
  palm: '/fortunes/palm.jpg',
  dream: '/fortunes/dream.jpg',
  love: '/fortunes/love.jpg',
  numerology: '/fortunes/numerology.jpg',
  angel: '/fortunes/angel.jpg',
  aura: '/fortunes/aura.jpg',
  birthchart: '/fortunes/birthchart.jpg',
  yesno: '/fortunes/yesno.jpg',
  katina: '/fortunes/katina.jpg',
  kursundokme: '/fortunes/dream.jpg',
  istikhara: '/fortunes/angel.jpg',
  askuyumu: '/fortunes/love.jpg'
}

const FORTUNE_THUMBNAIL_LABELS: Record<string, string> = {
  coffee: 'Kahve Falı',
  tarot: 'Tarot Falı',
  horoscope: 'Burç Yorumu',
  daily_horoscope: 'Günlük Burç',
  palm: 'El Falı',
  dream: 'Rüya Yorumu',
  love: 'Aşk Falı',
  numerology: 'Numeroloji',
  angel: 'Melek Kartları',
  aura: 'Aura Analizi',
  birthchart: 'Doğum Haritası',
  yesno: 'Evet/Hayır',
  katina: 'Katina Falı',
  kursundokme: 'Kurşun Dökme',
  istikhara: 'İstihare',
  askuyumu: 'Aşk Uyumu'
}

const FORTUNE_NAMES: Record<string, { tr: string; en: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Reading' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope' },
  daily_horoscope: { tr: 'Günlük Burç', en: 'Daily Horoscope' },
  palm: { tr: 'El Falı', en: 'Palm Reading' },
  dream: { tr: 'Rüya Tabiri', en: 'Dream Interpretation' },
  love: { tr: 'Aşk Falı', en: 'Love Reading' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart' },
  yesno: { tr: 'Evet/Hayır', en: 'Yes/No Oracle' },
  katina: { tr: 'Katina Falı', en: 'Katina Reading' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring' },
  istikhara: { tr: 'İstihare', en: 'Istikhara' }
}

export default function ProfilePage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [fortunes, setFortunes] = useState<Fortune[]>([])
  const [savedFortunes, setSavedFortunes] = useState<Fortune[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'fortunes' | 'saved'>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [showLikersModal, setShowLikersModal] = useState(false)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [likers, setLikers] = useState<FollowUser[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Teller panel states
  const [tellerLevel, setTellerLevel] = useState<{ level: string; levelLabel: string; emoji: string; color: string; points: number; progress: number; nextLevel: { key: string; label: string; emoji: string; pointsNeeded: number } | null } | null>(null)
  const [tellerProfile, setTellerProfile] = useState<TellerProfile | null>(null)
  const [tellerSessions, setTellerSessions] = useState<TellerSession[]>([])
  const [isTeller, setIsTeller] = useState(false)
  const [tellerPanelOpen, setTellerPanelOpen] = useState(false)
  const [tellerOnlineToggling, setTellerOnlineToggling] = useState(false)
  const [tellerSessionAction, setTellerSessionAction] = useState<string | null>(null)
  const [tellerTab, setTellerTab] = useState<'pending' | 'active' | 'history'>('pending')
  const [tellerAwards, setTellerAwards] = useState<TellerAward[]>([])
  const [tellerGiftSenders, setTellerGiftSenders] = useState<TellerGiftSender[]>([])
  const [giftsOpen, setGiftsOpen] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank_transfer')
  const [withdrawalAccount, setWithdrawalAccount] = useState('')
  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  const [withdrawalMessage, setWithdrawalMessage] = useState('')
  const [withdrawalLimit, setWithdrawalLimit] = useState(0)
  const [jetonTlRate, setJetonTlRate] = useState(0.5)
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showWithdrawalSection, setShowWithdrawalSection] = useState(false)
  const [showChatGifts, setShowChatGifts] = useState(false)
  const [showTellerPanel, setShowTellerPanel] = useState(true)
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [myAgency, setMyAgency] = useState<{ id: string; status: string; role?: string } | null>(null)
  const [pendingCounts, setPendingCounts] = useState<{
    jetonRequests: number
    withdrawalRequests: number
    tellerApplications: number
    agencyApplications: number
    newMembers: number
    pendingVerifications: number
    complaints: number
  } | null>(null)

  // Theme
  const isFalclub = theme === 'falclub' || theme === 'falci'
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'
  const isCanlidark = theme === 'canlidark'

  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? '' : ''
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const cardBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-white/5 border-blue-500/20' : 'bg-[#1a0a2e]/80 border-fuchsia-500/20'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const btnBg = isFacebook ? 'bg-blue-500 hover:bg-blue-600 text-white' : isCosmic ? 'bg-blue-600/80 hover:bg-blue-600 text-white' : 'bg-fuchsia-600/80 hover:bg-fuchsia-600 text-white'
  const btnOutline = isFacebook ? 'border border-gray-300 hover:border-blue-400 text-gray-800' : isCosmic ? 'border border-blue-500/40 hover:border-blue-400 text-blue-100' : 'border border-fuchsia-500/40 hover:border-fuchsia-400 text-purple-100'
  const avatarBorder = isFacebook ? 'from-blue-400 to-blue-600' : isCosmic ? 'from-blue-400 via-cyan-400 to-blue-600' : 'from-amber-400 via-fuchsia-500 to-purple-600'
  const tabActive = isFacebook ? 'border-blue-500 text-blue-600' : isCosmic ? 'border-blue-400 text-blue-400' : 'border-fuchsia-400 text-fuchsia-300'
  const tabInactive = isFacebook ? 'text-gray-400' : 'text-gray-500'
  const modalBg = isFacebook ? 'bg-white' : isCosmic ? 'bg-[#0d1f3c]' : 'bg-[#1a0a2e]'
  const fortuneCardBg = isFacebook ? 'bg-blue-50 border-blue-100' : isCosmic ? 'bg-blue-900/20 border-blue-500/20' : 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/20 border-fuchsia-700/30'
  const pinnedCardBg = isFacebook ? 'bg-blue-50 border-blue-200' : isCosmic ? 'bg-blue-900/30 border-blue-500/30' : 'bg-gradient-to-br from-purple-900/50 to-fuchsia-900/30 border-fuchsia-700/50'
  const fortuneBtnSaved = isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-500 text-white' : 'bg-fuchsia-500 text-white'
  const fortuneBtnNormal = isFacebook ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : isCosmic ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50' : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/giris`)
      return
    }
    if (session?.user?.id) {
      fetchProfile()
      fetchPosts()
      fetchFortunes()
      fetchTellerProfile()
      // Agency membership
      fetch('/api/agency/my').then(r => r.ok ? r.json() : null).then(d => {
        if (d && d.agency) setMyAgency({ id: d.agency.id, status: d.agency.status, role: d.role })
      }).catch(() => {})
      // Admin pending counts
      if (['admin', 'yonetici', 'moderator', 'finans'].includes((session.user as any).role)) {
        fetch('/api/admin/pending-counts').then(r => r.ok ? r.json() : null).then(d => {
          if (d && !d.error) setPendingCounts(d)
        }).catch(() => {})
      }
    }
  }, [session, status, language])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) setProfile(await res.json())
    } catch (e) { console.error('Profile fetch error:', e) } finally { setIsLoading(false) }
  }

  const saveBio = async () => {
    setSavingBio(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bioText.trim() })
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile((prev: any) => prev ? { ...prev, bio: updated.bio } : prev)
        setEditingBio(false)
      }
    } catch (e) { console.error('Bio save error:', e) }
    finally { setSavingBio(false) }
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/social/posts?myPosts=true&limit=30')
      if (res.ok) { const data = await res.json(); setPosts(data.posts || []) }
    } catch (e) { console.error('Posts fetch error:', e) }
  }

  const fetchFortunes = async () => {
    try {
      const res = await fetch('/api/user/fallar')
      if (res.ok) { const data = await res.json(); setFortunes(data.fortunes || []) }
      const savedRes = await fetch('/api/user/fallar?saved=true')
      if (savedRes.ok) { const data = await savedRes.json(); setSavedFortunes(data.fortunes || []) }
    } catch (e) { console.error('Fortunes fetch error:', e) }
  }

  const fetchFollowers = async () => {
    setModalLoading(true)
    try { const res = await fetch('/api/user/followers'); if (res.ok) { const data = await res.json(); setFollowers(data.followers || []) } } catch (e) { console.error(e) } finally { setModalLoading(false) }
  }
  const fetchFollowing = async () => {
    setModalLoading(true)
    try { const res = await fetch('/api/user/following'); if (res.ok) { const data = await res.json(); setFollowing(data.following || []) } } catch (e) { console.error(e) } finally { setModalLoading(false) }
  }
  const fetchLikers = async () => {
    setModalLoading(true)
    try { const res = await fetch('/api/user/likers'); if (res.ok) { const data = await res.json(); setLikers(data.likers || []) } } catch (e) { console.error(e) } finally { setModalLoading(false) }
  }

  // === Teller Panel Functions ===
  const fetchTellerProfile = async () => {
    try {
      const res = await fetch('/api/fortune-tellers/my-profile')
      if (res.ok) {
        const data = await res.json()
        setTellerProfile(data)
        setIsTeller(true)
        // Fetch teller level
        try {
          const levelRes = await fetch('/api/teller/level')
          if (levelRes.ok) { const ld = await levelRes.json(); setTellerLevel(ld) }
        } catch {}
        // Fetch sessions
        const sessRes = await fetch(`/api/fortune-tellers/${data.id}/session`)
        if (sessRes.ok) {
          const sessData = await sessRes.json()
          setTellerSessions(sessData)
        }
        // Fetch awards
        try {
          const awardsRes = await fetch(`/api/fortune-tellers/awards?tellerId=${data.id}`)
          if (awardsRes.ok) { const ad = await awardsRes.json(); setTellerAwards(ad.awards || []) }
        } catch {}
        // Fetch gifts
        try {
          const giftsRes = await fetch(`/api/fortune-tellers/hediyeler?tellerId=${data.id}`)
          if (giftsRes.ok) { const gd = await giftsRes.json(); setTellerGiftSenders(gd.senders || []) }
        } catch {}
        // Fetch withdrawal info
        try {
          const credRes = await fetch('/api/user/credits')
          if (credRes.ok) {
            const cd = await credRes.json()
            setWithdrawalLimit(cd.withdrawalLimit || 0)
            setJetonTlRate(cd.jetonTlRate || 0.5)
          }
        } catch {}
        // Fetch withdrawal history
        try {
          const whRes = await fetch('/api/withdrawals')
          if (whRes.ok) { const wd = await whRes.json(); setWithdrawalHistory(wd.requests || []) }
        } catch {}
      }
    } catch (e) { /* Not a teller, ignore */ }
  }

  const toggleTellerOnline = async () => {
    if (!tellerProfile) return
    setTellerOnlineToggling(true)
    try {
      const res = await fetch('/api/fortune-tellers/toggle-online', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setTellerProfile(prev => prev ? { ...prev, isOnline: data.isOnline } : null)
      }
    } catch (e) { console.error('Toggle error:', e) }
    finally { setTellerOnlineToggling(false) }
  }

  const handleTellerSessionAction = async (sessionId: string, action: 'accept' | 'complete' | 'cancel') => {
    setTellerSessionAction(sessionId)
    try {
      const res = await fetch(`/api/fortune-tellers/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) fetchTellerProfile()
    } catch (e) { console.error('Session action error:', e) }
    finally { setTellerSessionAction(null) }
  }

  const handleWithdrawalSubmit = async () => {
    const amount = parseInt(withdrawalAmount)
    if (!amount || amount <= 0) { setWithdrawalMessage('Geçerli bir miktar girin'); return }
    if (withdrawalLimit > 0 && amount > withdrawalLimit) { setWithdrawalMessage(`Maksimum çekim limiti: ${withdrawalLimit} jeton`); return }
    if (!withdrawalAccount.trim()) { setWithdrawalMessage('Hesap bilgilerini girin'); return }
    setWithdrawalLoading(true)
    setWithdrawalMessage('')
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method: withdrawalMethod, accountDetails: withdrawalAccount })
      })
      const data = await res.json()
      if (res.ok) {
        setWithdrawalMessage('✅ Çekim talebi gönderildi!')
        setWithdrawalAmount('')
        setWithdrawalAccount('')
        setShowWithdrawalForm(false)
        fetchTellerProfile()
      } else {
        setWithdrawalMessage(`❌ ${data.error || 'Hata oluştu'}`)
      }
    } catch { setWithdrawalMessage('❌ Bağlantı hatası') }
    finally { setWithdrawalLoading(false) }
  }

  const tellerFilteredSessions = tellerSessions.filter(s => {
    if (tellerTab === 'pending') return s.status === 'pending'
    if (tellerTab === 'active') return s.status === 'active'
    return s.status === 'completed' || s.status === 'cancelled'
  })

  const tellerPendingCount = tellerSessions.filter(s => s.status === 'pending').length
  const tellerActiveCount = tellerSessions.filter(s => s.status === 'active').length

  const handleFortuneAction = async (fortuneId: string, action: 'save' | 'unsave' | 'pin' | 'unpin') => {
    setActionLoading(fortuneId + action)
    try {
      const res = await fetch(`/api/user/fallar/${fortuneId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) fetchFortunes()
      else { const data = await res.json(); if (data.error) alert(data.error) }
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  const pinnedFortunes = fortunes.filter(f => f.isPinned)

  if (status === 'loading' || isLoading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${isFacebook ? 'border-blue-500' : isCosmic ? 'border-blue-400' : 'border-fuchsia-500'} border-t-transparent rounded-full animate-spin`} />
      </div>
    )
  }

  if (!session?.user) return null

  const UserListModal = ({ show, onClose, title, users, loading: mLoading }: {
    show: boolean; onClose: () => void; title: string; users: FollowUser[]; loading: boolean
  }) => (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className={`${modalBg} rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between p-4 border-b ${isFacebook ? 'border-gray-200' : isCosmic ? 'border-blue-900/50' : 'border-purple-900/50'}`}>
              <h3 className={`${textPrimary} font-semibold text-lg`}>{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2">
              {mLoading ? (
                <div className="flex justify-center py-8"><Loader2 className={`w-6 h-6 ${accentColor} animate-spin`} /></div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map(user => (
                    <Link key={user.id} href={`/profil/${user.username || user.id}`}
                      className={`flex items-center gap-3 p-3 rounded-xl ${isFacebook ? 'hover:bg-gray-100' : isCosmic ? 'hover:bg-blue-900/30' : 'hover:bg-purple-900/30'} transition-colors`}
                      onClick={onClose}>
                      <div className={`w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br ${avatarBorder}`}>
                        {user.image ? (
                          <Image src={user.image} alt={user.name} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">{user.name.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                      <div>
                        <p className={`${textPrimary} font-medium`}>{user.name}</p>
                        <p className={`${textSecondary} text-sm`}>@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8"><p className={textSecondary}>{'Henüz kimse yok'}</p></div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className={`min-h-screen ${bgColor} pb-32 pt-2`}>
      {/* Top Header Bar */}
      <div className="max-w-lg mx-auto px-4 py-2 relative">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className={`w-9 h-9 rounded-full ${isCanlidark ? 'bg-white/5 border border-purple-500/20 text-purple-300' : isFacebook ? 'bg-gray-100 text-gray-700' : isCosmic ? 'bg-white/5 border border-blue-500/20 text-blue-300' : 'bg-white/5 border border-fuchsia-500/20 text-purple-300'} flex items-center justify-center hover:bg-white/10 transition-colors`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-lg font-bold ${textPrimary}`}>Profil</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`w-9 h-9 rounded-full ${isCanlidark ? 'bg-white/5 border border-purple-500/20 text-purple-300' : isFacebook ? 'bg-gray-100 text-gray-700' : isCosmic ? 'bg-white/5 border border-blue-500/20 text-blue-300' : 'bg-white/5 border border-fuchsia-500/20 text-purple-300'} flex items-center justify-center hover:bg-white/10 transition-colors`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu overlay to close on outside click */}
        {menuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
        )}

        {/* Hamburger Dropdown Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`absolute right-4 top-14 z-50 w-64 rounded-2xl ${isCanlidark ? 'bg-[#1a0a2e]/95 border border-purple-500/30' : isFacebook ? 'bg-white border border-gray-200 shadow-lg' : isCosmic ? 'bg-[#0d1f3c]/95 border border-blue-500/30' : 'bg-[#1a0a2e]/95 border border-fuchsia-500/30'} backdrop-blur-xl overflow-hidden`}
            >
              <div className="py-2 max-h-[80vh] overflow-y-auto">
                {/* İstatistikler */}
                <Link
                  href="/panel"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                >
                  <BarChart3 className={`w-5 h-5 ${accentColor}`} />
                  <span className="text-sm font-medium">İstatistikler</span>
                </Link>

                {/* Para Çekimi - tellers + admins */}
                {(isTeller || (session.user as any).role === 'admin') && (
                  <button
                    onClick={() => { 
                      setShowWithdrawalSection(true)
                      setMenuOpen(false)
                      setTimeout(() => document.getElementById('withdrawal-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 w-full text-left ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                  >
                    <Wallet className={`w-5 h-5 ${accentColor}`} />
                    <span className="text-sm font-medium">Para Çekimi</span>
                  </button>
                )}

                {/* Sohbet Odası Hediyeleri */}
                <button
                  onClick={() => { 
                    setShowChatGifts(true)
                    setMenuOpen(false)
                    setTimeout(() => document.getElementById('chat-gifts-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
                  }}
                  className={`flex items-center gap-3 px-4 py-3 w-full text-left ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                >
                  <Gift className={`w-5 h-5 ${accentColor}`} />
                  <span className="text-sm font-medium">Sohbet Odası Hediyeleri</span>
                </button>

                {/* Profili Düzenle */}
                <Link
                  href="/ayarlar"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                >
                  <Settings className={`w-5 h-5 ${accentColor}`} />
                  <span className="text-sm font-medium">Profili Düzenle</span>
                </Link>

                {/* Falcı Paneli - only for approved tellers */}
                {isTeller && (
                  <Link
                    href="/canli-falcilar/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                  >
                    <Sparkles className={`w-5 h-5 ${accentColor}`} />
                    <span className="text-sm font-medium">Falcı Paneli</span>
                  </Link>
                )}

                {/* Falcı Ol - only for non-tellers */}
                {!isTeller && (
                  <Link
                    href="/falci-ol"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                  >
                    <Sparkles className={`w-5 h-5 text-pink-400`} />
                    <span className="text-sm font-medium">Falcı Ol</span>
                  </Link>
                )}

                {/* Ajans Paneli - only for agency owner/manager */}
                {myAgency && myAgency.status === 'approved' && (
                  <Link
                    href="/ajans-paneli"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                  >
                    <Building2 className={`w-5 h-5 text-cyan-400`} />
                    <span className="text-sm font-medium">Ajans Paneli</span>
                  </Link>
                )}

                {/* Ajans Ol / Katıl - if not in approved agency */}
                {(!myAgency || myAgency.status !== 'approved') && (
                  <Link
                    href="/ajans"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                  >
                    <Building2 className={`w-5 h-5 text-cyan-400`} />
                    <span className="text-sm font-medium">{myAgency?.status === 'pending' ? 'Ajans Başvurum' : 'Ajans Ol / Katıl'}</span>
                  </Link>
                )}

                {/* Jeton Yükleme - for all users */}
                <Link
                  href="/jeton"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                >
                  <Coins className={`w-5 h-5 text-amber-400`} />
                  <span className="text-sm font-medium">Jeton Yükle</span>
                </Link>

                {/* ═══ ADMIN ŞORTKUT BÖLÜMÜ ═══ */}
                {['admin', 'yonetici', 'moderator', 'finans'].includes((session.user as any).role) && (() => {
                  const Badge = ({ count }: { count?: number }) => (
                    count && count > 0 ? (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : null
                  )
                  const adminItem = (href: string, icon: React.ReactNode, label: string, count?: number) => (
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 ${isFacebook ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/90'} transition-colors`}
                    >
                      {icon}
                      <span className="text-sm font-medium">{label}</span>
                      <Badge count={count} />
                    </Link>
                  )
                  return (
                    <>
                      <div className={`my-1 mx-3 border-t ${isFacebook ? 'border-gray-200' : isCanlidark ? 'border-purple-500/20' : isCosmic ? 'border-blue-500/20' : 'border-fuchsia-500/20'}`} />
                      <div className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold ${isFacebook ? 'text-gray-500' : 'text-fuchsia-300/70'}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <Shield className="w-3 h-3" /> Yönetici Paneli
                        </span>
                      </div>
                      {adminItem('/admin', <Layers className="w-5 h-5 text-fuchsia-400" />, 'Admin Paneli')}
                      {adminItem('/admin/users', <UserPlus className="w-5 h-5 text-blue-400" />, 'Yeni Üyeler', pendingCounts?.newMembers)}
                      {adminItem('/admin/credits', <Coins className="w-5 h-5 text-amber-400" />, 'Jeton Talepleri', pendingCounts?.jetonRequests)}
                      {adminItem('/admin/memberships', <Crown className="w-5 h-5 text-yellow-400" />, 'Gold/Premium Üyelik')}
                      {adminItem('/admin/withdrawals', <DollarSign className="w-5 h-5 text-green-400" />, 'Para Çekme Talepleri', pendingCounts?.withdrawalRequests)}
                      {adminItem('/admin/moderation', <MessageSquareWarning className="w-5 h-5 text-red-400" />, 'Şikayet & Öneriler', pendingCounts?.complaints)}
                      {adminItem('/admin/live-tellers', <Sparkles className="w-5 h-5 text-pink-400" />, 'Falcı Başvuruları', pendingCounts?.tellerApplications)}
                      {adminItem('/admin/ajanslar', <Building2 className="w-5 h-5 text-cyan-400" />, 'Ajans Başvuruları', pendingCounts?.agencyApplications)}
                      {adminItem('/admin/finance', <BarChart3 className="w-5 h-5 text-emerald-400" />, 'Finans Raporları')}
                      {adminItem('/admin/settings', <Settings className="w-5 h-5 text-purple-400" />, 'Site Ayarları')}
                    </>
                  )
                })()}

                {/* Divider */}
                <div className={`my-1 mx-3 border-t ${isFacebook ? 'border-gray-200' : isCanlidark ? 'border-purple-500/20' : isCosmic ? 'border-blue-500/20' : 'border-fuchsia-500/20'}`} />

                {/* Çıkış Yap */}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`flex items-center gap-3 px-4 py-3 w-full text-left ${isFacebook ? 'hover:bg-red-50 text-red-600' : 'hover:bg-red-500/10 text-red-400'} transition-colors`}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Çıkış Yap</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Info */}
      <div className="px-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <FramedAvatar
              src={profile?.image || session.user.image}
              alt={profile?.name || session.user.name || 'Profil'}
              size={112}
              frameUrl={profile?.adminAssignedFrame?.imageUrl || profile?.profileFrame?.imageUrl}
              fallbackInitial={(profile?.name || session.user.name)?.charAt(0) || 'U'}
              borderColor={`border-transparent bg-gradient-to-br ${avatarBorder}`}
            />
            <Link href={`/ayarlar`}
              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-r ${isFacebook ? 'from-blue-500 to-blue-600' : isCosmic ? 'from-blue-500 to-cyan-500' : 'from-fuchsia-500 to-purple-500'} rounded-full flex items-center justify-center border-2 ${isFacebook ? 'border-[#f0f2f5]' : isCosmic ? 'border-[#0a1628]' : 'border-[#0f0520]'} z-20`}>
              <Camera className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>

        {/* Name */}
        <h1 className={`${textPrimary} text-2xl font-bold text-center mt-4`}>
          {profile?.name || session.user.name}
        </h1>

        {/* Membership Badge */}
        <div className="flex justify-center mt-2">
          <MembershipBadge membership={(session.user as any).role === 'admin' ? 'admin' : (profile?.membership || 'basic')} size="md" />
        </div>

        {/* Bio */}
        <div className="text-center mt-2 px-6">
          {editingBio ? (
            <div className="flex flex-col items-center gap-2">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Kendiniz hakkında bir şeyler yazın..."
                className={`w-full max-w-xs text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 ${
                  isCanlidark || !isFacebook
                    ? 'bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/40 focus:ring-purple-500/50'
                    : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/50'
                }`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveBio}
                  disabled={savingBio}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${btnBg}`}
                >
                  {savingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Kaydet'}
                </button>
                <button
                  onClick={() => setEditingBio(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${btnOutline}`}
                >
                  İptal
                </button>
              </div>
              <span className={`text-xs ${textSecondary}`}>{bioText.length}/200</span>
            </div>
          ) : profile?.bio ? (
            <button onClick={() => { setBioText(profile.bio || ''); setEditingBio(true) }} className="cursor-pointer">
              <p className={`${textSecondary} text-sm hover:opacity-70 transition-opacity`}>{profile.bio}</p>
            </button>
          ) : (
            <button onClick={() => { setBioText(''); setEditingBio(true) }} className={`${accentColor} text-sm italic hover:opacity-70 transition-opacity`}>
              + Bio ekle
            </button>
          )}
        </div>

        {/* Level Badge */}
        <div className="mt-4 flex justify-center">
          <UserLevelBadge />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mt-5">
          <button onClick={() => { setShowFollowingModal(true); fetchFollowing() }} className="text-center hover:opacity-80 transition-opacity">
            <p className={`${textPrimary} text-xl font-bold`}>{profile?.followingCount || 0}</p>
            <p className={`${textSecondary} text-xs`}>{'Takipte'}</p>
          </button>
          <div className={`w-px h-8 ${isFacebook ? 'bg-gray-300' : 'bg-gray-700'}`} />
          <button onClick={() => { setShowFollowersModal(true); fetchFollowers() }} className="text-center hover:opacity-80 transition-opacity">
            <p className={`${textPrimary} text-xl font-bold`}>{profile?.followersCount || 0}</p>
            <p className={`${textSecondary} text-xs`}>{'Takipçi'}</p>
          </button>
          <div className={`w-px h-8 ${isFacebook ? 'bg-gray-300' : 'bg-gray-700'}`} />
          <button onClick={() => { setShowLikersModal(true); fetchLikers() }} className="text-center hover:opacity-80 transition-opacity">
            <p className={`${textPrimary} text-xl font-bold`}>{profile?.likesCount || 0}</p>
            <p className={`${textSecondary} text-xs`}>{'Beğeniler'}</p>
          </button>
        </div>

      </div>



      {/* ===== HEDİYE VERENLer + ÇEKIM ===== */}
      {isTeller && tellerProfile && showWithdrawalSection && (
        <div className="px-4 mt-3 space-y-3">
          {/* Gift Givers Section */}
          {tellerGiftSenders.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-2xl border overflow-hidden ${
                isFacebook ? 'bg-white border-blue-200 shadow' : isCosmic ? 'bg-blue-900/30 border-blue-500/30' : 'bg-purple-900/30 border-fuchsia-500/30'
              }`}>
              <button onClick={() => setGiftsOpen(!giftsOpen)}
                className={`w-full flex items-center justify-between p-3 ${isFacebook ? 'hover:bg-blue-50' : 'hover:bg-white/5'} transition-colors`}>
                <div className="flex items-center gap-2">
                  <Gift className={`w-4 h-4 ${isFacebook ? 'text-pink-500' : 'text-pink-400'}`} />
                  <span className={`text-sm font-semibold ${textPrimary}`}>
                    {'Hediye Verenler'} ({tellerGiftSenders.length})
                  </span>
                </div>
                {giftsOpen ? <ChevronUp className={`w-4 h-4 ${textSecondary}`} /> : <ChevronDown className={`w-4 h-4 ${textSecondary}`} />}
              </button>
              <AnimatePresence>
                {giftsOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className={`px-3 pb-3 border-t ${isFacebook ? 'border-gray-100' : isCosmic ? 'border-blue-800/30' : 'border-purple-800/30'}`}>
                      <p className={`text-[10px] ${textSecondary} mt-2 mb-2`}>{'Son 7 gün'}</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {tellerGiftSenders.map((g, i) => (
                          <div key={i} className={`flex items-center justify-between p-2 rounded-xl ${
                            isFacebook ? 'bg-gray-50' : isCosmic ? 'bg-blue-900/20' : 'bg-purple-900/20'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : textSecondary}`}>
                                {i + 1}.
                              </span>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ${
                                isFacebook ? 'bg-blue-100' : 'bg-gradient-to-br from-pink-600 to-purple-600'
                              }`}>
                                {g.senderImage ? <img loading="lazy" src={g.senderImage} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-white/70" />}
                              </div>
                              <div>
                                <p className={`text-xs font-medium ${textPrimary}`}>{g.senderName}</p>
                                <p className={`text-[10px] ${textSecondary}`}>{g.giftCount} {'hediye'}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${isFacebook ? 'text-green-600' : 'text-green-400'}`}>
                              {g.totalAmount} jeton
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Withdrawal Section */}
          {tellerProfile.canWithdraw && (
            <motion.div id="withdrawal-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-2xl border overflow-hidden ${
                isFacebook ? 'bg-white border-blue-200 shadow' : isCosmic ? 'bg-blue-900/30 border-blue-500/30' : 'bg-purple-900/30 border-fuchsia-500/30'
              }`}>
              <button onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
                className={`w-full flex items-center justify-between p-3 ${isFacebook ? 'hover:bg-blue-50' : 'hover:bg-white/5'} transition-colors`}>
                <div className="flex items-center gap-2">
                  <Wallet className={`w-4 h-4 ${isFacebook ? 'text-green-600' : 'text-green-400'}`} />
                  <span className={`text-sm font-semibold ${textPrimary}`}>
                    {'Para Çekimi'}
                  </span>
                  {withdrawalLimit > 0 && (
                    <span className={`text-[10px] ${textSecondary}`}>
                      (Max {withdrawalLimit} jeton)
                    </span>
                  )}
                  <span className={`text-[10px] ${textSecondary}`}>
                    (min: 6bin jeton - 3.000₺)
                  </span>
                </div>
                {showWithdrawalForm ? <ChevronUp className={`w-4 h-4 ${textSecondary}`} /> : <ChevronDown className={`w-4 h-4 ${textSecondary}`} />}
              </button>
              <AnimatePresence>
                {showWithdrawalForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className={`px-3 pb-3 border-t ${isFacebook ? 'border-gray-100' : isCosmic ? 'border-blue-800/30' : 'border-purple-800/30'} space-y-2`}>
                      <div className="mt-2">
                        <label className={`text-xs ${textSecondary}`}>{'Miktar (Jeton)'}</label>
                        <input type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} placeholder={`${'Örn'}: 100`}
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border ${
                            isFacebook ? 'bg-gray-50 border-gray-200 text-gray-900' : isCosmic ? 'bg-blue-900/30 border-blue-700/30 text-white' : 'bg-purple-900/30 border-purple-700/30 text-white'
                          } outline-none`} />
                        {withdrawalAmount && (
                          <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                            ≈ {(parseInt(withdrawalAmount) * jetonTlRate).toFixed(2)} TL
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary}`}>{'Yöntem'}</label>
                        <select value={withdrawalMethod} onChange={e => setWithdrawalMethod(e.target.value)}
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border ${
                            isFacebook ? 'bg-gray-50 border-gray-200 text-gray-900' : isCosmic ? 'bg-blue-900/30 border-blue-700/30 text-white' : 'bg-purple-900/30 border-purple-700/30 text-white'
                          } outline-none`}>
                          <option value="bank_transfer">{'Banka Havalesi'}</option>
                          <option value="papara">Papara</option>
                          <option value="crypto">{'Kripto'}</option>
                        </select>
                      </div>
                      <div>
                        <label className={`text-xs ${textSecondary}`}>{'Hesap Bilgileri (IBAN/Adres)'}</label>
                        <textarea value={withdrawalAccount} onChange={e => setWithdrawalAccount(e.target.value)} rows={2}
                          className={`w-full mt-1 px-3 py-2 rounded-xl text-sm border ${
                            isFacebook ? 'bg-gray-50 border-gray-200 text-gray-900' : isCosmic ? 'bg-blue-900/30 border-blue-700/30 text-white' : 'bg-purple-900/30 border-purple-700/30 text-white'
                          } outline-none resize-none`} />
                      </div>
                      {withdrawalMessage && <p className={`text-xs ${withdrawalMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{withdrawalMessage}</p>}
                      <button onClick={handleWithdrawalSubmit} disabled={withdrawalLoading}
                        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          isFacebook ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                        } disabled:opacity-50`}>
                        {withdrawalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> {'Çekim Talebi Gönder'}</>}
                      </button>
                      {/* Withdrawal History */}
                      {withdrawalHistory.length > 0 && (
                        <div className="mt-2">
                          <p className={`text-xs font-medium ${textPrimary} mb-1`}>{'Geçmiş Talepler'}</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {withdrawalHistory.slice(0, 5).map((wr: any) => (
                              <div key={wr.id} className={`flex items-center justify-between p-2 rounded-lg text-[10px] ${
                                isFacebook ? 'bg-gray-50' : 'bg-black/20'
                              }`}>
                                <div>
                                  <span className={`font-medium ${textPrimary}`}>{wr.amount} jeton</span>
                                  <span className={`ml-1 ${textSecondary}`}>({wr.amountTL} TL)</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                                  wr.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                  wr.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>{wr.status === 'pending' ? ('Bekliyor') : wr.status === 'approved' ? ('Onaylandı') : ('Reddedildi')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {/* Chat Room Received Gifts */}
      {showChatGifts && (
        <div id="chat-gifts-section" className="px-4 mt-3">
          <ChatRoomReceivedGifts language={language} isFacebook={isFacebook} isCosmic={isCosmic} textPrimary={textPrimary} textSecondary={textSecondary} />
        </div>
      )}

      {/* Pinned Fortunes */}
      {pinnedFortunes.length > 0 && (
        <div className="mt-6 px-4">
          <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}>
            <Pin className={`w-4 h-4 ${accentColor}`} />
            {'Sabitlenen Fallar'}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {pinnedFortunes.map(fortune => (
              <Link key={fortune.id} href={`/panel?fortune=${fortune.id}`}
                className={`flex-shrink-0 w-32 rounded-xl p-3 border ${pinnedCardBg}`}>
                <div className="text-2xl mb-2">{FORTUNE_ICONS[fortune.fortuneType] || '🔮'}</div>
                <p className={`${textPrimary} text-xs font-medium truncate`}>
                  {FORTUNE_NAMES[fortune.fortuneType]?.[language as 'tr' | 'en'] || fortune.fortuneType}
                </p>
                <p className={`${textSecondary} text-[10px] mt-1`}>
                  {format(new Date(fortune.createdAt), 'dd MMM', { locale: tr})}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex border-b ${isFacebook ? 'border-gray-200' : 'border-white/10'} mt-6`}>
        <button onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'posts' ? `border-b-2 ${tabActive}` : tabInactive}`}>
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab('fortunes')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'fortunes' ? `border-b-2 ${tabActive}` : tabInactive}`}>
          <Sparkles className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'saved' ? `border-b-2 ${tabActive}` : tabInactive}`}>
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-0.5 pt-0.5">
        {activeTab === 'posts' && (
          <>
            {posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <Link key={post.id} href={`/fal/${post.id}`}
                    className="relative aspect-[3/4] bg-[#1a1a1a] overflow-hidden group">
                    {post.isPinned && (
                      <div className={`absolute top-1 left-1 z-10 ${isFacebook ? 'bg-blue-500' : 'bg-pink-500'} text-white text-[9px] px-1.5 py-0.5 rounded font-medium`}>
                        {'Sabitlendi'}
                      </div>
                    )}
                    {post.imageUrl ? (
                      <Image src={post.imageUrl} alt="Post" fill className="object-cover" />
                    ) : post.fortuneType && FORTUNE_THUMBNAIL_IMAGES[post.fortuneType] ? (
                      <div className="w-full h-full relative">
                        <Image src={FORTUNE_THUMBNAIL_IMAGES[post.fortuneType]} alt={FORTUNE_THUMBNAIL_LABELS[post.fortuneType] || post.fortuneType} fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-0 right-0 text-center px-1">
                          <span className="text-white text-[11px] font-semibold drop-shadow-lg leading-tight">
                            {FORTUNE_THUMBNAIL_LABELS[post.fortuneType] || post.fortuneType}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isFacebook ? 'bg-blue-50' : isCosmic ? 'bg-blue-900/30' : 'bg-gradient-to-br from-purple-900/50 to-pink-900/50'}`}>
                        <Sparkles className={`w-8 h-8 ${accentColor}`} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white text-sm"><Eye className="w-4 h-4" /><span>{post.viewCount || 0}</span></div>
                      <div className="flex items-center gap-1 text-white text-sm"><Heart className="w-4 h-4" /><span>{post._count?.likes || 0}</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className={`w-20 h-20 rounded-full border-2 ${isFacebook ? 'border-gray-300' : 'border-gray-600'} flex items-center justify-center mb-4`}>
                  <Camera className={`w-10 h-10 ${isFacebook ? 'text-gray-300' : 'text-gray-600'}`} />
                </div>
                <p className={`${textPrimary} text-xl font-semibold`}>{'Henüz paylaşım yok'}</p>
                <p className={`${textSecondary} text-sm mt-1`}>{'Fal paylaşımlarınız burada görünecek'}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'fortunes' && (
          <>
            {fortunes.length > 0 ? (
              <div className="px-4 py-4 space-y-3">
                {fortunes.map((fortune) => (
                  <div key={fortune.id} className={`rounded-xl p-4 border ${fortuneCardBg}`}>
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{FORTUNE_ICONS[fortune.fortuneType] || '🔮'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`${textPrimary} font-semibold`}>
                            {FORTUNE_NAMES[fortune.fortuneType]?.[language as 'tr' | 'en'] || fortune.fortuneType}
                          </h4>
                          {fortune.isPinned && (
                            <span className={`${isFacebook ? 'bg-blue-500' : 'bg-pink-500'} text-white text-[9px] px-1.5 py-0.5 rounded font-medium`}>
                              {'Sabitlendi'}
                            </span>
                          )}
                        </div>
                        <p className={`${textSecondary} text-sm mt-0.5`}>
                          {format(new Date(fortune.createdAt), 'dd MMMM yyyy, HH:mm', { locale: tr})}
                        </p>
                        <p className={`${isFacebook ? 'text-gray-600' : 'text-gray-300'} text-sm mt-2 line-clamp-2`}>
                          {fortune.aiResponse.substring(0, 150)}...
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isFacebook ? 'border-gray-200' : isCosmic ? 'border-blue-700/30' : 'border-fuchsia-700/30'}`}>
                      <Link href={`/panel?fortune=${fortune.id}`} className={`${accentColor} text-sm font-medium`}>
                        {'Detayları Gör'} →
                      </Link>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleFortuneAction(fortune.id, fortune.isSaved ? 'unsave' : 'save')}
                          disabled={actionLoading === fortune.id + (fortune.isSaved ? 'unsave' : 'save')}
                          className={`p-2 rounded-lg transition-colors ${fortune.isSaved ? fortuneBtnSaved : fortuneBtnNormal}`}>
                          {actionLoading === fortune.id + (fortune.isSaved ? 'unsave' : 'save') ? <Loader2 className="w-4 h-4 animate-spin" /> : fortune.isSaved ? <BookmarkMinus className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleFortuneAction(fortune.id, fortune.isPinned ? 'unpin' : 'pin')}
                          disabled={actionLoading === fortune.id + (fortune.isPinned ? 'unpin' : 'pin')}
                          className={`p-2 rounded-lg transition-colors ${fortune.isPinned ? (isFacebook ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white') : fortuneBtnNormal}`}>
                          {actionLoading === fortune.id + (fortune.isPinned ? 'unpin' : 'pin') ? <Loader2 className="w-4 h-4 animate-spin" /> : fortune.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className={`w-20 h-20 rounded-full border-2 ${isFacebook ? 'border-gray-300' : 'border-gray-600'} flex items-center justify-center mb-4`}>
                  <Sparkles className={`w-10 h-10 ${isFacebook ? 'text-gray-300' : 'text-gray-600'}`} />
                </div>
                <p className={`${textPrimary} text-xl font-semibold`}>{'Fallarınız'}</p>
                <p className={`${textSecondary} text-sm mt-1 text-center px-8`}>{'Baktırdığınız fallar burada görünecek'}</p>
                <Link href={`/fallar`}
                  className={`mt-4 px-6 py-2 bg-gradient-to-r ${isFacebook ? 'from-blue-500 to-blue-600' : isCosmic ? 'from-blue-500 to-cyan-500' : 'from-fuchsia-500 to-purple-600'} text-white font-semibold rounded-md`}>
                  {'Fal Baktır'}
                </Link>
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && (
          <>
            {savedFortunes.length > 0 ? (
              <div className="px-4 py-4 space-y-3">
                {savedFortunes.map((fortune) => (
                  <div key={fortune.id} className={`rounded-xl p-4 border ${fortuneCardBg}`}>
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{FORTUNE_ICONS[fortune.fortuneType] || '🔮'}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`${textPrimary} font-semibold`}>
                          {FORTUNE_NAMES[fortune.fortuneType]?.[language as 'tr' | 'en'] || fortune.fortuneType}
                        </h4>
                        <p className={`${textSecondary} text-sm mt-0.5`}>
                          {format(new Date(fortune.createdAt), 'dd MMMM yyyy', { locale: tr})}
                        </p>
                      </div>
                      <button onClick={() => handleFortuneAction(fortune.id, 'unsave')}
                        disabled={actionLoading === fortune.id + 'unsave'}
                        className={`p-2 rounded-lg ${fortuneBtnSaved}`}>
                        {actionLoading === fortune.id + 'unsave' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkMinus className="w-4 h-4" />}
                      </button>
                    </div>
                    <Link href={`/panel?fortune=${fortune.id}`}
                      className={`block mt-3 ${accentColor} text-sm font-medium`}>
                      {'Detayları Gör'} →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className={`w-20 h-20 rounded-full border-2 ${isFacebook ? 'border-gray-300' : 'border-gray-600'} flex items-center justify-center mb-4`}>
                  <Bookmark className={`w-10 h-10 ${isFacebook ? 'text-gray-300' : 'text-gray-600'}`} />
                </div>
                <p className={`${textPrimary} text-xl font-semibold`}>{'Kaydedilenler'}</p>
                <p className={`${textSecondary} text-sm mt-1`}>{'Kaydettiğiniz fallar burada görünecek'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <UserListModal show={showFollowersModal} onClose={() => setShowFollowersModal(false)}
        title={'Takipçiler'} users={followers} loading={modalLoading} />
      <UserListModal show={showFollowingModal} onClose={() => setShowFollowingModal(false)}
        title={'Takip Edilenler'} users={following} loading={modalLoading} />
      <UserListModal show={showLikersModal} onClose={() => setShowLikersModal(false)}
        title={'Beğenenler'} users={likers} loading={modalLoading} />
    </div>
  )
}