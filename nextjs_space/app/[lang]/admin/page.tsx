'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Users, Sparkles, TrendingUp, Coffee, Star, Moon, Plus, MessageCircle,
  Crown, Shield, Mic, Ban, UserMinus, VolumeX, Volume2, MoreVertical,
  X, ChevronDown, Settings, Megaphone, Save, CheckCircle, Eye, Video,
  CreditCard, Radio, Palette, LayoutDashboard, ChevronRight, Menu,
  DollarSign, BarChart3, Globe, Gift, Zap, Bell, Home, Lock, Layers, Coins, MessageSquare, Wallet, Search, Trash2, Gamepad2, BookOpen, MessagesSquare,
  Image as ImageIcon, Smartphone, Tablet, Monitor, Bot, Activity, FileText, Trophy, ShieldAlert, Award, HardDrive,
  Smile, Wand2, Frame
} from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/loading-spinner'
import { LiveVisitorCount } from '@/components/live-visitor-count'
import { format } from 'date-fns'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'

interface User {
  id: string
  email: string
  name: string
  username?: string
  credits: number
  role: string
  preferredLanguage: string
  createdAt: string
  _count: { fortunes: number }
}

interface ChatRoom {
  id: string
  slug: string
  nameEn: string
  nameTr: string
  icon: string
  messageCount: number
  onlineCount: number
}

interface ChatUserRole {
  id: string
  userId: string
  role: string
  user: { id: string; name: string }
}

interface ChatMute {
  id: string
  userId: string
  user: { id: string; name: string }
}

interface ChatBan {
  id: string
  userId: string
  user: { id: string; name: string }
}

interface Statistics {
  totalUsers: number
  totalFortunes: number
  fortunesByType: Record<string, number>
  users?: {
    total: number; newToday: number; newThisWeek: number; newThisMonth: number; premium: number; vip: number
  }
  fortunes?: { total: number; totalViews: number; byType: Record<string, number> }
  social?: { totalPosts: number; postsToday: number; totalLikes: number; totalComments: number; totalShares: number }
  messaging?: { totalMessages: number; messagesThisWeek: number; totalConversations: number }
  community?: { totalFollows: number }
  streams?: { total: number; active: number; totalGiftsValue: number; totalLikes: number }
  economy?: { creditsInCirculation: number; creditsSpent: number; cfcInCirculation?: number; jetonInCirculation?: number; jetonLoaded?: number; jetonGiftSent?: number; jetonGiftReceived?: number; jetonCommission?: number; jetonSpent?: number; chatGiftJetonTotal?: number; chatGiftCfcTotal?: number; chatGiftCommissionTotal?: number }
}

interface ActiveVisitor {
  visitorId: string
  userId: string | null
  userName: string | null
  path: string | null
  lastSeen: string
  deviceType: string | null
  isBot: boolean
  botName: string | null
}

interface VisitorStats {
  today: { total: number; unique: number }
  week: { total: number; unique: number }
  month: { total: number; unique: number }
  year: { total: number; unique: number }
  geo: {
    countries: { country: string; count: number }[]
    cities: { city: string; count: number }[]
  }
  devices?: { deviceType: string; count: number }[]
  bots?: { botName: string; count: number }[]
  recentBots?: { botName: string; path: string; lastSeen: string }[]
  activeVisitors?: ActiveVisitor[]
}

type AdminTab = 'dashboard' | 'users' | 'chat' | 'economy' | 'gift-settings' | 'ads' | 'visitors' | 'statistics'

const SIDEBAR_ITEMS: { id: AdminTab; icon: React.ElementType; trLabel: string; enLabel: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, trLabel: 'Gösterge Paneli', enLabel: 'Dashboard' },
  { id: 'users', icon: Users, trLabel: 'Kullanıcılar', enLabel: 'Users' },
  { id: 'chat', icon: MessageCircle, trLabel: 'Sohbet Yönetimi', enLabel: 'Chat Management' },
  { id: 'economy', icon: DollarSign, trLabel: 'Gelir-Gider Tablosu', enLabel: 'Income & Expenses' },
  { id: 'gift-settings', icon: Gift, trLabel: 'Hediye Komisyon', enLabel: 'Gift Commission' },
  { id: 'ads', icon: Megaphone, trLabel: 'Reklam Yönetimi', enLabel: 'Ad Management' },
  { id: 'visitors', icon: Globe, trLabel: 'Ziyaretçi İstatistikleri', enLabel: 'Visitor Stats' },
  { id: 'statistics', icon: BarChart3, trLabel: 'Tüm İstatistikler', enLabel: 'All Statistics' },
]

interface ManagementLink { href: string; icon: React.ElementType; trLabel: string; enLabel: string; emoji?: string; desc?: string }
interface ManagementGroup { groupLabel: string; groupIcon: string; links: ManagementLink[] }

const MANAGEMENT_GROUPS: ManagementGroup[] = [
  {
    groupLabel: '💰 Finans & Jeton',
    groupIcon: '💰',
    links: [
      { href: `/admin/finance`, icon: TrendingUp, trLabel: 'Finans Yönetimi', enLabel: 'Finance Management', emoji: '📊', desc: 'Gelir-gider takibi' },
      { href: `/admin/credits`, icon: Coins, trLabel: 'Jeton Yükleme', enLabel: 'Load Jetons', emoji: '🪙', desc: 'Kullanıcılara jeton ekle' },
      { href: `/admin/credit-packages`, icon: DollarSign, trLabel: 'CFC Paketleri', enLabel: 'CFC Packages', emoji: '📦', desc: 'Satış paketlerini düzenle' },
      { href: `/admin/payment-methods`, icon: CreditCard, trLabel: 'Ödeme Yöntemleri', enLabel: 'Payment Methods', emoji: '💳', desc: 'Ödeme seçenekleri' },
      { href: `/admin/withdrawals`, icon: Wallet, trLabel: 'Çekim & Ödüller', enLabel: 'Withdrawals & Awards', emoji: '🏧', desc: 'Para çekim talepleri' },
      { href: `/admin/currency-config`, icon: Coins, trLabel: 'Jeton / CFC Yönetimi', enLabel: 'Jeton / CFC Management', emoji: '⚖️', desc: 'Kur ve birim ayarları' },
      { href: `/admin/ad-networks`, icon: Monitor, trLabel: 'Reklam Ağı Yönetimi', enLabel: 'Ad Network Management', emoji: '📺', desc: 'Reklam entegrasyonları' },
    ],
  },
  {
    groupLabel: '🎁 Hediye & Koleksiyon',
    groupIcon: '🎁',
    links: [
      { href: `/admin/gifts`, icon: Gift, trLabel: 'Hediye Kataloğu', enLabel: 'Gift Catalog', emoji: '🎁', desc: 'Hediye türlerini oluştur, düzenle, medya yükle' },
      { href: `/admin/room-themes/backgrounds`, icon: ImageIcon, trLabel: 'Arka Plan Yönetimi', enLabel: 'Background Management', emoji: '🌅', desc: 'Sesli oda arka planları — VIP, Premium, efektli' },
    ],
  },
  {
    groupLabel: '🏢 Ajans Yönetimi',
    groupIcon: '🏢',
    links: [
      { href: `/admin/ajanslar`, icon: Shield, trLabel: 'Ajans Yönetimi', enLabel: 'Agency Management', emoji: '🏢', desc: 'Ajansları yönet' },
    ],
  },
  {
    groupLabel: '👥 Kullanıcı & Üyelik',
    groupIcon: '👥',
    links: [
      { href: `/admin/users`, icon: Shield, trLabel: 'Kullanıcı Yönetimi', enLabel: 'User Management', emoji: '👤', desc: 'Üyeleri düzenle & yönet' },
      { href: `/admin/memberships`, icon: Crown, trLabel: 'Gold Üyelik Yönetimi', enLabel: 'Membership Mgmt', emoji: '👑', desc: 'VIP üyelik paketleri' },
      { href: `/admin/badges`, icon: Shield, trLabel: 'Rozet Yönetimi', enLabel: 'Badge Management', emoji: '🏅', desc: 'Rozetleri oluştur & ata' },
      { href: `/admin/profile-frames`, icon: Shield, trLabel: 'Profil Çerçeve Yönetimi', enLabel: 'Profile Frame Management', emoji: '🖼️', desc: 'Profil çerçeveleri' },
      { href: `/admin/membership-badges`, icon: Award, trLabel: 'Üyelik Rozetleri', enLabel: 'Membership Badges', emoji: '🎖️', desc: 'Üyelik seviye rozetleri' },
      { href: `/admin/name-effects`, icon: Wand2, trLabel: 'İsim Efektleri', enLabel: 'Name Effects', emoji: '✨', desc: 'Renkli/animasyonlu isim stilleri' },
      { href: `/admin/entrance-effects`, icon: Zap, trLabel: 'Giriş Efektleri', enLabel: 'Entrance Effects', emoji: '⚡', desc: 'Odaya giriş animasyonları' },
      { href: `/admin/chat-bubbles`, icon: MessageCircle, trLabel: 'Sohbet Balonları', enLabel: 'Chat Bubbles', emoji: '💬', desc: 'Mesaj balonu görünümleri' },
      { href: `/admin/mic-frames`, icon: Mic, trLabel: 'Mikrofon Çerçeveleri', enLabel: 'Mic Frames', emoji: '🎤', desc: 'Koltuk/mikrofon çerçeveleri' },
      { href: `/admin/emoji-packs`, icon: Smile, trLabel: 'Emoji Paketleri', enLabel: 'Emoji Packs', emoji: '😄', desc: 'Özel emoji koleksiyonları' },
      { href: `/admin/avatar-accessories`, icon: Frame, trLabel: 'Avatar Aksesuarları', enLabel: 'Avatar Accessories', emoji: '🎩', desc: 'Şapka, gözlük, taç vb.' },
      { href: `/admin/room-themes`, icon: ImageIcon, trLabel: 'Oda Temaları', enLabel: 'Room Themes', emoji: '🏞️', desc: 'Oda arka plan temaları' },
      { href: `/admin/moderation`, icon: ShieldAlert, trLabel: 'İçerik Moderasyonu', enLabel: 'Content Moderation', emoji: '🛡️', desc: 'Raporlanan içerikler' },
    ],
  },
  {
    groupLabel: '📝 İçerik Yönetimi',
    groupIcon: '📝',
    links: [
      { href: `/admin/blog`, icon: BookOpen, trLabel: 'Blog Yönetimi', enLabel: 'Blog Management', emoji: '📰', desc: 'Yazıları oluştur & düzenle' },
      { href: `/admin/dreams`, icon: Moon, trLabel: 'Rüya Tabirleri Yönetimi', enLabel: 'Dream Interpretations', emoji: '🌙', desc: 'Rüya yorumları' },
      { href: `/admin/site-pages`, icon: FileText, trLabel: 'Sayfa Yönetimi', enLabel: 'Page Management', emoji: '📄', desc: 'Statik sayfaları düzenle' },
      { href: `/admin/bana-ozel`, icon: Sparkles, trLabel: 'Bana Özel Yönetimi', enLabel: 'Personalized Content', emoji: '✨', desc: 'Kişiselleştirilmiş içerik' },
      { href: `/admin/online-fal`, icon: Sparkles, trLabel: 'Online Fal Sayfası', enLabel: 'Online Fortune Page', emoji: '🔮', desc: 'Online fal ayarları' },
      { href: `/admin/unluler`, icon: Star, trLabel: 'Ünlü Yönetimi', enLabel: 'Celebrity Management', emoji: '⭐', desc: 'Ünlü profilleri yönet' },
      { href: `/admin/celebrity-posts`, icon: Star, trLabel: 'Ünlü Paylaşımları', enLabel: 'Celebrity Posts', emoji: '📱', desc: 'Sosyal medya paylaşımlarını yönet' },
      { href: `/admin/trend-videos`, icon: TrendingUp, trLabel: 'Trend Videolar', enLabel: 'Trend Videos', emoji: '🎬', desc: 'YouTube trend videolarını yönet' },
      { href: `/admin/tiktok-videos`, icon: TrendingUp, trLabel: 'TikTok Videoları', enLabel: 'TikTok Videos', emoji: '🎵', desc: 'TikTok videolarını yönet' },
      { href: `/admin/trendler`, icon: TrendingUp, trLabel: 'Trend Yönetimi', enLabel: 'Trend Management', emoji: '🔥', desc: 'Platform trendlerini yönet' },
    ],
  },
  {
    groupLabel: '📺 Canlı & Sohbet',
    groupIcon: '📺',
    links: [
      { href: `/admin/live-tellers`, icon: Video, trLabel: 'Canlı Falcı Yönetimi', enLabel: 'Live Teller Mgmt', emoji: '🎯', desc: 'Falcı onay & düzenleme' },
      { href: `/admin/video-streams`, icon: Radio, trLabel: 'Canlı Yayın Yönetimi', enLabel: 'Stream Mgmt', emoji: '📡', desc: 'Aktif yayınlar & kontrol' },
      { href: `/admin/broadcast-images`, icon: ImageIcon, trLabel: 'Yayın Resimleri', enLabel: 'Broadcast Images', emoji: '🎨', desc: 'Yayın arka plan görselleri' },
      { href: `/admin/chat-rooms`, icon: MessagesSquare, trLabel: 'Sohbet Odaları', enLabel: 'Chat Rooms', emoji: '💬', desc: 'Oda oluştur & yönet' },
    ],
  },
  {
    groupLabel: '⚙️ Görünüm & Ayarlar',
    groupIcon: '⚙️',
    links: [
      { href: `/admin/settings`, icon: Settings, trLabel: 'Platform Ayarları', enLabel: 'Platform Settings', emoji: '⚙️', desc: 'Genel platform yapılandırma' },
      { href: `/admin/themes`, icon: Palette, trLabel: 'Tema Yönetimi', enLabel: 'Theme Management', emoji: '🎨', desc: 'Site renk & tema değiştir' },
      { href: `/admin/homepage-buttons`, icon: LayoutDashboard, trLabel: 'Ana Sayfa Butonları', enLabel: 'Homepage Buttons', emoji: '🔘', desc: 'Anasayfa buton düzeni' },
      { href: `/admin/homepage-cards`, icon: LayoutDashboard, trLabel: 'Anasayfa Kartları & Hero', enLabel: 'Homepage Cards & Hero', emoji: '🃏', desc: 'Hero & kart görselleri' },
      { href: `/admin/ticker-messages`, icon: MessageSquare, trLabel: 'Kayan Yazı Yönetimi', enLabel: 'Ticker Messages', emoji: '📜', desc: 'Kayan duyuru bantları' },
      { href: `/admin/activity-feed`, icon: Activity, trLabel: 'Canlı Aktivite Akışı', enLabel: 'Live Activity Feed', emoji: '📈', desc: 'Gerçek zamanlı aktivite' },
      { href: `/admin/notifications`, icon: Bell, trLabel: 'Push Bildirim Yönetimi', enLabel: 'Push Notification Mgmt', emoji: '🔔', desc: 'Bildirim gönder & yönet' },
      { href: `/admin/announcement-settings`, icon: Megaphone, trLabel: 'Giriş Duyurusu Ayarları', enLabel: 'Entry Announcement Settings', emoji: '📢', desc: 'Duyuru şablonları & efektler' },
      { href: `/admin/popups`, icon: MessageSquare, trLabel: 'Popup Yönetimi', enLabel: 'Popup Management', emoji: '💫', desc: 'Açılır pencere ayarları' },
      { href: `/admin/games`, icon: Gamepad2, trLabel: 'Oyun Merkezi', enLabel: 'Game Center', emoji: '🎮', desc: 'Oyunları düzenle' },
      { href: `/admin/contests`, icon: Trophy, trLabel: 'Yarışma Yönetimi', enLabel: 'Contest Management', emoji: '🏆', desc: 'Yarışma oluştur & yönet' },
      { href: `/admin/backup`, icon: HardDrive, trLabel: 'Site Yedekleme', enLabel: 'Site Backup', emoji: '💾', desc: 'Veri yedekleme işlemleri' },
      { href: `/admin/bots`, icon: Bot, trLabel: 'AI Bot Yönetimi', enLabel: 'AI Bot Management', emoji: '🤖', desc: 'Bot simülasyonu & kontrol' },
    ],
  },
]

// Flatten for sidebar
const MANAGEMENT_LINKS = (_lang: string) => MANAGEMENT_GROUPS.flatMap(g => g.links)

export default function AdminPage() {
  const { language, t } = useLanguage()
  const { theme } = useSiteTheme()
  const [users, setUsers] = useState<User[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [adminUserSearch, setAdminUserSearch] = useState('')
  const [creditAmount, setCreditAmount] = useState(10)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [lastVisitedHref, setLastVisitedHref] = useState<string | null>(null)

  // Load last visited link from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_last_visited')
      if (saved) setLastVisitedHref(saved)
    } catch {}
  }, [])

  // Chat management state
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [roomModData, setRoomModData] = useState<{
    roomMuted: boolean; roles: ChatUserRole[]; mutes: ChatMute[]; bans: ChatBan[];
    ownerId?: string | null; owner?: { id: string; name: string; username?: string | null } | null
  } | null>(null)
  const [roleUserId, setRoleUserId] = useState('')
  const [roleType, setRoleType] = useState('op')
  const [ownerUserId, setOwnerUserId] = useState('')

  // Ads management state
  const [adSettings, setAdSettings] = useState<Record<string, string>>({})
  const [adSaveStatus, setAdSaveStatus] = useState<string | null>(null)

  // Gift commission state
  const [commissionRooms, setCommissionRooms] = useState<any[]>([])
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editPercent, setEditPercent] = useState(0)
  const [editBeneficiary, setEditBeneficiary] = useState('')
  const [beneficiarySearch, setBeneficiarySearch] = useState('')
  const [beneficiaryResults, setBeneficiaryResults] = useState<any[]>([])

  // Theme colors
  const isFalclub = theme === 'falclub' || theme === 'falci'
  const isCosmic = theme === 'cosmic'
  const isFacebook = theme === 'facebook'

  const bgColor = isFacebook ? 'bg-[#f0f2f5]' : isCosmic ? '' : ''
  const sidebarBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-[#0d1f3c] border-blue-900/30' : 'bg-[#1a0a2e]/95 border-fuchsia-900/30'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const textMuted = isFacebook ? 'text-gray-400' : isCosmic ? 'text-blue-400/60' : 'text-purple-400/60'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const accentBg = isFacebook ? 'bg-blue-50 text-blue-600' : isCosmic ? 'bg-blue-500/10 text-blue-400' : 'bg-fuchsia-500/10 text-fuchsia-400'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const btnPrimary = isFacebook ? 'bg-blue-500 hover:bg-blue-600 text-white' : isCosmic ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
  const btnSecondary = isFacebook ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : isCosmic ? 'bg-blue-900/50 hover:bg-blue-800/50 text-blue-200' : 'bg-purple-900/50 hover:bg-purple-800/50 text-purple-200'
  const inputBg = isFacebook ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400' : isCosmic ? 'bg-blue-900/30 border-blue-700/50 text-blue-100 placeholder-blue-400/50' : 'bg-purple-900/30 border-fuchsia-700/30 text-purple-100 placeholder-purple-400/50'
  const tableBorder = isFacebook ? 'border-gray-200' : isCosmic ? 'border-blue-800/30' : 'border-purple-800/30'
  const hoverRow = isFacebook ? 'hover:bg-gray-50' : isCosmic ? 'hover:bg-blue-900/20' : 'hover:bg-purple-900/20'
  const statCardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/15' : 'bg-[#1a0a2e]/60 border border-fuchsia-500/15'
  const goldColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-amber-400' : 'text-amber-400'
  const modalBg = isFacebook ? 'bg-white border-gray-200' : isCosmic ? 'bg-[#0d1f3c] border-blue-500/30' : 'bg-[#1a0a2e] border-fuchsia-500/30'

  useEffect(() => { fetchData(); fetchAdSettings(); fetchVisitorStats() }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsersWithSearch(adminUserSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [adminUserSearch])

  const fetchUsersWithSearch = async (query: string) => {
    try {
      const url = query ? `/api/admin/users?search=${encodeURIComponent(query)}&limit=50` : '/api/admin/users?limit=50'
      const res = await fetch(url)
      const data = await res.json()
      setUsers(data?.users || data || [])
    } catch (e) { console.error(e) }
  }

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, roomsRes] = await Promise.all([
        fetch('/api/admin/users?limit=50'), fetch('/api/admin/statistics'), fetch('/api/chat/rooms'),
      ])
      const usersData = await usersRes.json()
      const statsData = await statsRes.json()
      const roomsData = await roomsRes.json()
      setUsers(usersData?.users || usersData || [])
      setStatistics(statsData)
      setChatRooms(roomsData || [])
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally { setIsLoading(false) }
  }

  const fetchVisitorStats = async () => {
    try {
      const res = await fetch('/api/admin/visitor-stats')
      if (res.ok) setVisitorStats(await res.json())
    } catch (error) { console.error('Failed to fetch visitor stats:', error) }
  }

  const fetchRoomModeration = async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/moderation`)
      if (res.ok) setRoomModData(await res.json())
    } catch (error) { console.error('Failed to fetch room moderation:', error) }
  }

  const selectRoom = async (room: ChatRoom) => {
    setSelectedRoom(room)
    await fetchRoomModeration(room.id)
  }

  const performModAction = async (action: string, targetUserId: string, extra?: Record<string, unknown>) => {
    if (!selectedRoom) return
    try {
      const res = await fetch(`/api/chat/rooms/${selectedRoom.id}/moderation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId, ...extra })
      })
      if (res.ok) {
        await fetchRoomModeration(selectedRoom.id)
        alert('İşlem başarılı!')
      } else { const errorData = await res.json(); alert(errorData.error) }
    } catch (error) { console.error('Mod action error:', error) }
  }

  const grantRole = async () => {
    if (!roleUserId || !selectedRoom) return
    await performModAction('set_role', roleUserId, { role: roleType })
    setRoleUserId('')
  }

  const setRoomOwner = async () => {
    if (!ownerUserId || !selectedRoom) return
    await performModAction('set_owner', ownerUserId)
    setOwnerUserId('')
  }

  const removeRoomOwner = async () => {
    if (!selectedRoom) return
    await performModAction('remove_owner', '')
  }

  const addCredits = async (userId: string, amount: number) => {
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      })
      if (response?.ok) {
        await fetchData(); setSelectedUser(null)
        alert('CFC eklendi!')
      } else { alert('CFC eklenemedi!') }
    } catch (error) {
      console.error('Failed to add credits:', error)
      alert('Hata oluştu!')
    }
  }

  const fetchCommissionRooms = async () => {
    setCommissionLoading(true)
    try {
      const res = await fetch('/api/admin/rooms')
      if (res.ok) { const data = await res.json(); setCommissionRooms(data.rooms || []) }
    } catch (error) { console.error('Failed to fetch commission rooms:', error) }
    finally { setCommissionLoading(false) }
  }

  const saveRoomCommission = async (roomId: string) => {
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, giftCommissionPercent: editPercent, giftBeneficiaryId: editBeneficiary || null })
      })
      if (res.ok) {
        await fetchCommissionRooms()
        setEditingRoom(null)
        alert('Komisyon ayarları kaydedildi!')
      } else { alert('Kaydetme başarısız!') }
    } catch { alert('Hata oluştu') }
  }

  const searchBeneficiary = async (query: string) => {
    setBeneficiarySearch(query)
    if (query.length < 2) { setBeneficiaryResults([]); return }
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      setBeneficiaryResults(data?.users || data || [])
    } catch { setBeneficiaryResults([]) }
  }

  const fetchAdSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) setAdSettings(await res.json())
    } catch (error) { console.error('Failed to fetch ad settings:', error) }
  }

  const saveAdSetting = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
      if (res.ok) {
        setAdSettings(prev => ({ ...prev, [key]: value }))
        setAdSaveStatus(key)
        setTimeout(() => setAdSaveStatus(null), 2000)
      }
    } catch (error) { console.error('Failed to save ad setting:', error) }
  }

  const SidebarItem = ({ item, isActive, onClick }: { item: typeof SIDEBAR_ITEMS[0]; isActive: boolean; onClick: () => void }) => {
    const Icon = item.icon
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          isActive ? `${accentBg} font-semibold` : `${textSecondary} ${hoverRow} hover:opacity-80`
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{item.trLabel}</span>
      </button>
    )
  }

  const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
    <div className={`${statCardBg} rounded-xl p-5`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${isFacebook ? 'bg-gray-100' : isCosmic ? 'bg-white/5' : 'bg-white/5'} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className={`${textSecondary} text-sm`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold ${textPrimary}`}>{value}</p>
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`${statCardBg} rounded-xl p-5`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg ${isFacebook ? 'bg-green-50' : 'bg-green-500/10'} flex items-center justify-center`}>
              <Eye className="w-5 h-5 text-green-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ position: 'relative', top: -8, right: -2 }} />
            </div>
            <span className={`${textSecondary} text-sm`}>{'Aktif Ziyaretçi'}</span>
          </div>
          <LiveVisitorCount variant="admin" />
        </div>
        <StatCard icon={Users} label={t('admin.total_users')} value={statistics?.totalUsers ?? 0} color={accentColor} />
        <StatCard icon={Sparkles} label={t('admin.total_fortunes')} value={statistics?.totalFortunes ?? 0} color={goldColor} />
        <StatCard icon={DollarSign} label={'Dolaşımdaki CFC'} value={statistics?.economy?.cfcInCirculation ?? statistics?.economy?.creditsInCirculation ?? 0} color="text-green-500" />
        <StatCard icon={Coins} label={'Dolaşımdaki Jeton'} value={statistics?.economy?.jetonInCirculation ?? 0} color="text-amber-500" />
      </div>

      {/* Search Bar for Admin Sections */}
      <div className="relative mb-2">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
        <input
          type="text"
          placeholder="Ayar veya bölüm ara..."
          value={adminSearch}
          onChange={(e) => setAdminSearch(e.target.value)}
          className={`w-full pl-12 pr-4 py-3 rounded-xl ${cardBg} ${textPrimary} placeholder:${textMuted} border ${isFacebook ? 'border-gray-200 focus:border-blue-400' : isCosmic ? 'border-blue-900/30 focus:border-blue-400' : 'border-fuchsia-900/30 focus:border-fuchsia-400'} outline-none transition-colors`}
        />
        {adminSearch && (
          <button onClick={() => setAdminSearch('')} className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted} hover:${textPrimary}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Actions Grid - Grouped */}
      <div className="space-y-6">
        <h3 className={`${textPrimary} text-lg font-semibold`}>{'Hızlı Erişim'}</h3>
        {MANAGEMENT_GROUPS.map(group => {
          const searchLower = adminSearch.toLowerCase()
          const filteredLinks = searchLower
            ? group.links.filter(link =>
                link.trLabel.toLowerCase().includes(searchLower) ||
                link.enLabel.toLowerCase().includes(searchLower) ||
                link.href.toLowerCase().includes(searchLower)
              )
            : group.links
          if (filteredLinks.length === 0) return null
          return (
          <div key={group.groupLabel}>
            <h4 className={`${textSecondary} text-sm font-medium mb-3 flex items-center gap-2`}>
              <span>{group.groupLabel}</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredLinks.map(link => {
                const Icon = link.icon
                const isLastVisited = lastVisitedHref === link.href
                return (
                  <Link key={link.href} href={link.href}
                    onClick={() => { try { localStorage.setItem('admin_last_visited', link.href); setLastVisitedHref(link.href) } catch {} }}
                    className={`${cardBg} rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:scale-105 ${isLastVisited ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20' : ''}`}>
                    <div className={`w-12 h-12 rounded-full ${isLastVisited ? 'bg-amber-500/20' : isFacebook ? 'bg-blue-50' : isCosmic ? 'bg-blue-500/10' : 'bg-fuchsia-500/10'} flex items-center justify-center`}>
                      {link.emoji ? (
                        <span className="text-2xl">{link.emoji}</span>
                      ) : (
                        <Icon className={`w-6 h-6 ${isLastVisited ? 'text-amber-400' : accentColor}`} />
                      )}
                    </div>
                    <span className={`${isLastVisited ? 'text-amber-400 font-semibold' : textPrimary} text-xs font-medium leading-tight`}>
                      {link.trLabel}
                    </span>
                    {link.desc && (
                      <span className={`${textMuted} text-[10px] leading-tight`}>
                        {link.desc}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fortune Types */}
        <div className={`${cardBg} rounded-xl p-5`}>
          <h3 className={`${textPrimary} font-semibold mb-4 flex items-center gap-2`}>
            <Sparkles className={`w-5 h-5 ${accentColor}`} />
            {'Fal Türleri'}
          </h3>
          <div className="space-y-3">
            {[{icon: Coffee, name: 'Kahve Falı', key: 'coffee'},
              {icon: Star, name: 'Tarot', key: 'tarot'},
              {icon: Moon, name: 'Rüya Tabiri', key: 'dream'}].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${accentColor}`} />
                  <span className={textSecondary}>{item.name}</span>
                </div>
                <span className={`${textPrimary} font-semibold`}>{statistics?.fortunesByType?.[item.key] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Summary */}
        <div className={`${cardBg} rounded-xl p-5`}>
          <h3 className={`${textPrimary} font-semibold mb-4 flex items-center gap-2`}>
            <BarChart3 className={`w-5 h-5 ${accentColor}`} />
            {'Platform Özeti'}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={textSecondary}>{'Aktif Yayınlar'}</span>
              <span className="text-green-500 font-semibold">{statistics?.streams?.active ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>{'Toplam Paylaşım'}</span>
              <span className={`${textPrimary} font-semibold`}>{statistics?.social?.totalPosts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>{'Toplam Mesaj'}</span>
              <span className={`${textPrimary} font-semibold`}>{statistics?.messaging?.totalMessages ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={textSecondary}>{'Toplam Takip'}</span>
              <span className={`${textPrimary} font-semibold`}>{statistics?.community?.totalFollows ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      <div className={`${cardBg} rounded-xl p-5 overflow-x-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`${textPrimary} text-xl font-bold`}>{t('admin.users')}</h2>
          <div className="relative w-72">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
            <input
              type="text"
              value={adminUserSearch}
              onChange={(e) => setAdminUserSearch(e.target.value)}
              placeholder={'Ad, kullanıcı adı veya e-posta ara...'}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none`}
            />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${tableBorder}`}>
              <th className={`text-left py-3 px-4 ${textSecondary} font-medium text-sm`}>{t('form.name')}</th>
              <th className={`text-left py-3 px-4 ${textSecondary} font-medium text-sm`}>{t('form.email')}</th>
              <th className={`text-center py-3 px-4 ${textSecondary} font-medium text-sm`}>{t('nav.credits')}</th>
              <th className={`text-center py-3 px-4 ${textSecondary} font-medium text-sm`}>{'Fal'}</th>
              <th className={`text-center py-3 px-4 ${textSecondary} font-medium text-sm`}>{'Kayıt'}</th>
              <th className={`text-center py-3 px-4 ${textSecondary} font-medium text-sm`}>{'İşlem'}</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user?.id} className={`border-b ${tableBorder} ${hoverRow} transition-colors`}>
                <td className={`py-3 px-4 ${textPrimary}`}>{user?.name}</td>
                <td className={`py-3 px-4 ${textSecondary}`}>{user?.email}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center gap-1 ${goldColor} font-medium`}>
                    <Sparkles className="w-3 h-3" /> {user?.credits}
                  </span>
                </td>
                <td className={`py-3 px-4 text-center ${textPrimary}`}>{user?._count?.fortunes ?? 0}</td>
                <td className={`py-3 px-4 text-center ${textMuted} text-sm`}>{format(new Date(user?.createdAt), 'MMM dd')}</td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelectedUser(user)}
                      className={`p-2 rounded-lg ${btnSecondary} transition-colors`} title={'CFC Ekle'}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderChat = () => (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Chat Rooms List */}
      <div className={`${cardBg} rounded-xl p-5`}>
        <h2 className={`${textPrimary} text-lg font-bold mb-4`}>{'Sohbet Odaları'}</h2>
        <div className="space-y-2">
          {chatRooms.map((room) => (
            <div key={room.id} onClick={() => selectRoom(room)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${selectedRoom?.id === room.id ? accentBg : `${hoverRow}`}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{room.icon}</span>
                <div>
                  <h3 className={`${textPrimary} font-medium text-sm`}>{room.nameTr}</h3>
                  <p className={`${textMuted} text-xs`}>{room.onlineCount} {'çevrimiçi'} • {room.messageCount} {'mesaj'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Room Management */}
      <div className={`lg:col-span-2 ${cardBg} rounded-xl p-5`}>
        {selectedRoom && roomModData ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`${textPrimary} text-lg font-bold flex items-center gap-2`}>
                <span>{selectedRoom.icon}</span>
                {selectedRoom.nameTr}
                {roomModData.roomMuted && <VolumeX className="w-5 h-5 text-red-400" />}
              </h2>
              <button onClick={() => performModAction(roomModData.roomMuted ? 'unmute_room' : 'mute_room', '')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${roomModData.roomMuted ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {roomModData.roomMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {roomModData.roomMuted ? ('Sessizi Aç') : ('Sessize Al')}
              </button>
              <button onClick={async () => {
                if (!confirm('Bu odayı silmek istediğinize emin misiniz?')) return
                try {
                  const res = await fetch('/api/admin/chat-rooms', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: selectedRoom.id }) })
                  if (res.ok) { const rr = await fetch('/api/chat/rooms'); const rd = await rr.json(); setChatRooms(rd || []); setSelectedRoom(null); setRoomModData(null) }
                  else { const d = await res.json(); alert(d.error) }
                } catch { alert('Hata oluştu') }
              }} className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20">
                <Trash2 className="w-4 h-4" />
                {'Odayı Sil'}
              </button>
            </div>

            {/* Room Owner */}
            <div className={`mb-6 p-4 rounded-xl ${isFacebook ? 'bg-gray-50' : isCosmic ? 'bg-blue-900/20' : 'bg-purple-900/20'}`}>
              <h3 className={`${textPrimary} font-medium mb-3 text-sm flex items-center gap-2`}>
                <Crown className={`w-4 h-4 ${goldColor}`} />
                {'Oda Sahibi'}
              </h3>
              {roomModData?.owner ? (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`${textPrimary} font-medium`}>{roomModData.owner.name}</span>
                    {roomModData.owner.username && <span className={`${textMuted} text-sm`}>@{roomModData.owner.username}</span>}
                  </div>
                  <button onClick={removeRoomOwner}
                    className="px-3 py-1 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    {'Sahibi Kaldır'}
                  </button>
                </div>
              ) : (
                <p className={`${textMuted} text-sm mb-3`}>{'Bu odanın sahibi yok'}</p>
              )}
              <div className="flex gap-2 items-end flex-wrap">
                <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}
                  className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg border text-sm ${inputBg}`}>
                  <option value="">{'Yeni Sahip Seç'}</option>
                  {users.map((user) => (<option key={user.id} value={user.id}>{user.name}</option>))}
                </select>
                <button onClick={setRoomOwner} className={`px-4 py-2 rounded-lg text-sm font-medium ${btnPrimary}`}>
                  {'Sahip Ata'}
                </button>
              </div>
            </div>

            {/* Grant Role */}
            <div className={`mb-6 p-4 rounded-xl ${isFacebook ? 'bg-gray-50' : isCosmic ? 'bg-blue-900/20' : 'bg-purple-900/20'}`}>
              <h3 className={`${textPrimary} font-medium mb-3 text-sm`}>{'Yetki Ver'}</h3>
              <div className="flex gap-2 items-end flex-wrap">
                <select value={roleUserId} onChange={(e) => setRoleUserId(e.target.value)}
                  className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg border text-sm ${inputBg}`}>
                  <option value="">{'Kullanıcı Seç'}</option>
                  {users.map((user) => (<option key={user.id} value={user.id}>{user.name}</option>))}
                </select>
                <select value={roleType} onChange={(e) => setRoleType(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${inputBg}`}>
                  <option value="voice">+ Voice</option>
                  <option value="op">@ Op</option>
                  <option value="admin">& Admin</option>
                  <option value="founder">~ Founder</option>
                </select>
                <button onClick={grantRole} className={`px-4 py-2 rounded-lg text-sm font-medium ${btnPrimary}`}>
                  {'Ver'}
                </button>
              </div>
            </div>

            {/* Roles */}
            <div className="mb-4">
              <h3 className={`${textSecondary} font-medium mb-2 text-sm flex items-center gap-2`}>
                <Crown className={`w-4 h-4 ${goldColor}`} /> {'Yetkili Kullanıcılar'}
              </h3>
              {roomModData.roles.length > 0 ? (
                <div className="space-y-1">
                  {roomModData.roles.map((role) => (
                    <div key={role.id} className={`flex items-center justify-between p-2 rounded-lg ${hoverRow}`}>
                      <div className="flex items-center gap-2">
                        {role.role === 'founder' && <Crown className="w-4 h-4 text-red-400" />}
                        {role.role === 'admin' && <Shield className="w-4 h-4 text-orange-400" />}
                        {role.role === 'op' && <Star className="w-4 h-4 text-green-400" />}
                        {role.role === 'voice' && <Mic className="w-4 h-4 text-blue-400" />}
                        <span className={`${textPrimary} text-sm`}>{role.user.name}</span>
                        <span className={`${textMuted} text-xs`}>({role.role})</span>
                      </div>
                      <button onClick={() => performModAction('remove_role', role.userId)}
                        className="text-red-400 hover:text-red-300 text-xs">{'Kaldır'}</button>
                    </div>
                  ))}
                </div>
              ) : (<p className={`${textMuted} text-sm`}>{'Yetkili yok'}</p>)}
            </div>

            {/* Muted */}
            <div className="mb-4">
              <h3 className={`${textSecondary} font-medium mb-2 text-sm flex items-center gap-2`}>
                <VolumeX className="w-4 h-4 text-orange-400" /> {'Susturulanlar'}
              </h3>
              {roomModData.mutes.length > 0 ? (
                <div className="space-y-1">
                  {roomModData.mutes.map((mute) => (
                    <div key={mute.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5">
                      <span className={`${textPrimary} text-sm`}>{mute.user.name}</span>
                      <button onClick={() => performModAction('unmute_user', mute.userId)}
                        className="text-green-400 hover:text-green-300 text-xs">{'Kaldır'}</button>
                    </div>
                  ))}
                </div>
              ) : (<p className={`${textMuted} text-sm`}>{'Susturulan yok'}</p>)}
            </div>

            {/* Banned */}
            <div>
              <h3 className={`${textSecondary} font-medium mb-2 text-sm flex items-center gap-2`}>
                <Ban className="w-4 h-4 text-red-400" /> {'Engellenenler'}
              </h3>
              {roomModData.bans.length > 0 ? (
                <div className="space-y-1">
                  {roomModData.bans.map((ban) => (
                    <div key={ban.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5">
                      <span className={`${textPrimary} text-sm`}>{ban.user.name}</span>
                      <button onClick={() => performModAction('unban_user', ban.userId)}
                        className="text-green-400 hover:text-green-300 text-xs">{'Kaldır'}</button>
                    </div>
                  ))}
                </div>
              ) : (<p className={`${textMuted} text-sm`}>{'Engellenen yok'}</p>)}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className={`w-12 h-12 ${textMuted} mx-auto mb-4`} />
            <p className={textMuted}>{'Yönetmek için bir oda seçin'}</p>
          </div>
        )}
      </div>
    </div>
  )

  const AdSlot = ({ slotKey, title, desc }: { slotKey: string; title: string; desc: string }) => (
    <div className={`${cardBg} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`${textPrimary} font-medium text-sm`}>{title}</h3>
          <p className={`${textMuted} text-xs`}>{desc}</p>
        </div>
        {adSaveStatus === slotKey && (
          <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> {'Kaydedildi'}</span>
        )}
      </div>
      <textarea
        value={adSettings[slotKey] || ''}
        onChange={(e) => setAdSettings(prev => ({ ...prev, [slotKey]: e.target.value }))}
        placeholder={'Google AdSense kodunu buraya yapıştırın...'}
        className={`w-full h-24 px-3 py-2 rounded-lg border text-xs font-mono ${inputBg} focus:outline-none`}
      />
      <button onClick={() => saveAdSetting(slotKey, adSettings[slotKey] || '')}
        className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${btnPrimary}`}>
        <Save className="w-4 h-4" /> {'Kaydet'}
      </button>
    </div>
  )

  const renderAds = () => (
    <div className="space-y-4">
      <div className={`${isFacebook ? 'bg-blue-50 border border-blue-200' : isCosmic ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-fuchsia-900/20 border border-fuchsia-500/20'} rounded-xl p-4`}>
        <h3 className={`${accentColor} font-medium text-sm mb-1`}>{'Google Ads Entegrasyonu'}</h3>
        <p className={`${textSecondary} text-xs`}>
          {'Google AdSense kodlarınızı aşağıdaki alanlara yapıştırın.'}
        </p>
      </div>
      <div className="grid gap-4">
        <AdSlot slotKey="ads_script" title={'AdSense Script'} desc={'Ana script kodu (head bölümü)'} />
        <AdSlot slotKey="ads_header" title={'Üst Banner'} desc={'Sayfa üstünde'} />
        <AdSlot slotKey="ads_sidebar" title={'Kenar Çubuğu'} desc={'Sayfa kenarında'} />
        <AdSlot slotKey="ads_inline" title={'İçerik Arası'} desc={'İçerik arasında'} />
        <AdSlot slotKey="ads_footer" title={'Alt Banner'} desc={'Sayfa altında'} />
        <AdSlot slotKey="ads_rewarded" title={'Ödüllü Reklam'} desc={'5 CFC kazanma, günlük 10 limit'} />
      </div>
    </div>
  )

  const VisitorCard = ({ label, unique, total, color, icon: Icon }: { label: string; unique: number; total: number; color: string; icon: React.ElementType }) => (
    <div className={`${statCardBg} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-lg ${isFacebook ? 'bg-gray-100' : 'bg-white/5'} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className={`${textSecondary} text-sm font-medium`}>{label}</span>
      </div>
      <div className="space-y-1">
        <div><p className={`${textMuted} text-xs`}>{'Tekil'}</p><p className={`text-2xl font-bold ${color}`}>{unique}</p></div>
        <div><p className={`${textMuted} text-xs`}>{'Toplam'}</p><p className={`text-lg ${textSecondary}`}>{total}</p></div>
      </div>
    </div>
  )

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-blue-400" />
      case 'tablet': return <Tablet className="w-4 h-4 text-green-400" />
      case 'desktop': return <Monitor className="w-4 h-4 text-purple-400" />
      default: return <Monitor className="w-4 h-4 text-gray-400" />
    }
  }

  const renderVisitors = () => (
    <div className="space-y-6">
      {/* Visit counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <VisitorCard label={'Bugün'} unique={visitorStats?.today?.unique ?? 0} total={visitorStats?.today?.total ?? 0} color="text-blue-500" icon={Eye} />
        <VisitorCard label={'Bu Hafta'} unique={visitorStats?.week?.unique ?? 0} total={visitorStats?.week?.total ?? 0} color="text-green-500" icon={TrendingUp} />
        <VisitorCard label={'Bu Ay'} unique={visitorStats?.month?.unique ?? 0} total={visitorStats?.month?.total ?? 0} color="text-yellow-500" icon={Star} />
        <VisitorCard label={'Bu Yıl'} unique={visitorStats?.year?.unique ?? 0} total={visitorStats?.year?.total ?? 0} color={accentColor} icon={Sparkles} />
      </div>

      {/* Device & Bot breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Device Types */}
        <div className={`${cardBg} rounded-xl p-5`}>
          <h3 className={`${textPrimary} font-semibold mb-4 text-sm flex items-center gap-2`}>
            <Monitor className="w-4 h-4" /> {'Cihaz Dağılımı (Son 30 Gün)'}
          </h3>
          <div className="space-y-3">
            {visitorStats?.devices?.length ? visitorStats.devices.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getDeviceIcon(item.deviceType)}
                  <span className={`${textSecondary} text-sm capitalize`}>
                    {item.deviceType === 'mobile' ? ('Mobil') :
                     item.deviceType === 'tablet' ? 'Tablet' :
                     item.deviceType === 'desktop' ? ('Masaüstü') :
                     ('Bilinmiyor')}
                  </span>
                </div>
                <span className={`${textPrimary} font-semibold text-sm`}>{item.count}</span>
              </div>
            )) : (<p className={`${textMuted} text-sm`}>{'Veri yok'}</p>)}
          </div>
        </div>

        {/* Bot Traffic */}
        <div className={`${cardBg} rounded-xl p-5`}>
          <h3 className={`${textPrimary} font-semibold mb-4 text-sm flex items-center gap-2`}>
            <Bot className="w-4 h-4" /> {'Bot Trafiği (Son 30 Gün)'}
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visitorStats?.bots?.length ? visitorStats.bots.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className={`${textSecondary} text-sm`}>🤖 {item.botName}</span>
                <span className={`${textPrimary} font-semibold text-sm`}>{item.count}</span>
              </div>
            )) : (<p className={`${textMuted} text-sm`}>{'Bot tespit edilmedi'}</p>)}
          </div>
        </div>
      </div>

      {/* Geo stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`${cardBg} rounded-xl p-5`}>
          <h3 className={`${textPrimary} font-semibold mb-4 text-sm`}>🌍 {'Ülkelere Göre (Son 30 Gün)'}</h3>
          <div className="space-y-2">
            {visitorStats?.geo?.countries?.length ? visitorStats.geo.countries.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className={`${textSecondary} text-sm`}>{item.country}</span>
                <span className={`${textPrimary} font-semibold text-sm`}>{item.count}</span>
              </div>
            )) : (<p className={`${textMuted} text-sm`}>{'Veri yok'}</p>)}
          </div>
        </div>
        <div className={`${cardBg} rounded-xl p-5`}>
          <h3 className={`${textPrimary} font-semibold mb-4 text-sm`}>🏙️ {'Şehirlere Göre (Son 30 Gün)'}</h3>
          <div className="space-y-2">
            {visitorStats?.geo?.cities?.length ? visitorStats.geo.cities.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className={`${textSecondary} text-sm`}>{item.city}</span>
                <span className={`${textPrimary} font-semibold text-sm`}>{item.count}</span>
              </div>
            )) : (<p className={`${textMuted} text-sm`}>{'Veri yok'}</p>)}
          </div>
        </div>
      </div>

      {/* Active Visitors - Real-time */}
      <div className={`${cardBg} rounded-xl p-5`}>
        <h3 className={`${textPrimary} font-semibold mb-4 text-sm flex items-center gap-2`}>
          <Activity className="w-4 h-4 text-green-400 animate-pulse" /> {'Şu An Aktif Ziyaretçiler'}
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${isFacebook ? 'bg-blue-100 text-blue-800' : 'bg-green-500/20 text-green-400'}`}>
            {visitorStats?.activeVisitors?.length ?? 0}
          </span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${textMuted} text-xs border-b ${isFacebook ? 'border-gray-200' : 'border-white/10'}`}>
                <th className="text-left py-2 px-2">{'Tür'}</th>
                <th className="text-left py-2 px-2">{'İsim'}</th>
                <th className="text-left py-2 px-2">{'Cihaz'}</th>
                <th className="text-left py-2 px-2">{'Sayfa'}</th>
                <th className="text-left py-2 px-2">{'Son Görülme'}</th>
              </tr>
            </thead>
            <tbody>
              {visitorStats?.activeVisitors?.length ? visitorStats.activeVisitors.map((v, idx) => (
                <tr key={idx} className={`border-b ${isFacebook ? 'border-gray-100' : 'border-white/5'} hover:${isFacebook ? 'bg-gray-50' : 'bg-white/5'}`}>
                  <td className="py-2 px-2">
                    {v.isBot ? (
                      <span className="text-orange-400 text-xs font-medium">🤖 Bot</span>
                    ) : v.userId ? (
                      <span className="text-green-400 text-xs font-medium">👤 {'Üye'}</span>
                    ) : (
                      <span className={`${textMuted} text-xs`}>👻 {'Misafir'}</span>
                    )}
                  </td>
                  <td className={`py-2 px-2 ${textSecondary} text-sm font-medium`}>
                    {v.isBot ? v.botName : (v.userName || ('Anonim'))}
                  </td>
                  <td className="py-2 px-2">
                    <span className="flex items-center gap-1">
                      {getDeviceIcon(v.deviceType)}
                      <span className={`${textMuted} text-xs capitalize`}>{v.deviceType || '-'}</span>
                    </span>
                  </td>
                  <td className={`py-2 px-2 ${textMuted} text-xs max-w-[200px] truncate`}>{v.path || '/'}</td>
                  <td className={`py-2 px-2 ${textMuted} text-xs`}>
                    {(() => {
                      try {
                        const d = new Date(v.lastSeen)
                        return format(d, 'HH:mm:ss')
                      } catch { return '-' }
                    })()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className={`py-4 text-center ${textMuted} text-sm`}>
                    {'Aktif ziyaretçi yok'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={fetchVisitorStats} className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${btnPrimary}`}>
          <TrendingUp className="w-4 h-4" /> {'Yenile'}
        </button>
      </div>
    </div>
  )

  const MiniStatCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
    <div className={`${statCardBg} rounded-xl p-4 text-center`}>
      <p className={`${textMuted} text-xs mb-1`}>{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )

  const renderStatistics = () => (
    <div className="space-y-6">
      {/* Users */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><Users className={`w-5 h-5 ${accentColor}`} /> {'Kullanıcılar'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStatCard label={'Toplam'} value={statistics?.users?.total ?? statistics?.totalUsers ?? 0} color={textPrimary} />
          <MiniStatCard label={'Bugün'} value={statistics?.users?.newToday ?? 0} color="text-green-500" />
          <MiniStatCard label={'Haftalık'} value={statistics?.users?.newThisWeek ?? 0} color="text-blue-500" />
          <MiniStatCard label={'Aylık'} value={statistics?.users?.newThisMonth ?? 0} color={accentColor} />
          <MiniStatCard label="Premium" value={statistics?.users?.premium ?? 0} color="text-yellow-500" />
          <MiniStatCard label="VIP" value={statistics?.users?.vip ?? 0} color="text-pink-500" />
        </div>
      </div>

      {/* Fortunes */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><Sparkles className={`w-5 h-5 ${accentColor}`} /> {'Fallar'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MiniStatCard label={'Toplam Fal'} value={statistics?.fortunes?.total ?? statistics?.totalFortunes ?? 0} color={textPrimary} />
          <MiniStatCard label={'Görüntülenme'} value={statistics?.fortunes?.totalViews ?? 0} color="text-blue-500" />
        </div>
        <div className={`${cardBg} rounded-xl p-4`}>
          <p className={`${textMuted} text-xs mb-3`}>{'Türlere Göre'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(statistics?.fortunes?.byType ?? statistics?.fortunesByType ?? {}).map(([type, count]) => (
              <div key={type} className={`${statCardBg} rounded-lg p-2 text-center`}>
                <p className={`${textMuted} text-xs truncate`}>{type}</p>
                <p className={`text-lg font-bold ${textPrimary}`}>{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><MessageCircle className={`w-5 h-5 ${accentColor}`} /> {'Sosyal'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniStatCard label={'Paylaşım'} value={statistics?.social?.totalPosts ?? 0} color={textPrimary} />
          <MiniStatCard label={'Bugün'} value={statistics?.social?.postsToday ?? 0} color="text-green-500" />
          <MiniStatCard label={'Beğeni'} value={statistics?.social?.totalLikes ?? 0} color="text-red-500" />
          <MiniStatCard label={'Yorum'} value={statistics?.social?.totalComments ?? 0} color="text-blue-500" />
          <MiniStatCard label={'Paylaşım'} value={statistics?.social?.totalShares ?? 0} color={accentColor} />
        </div>
      </div>

      {/* Messaging & Community */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><MessageCircle className={`w-5 h-5 ${accentColor}`} /> {'Mesajlaşma'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <MiniStatCard label={'Mesaj'} value={statistics?.messaging?.totalMessages ?? 0} color={textPrimary} />
            <MiniStatCard label={'Haftalık'} value={statistics?.messaging?.messagesThisWeek ?? 0} color="text-blue-500" />
            <MiniStatCard label={'Sohbet'} value={statistics?.messaging?.totalConversations ?? 0} color="text-green-500" />
          </div>
        </div>
        <div>
          <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><Video className={`w-5 h-5 ${accentColor}`} /> {'Yayınlar'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStatCard label={'Toplam'} value={statistics?.streams?.total ?? 0} color={textPrimary} />
            <MiniStatCard label={'Aktif'} value={statistics?.streams?.active ?? 0} color="text-green-500" />
            <MiniStatCard label={'Hediye'} value={statistics?.streams?.totalGiftsValue ?? 0} color="text-yellow-500" />
            <MiniStatCard label={'Beğeni'} value={statistics?.streams?.totalLikes ?? 0} color="text-red-500" />
          </div>
        </div>
      </div>

      {/* Economy Summary */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><DollarSign className={`w-5 h-5 ${accentColor}`} /> {'Ekonomi Özeti'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStatCard label={'Dolaşımdaki CFC'} value={statistics?.economy?.cfcInCirculation ?? statistics?.economy?.creditsInCirculation ?? 0} color="text-green-500" />
          <MiniStatCard label={'Dolaşımdaki Jeton'} value={statistics?.economy?.jetonInCirculation ?? 0} color="text-amber-500" />
          <MiniStatCard label={'Hediye (Jeton)'} value={statistics?.economy?.chatGiftJetonTotal ?? 0} color="text-blue-500" />
          <MiniStatCard label={'Komisyon Toplam'} value={statistics?.economy?.chatGiftCommissionTotal ?? 0} color="text-pink-500" />
        </div>
      </div>

      {/* Community */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}><Users className={`w-5 h-5 ${accentColor}`} /> {'Topluluk'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <MiniStatCard label={'Takip'} value={statistics?.community?.totalFollows ?? 0} color="text-pink-500" />
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={fetchData} className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${btnPrimary}`}>
          <TrendingUp className="w-4 h-4" /> {'Yenile'}
        </button>
      </div>
    </div>
  )

  const renderEconomy = () => (
    <div className="space-y-6">
      {/* Dolaşımdaki Bakiyeler */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}>
          <Layers className={`w-5 h-5 ${accentColor}`} /> {'Dolaşımdaki Bakiyeler'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div className={`${cardBg} rounded-xl p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl ${isFacebook ? 'bg-green-50' : 'bg-green-500/10'} flex items-center justify-center`}>
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className={`${textMuted} text-xs`}>CFC</p>
                <p className={`text-3xl font-bold text-green-500`}>{statistics?.economy?.cfcInCirculation ?? 0}</p>
              </div>
            </div>
            <p className={`${textMuted} text-xs`}>{'Tüm kullanıcıların toplam CFC bakiyesi'}</p>
          </div>
          <div className={`${cardBg} rounded-xl p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl ${isFacebook ? 'bg-amber-50' : 'bg-amber-500/10'} flex items-center justify-center`}>
                <Coins className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className={`${textMuted} text-xs`}>Jeton</p>
                <p className={`text-3xl font-bold text-amber-500`}>{statistics?.economy?.jetonInCirculation ?? 0}</p>
              </div>
            </div>
            <p className={`${textMuted} text-xs`}>{'Tüm kullanıcıların toplam jeton bakiyesi'}</p>
          </div>
        </div>
      </div>

      {/* Gelir-Gider Tablosu */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}>
          <TrendingUp className={`w-5 h-5 ${accentColor}`} /> {'Jeton Gelir-Gider Tablosu'}
        </h3>
        <div className={`${cardBg} rounded-xl overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${tableBorder} ${isFacebook ? 'bg-gray-50' : isCosmic ? 'bg-blue-900/20' : 'bg-purple-900/20'}`}>
                <th className={`text-left py-3 px-5 ${textSecondary} font-medium text-sm`}>{'Kalem'}</th>
                <th className={`text-right py-3 px-5 ${textSecondary} font-medium text-sm`}>{'Tutar'}</th>
                <th className={`text-center py-3 px-5 ${textSecondary} font-medium text-sm`}>{'Tür'}</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`border-b ${tableBorder} ${hoverRow}`}>
                <td className={`py-3 px-5 ${textPrimary} flex items-center gap-2`}><Zap className="w-4 h-4 text-green-500" /> {'Yüklenen Jeton (Satın Alma)'}</td>
                <td className="py-3 px-5 text-right text-green-500 font-semibold">+{statistics?.economy?.jetonLoaded ?? 0}</td>
                <td className="py-3 px-5 text-center"><span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-500">{'Gelir'}</span></td>
              </tr>
              <tr className={`border-b ${tableBorder} ${hoverRow}`}>
                <td className={`py-3 px-5 ${textPrimary} flex items-center gap-2`}><Gift className="w-4 h-4 text-blue-500" /> {'Hediye Gönderilen (Jeton)'}</td>
                <td className="py-3 px-5 text-right text-red-400 font-semibold">-{statistics?.economy?.jetonGiftSent ?? 0}</td>
                <td className="py-3 px-5 text-center"><span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">{'Gider'}</span></td>
              </tr>
              <tr className={`border-b ${tableBorder} ${hoverRow}`}>
                <td className={`py-3 px-5 ${textPrimary} flex items-center gap-2`}><Gift className="w-4 h-4 text-green-500" /> {'Hediye Alınan (Jeton)'}</td>
                <td className="py-3 px-5 text-right text-green-500 font-semibold">+{statistics?.economy?.jetonGiftReceived ?? 0}</td>
                <td className="py-3 px-5 text-center"><span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-500">{'Gelir'}</span></td>
              </tr>
              <tr className={`border-b ${tableBorder} ${hoverRow}`}>
                <td className={`py-3 px-5 ${textPrimary} flex items-center gap-2`}><Crown className="w-4 h-4 text-pink-500" /> {'Komisyon Geliri'}</td>
                <td className="py-3 px-5 text-right text-pink-500 font-semibold">+{statistics?.economy?.jetonCommission ?? 0}</td>
                <td className="py-3 px-5 text-center"><span className="px-2 py-0.5 rounded text-xs bg-pink-500/10 text-pink-500">{'Komisyon'}</span></td>
              </tr>
              <tr className={`border-b ${tableBorder} ${hoverRow}`}>
                <td className={`py-3 px-5 ${textPrimary} flex items-center gap-2`}><Sparkles className="w-4 h-4 text-red-400" /> {'Harcanan Jeton (Bana Özel vb.)'}</td>
                <td className="py-3 px-5 text-right text-red-400 font-semibold">-{statistics?.economy?.jetonSpent ?? 0}</td>
                <td className="py-3 px-5 text-center"><span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">{'Gider'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hediye İstatistikleri */}
      <div>
        <h3 className={`${textPrimary} font-semibold mb-3 flex items-center gap-2`}>
          <Gift className={`w-5 h-5 ${accentColor}`} /> {'Sohbet Odası Hediye İstatistikleri'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className={`${statCardBg} rounded-xl p-5 text-center`}>
            <p className={`${textMuted} text-xs mb-1`}>{'Hediye (Jeton)'}</p>
            <p className="text-2xl font-bold text-amber-500">{statistics?.economy?.chatGiftJetonTotal ?? 0}</p>
          </div>
          <div className={`${statCardBg} rounded-xl p-5 text-center`}>
            <p className={`${textMuted} text-xs mb-1`}>{'Hediye (CFC)'}</p>
            <p className="text-2xl font-bold text-green-500">{statistics?.economy?.chatGiftCfcTotal ?? 0}</p>
          </div>
          <div className={`${statCardBg} rounded-xl p-5 text-center`}>
            <p className={`${textMuted} text-xs mb-1`}>{'Kesilen Komisyon'}</p>
            <p className="text-2xl font-bold text-pink-500">{statistics?.economy?.chatGiftCommissionTotal ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={fetchData} className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${btnPrimary}`}>
          <TrendingUp className="w-4 h-4" /> {'Yenile'}
        </button>
      </div>
    </div>
  )

  const renderGiftSettings = () => {
    if (commissionRooms.length === 0 && !commissionLoading) { fetchCommissionRooms() }
    return (
      <div className="space-y-6">
        <div className={`${isFacebook ? 'bg-blue-50 border border-blue-200' : isCosmic ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-fuchsia-900/20 border border-fuchsia-500/20'} rounded-xl p-4`}>
          <h3 className={`${accentColor} font-medium text-sm mb-1`}>{'Hediye Komisyon Sistemi'}</h3>
          <p className={`${textSecondary} text-xs mb-2`}>
            {'Her sohbet odasında hediye gönderildiğinde, belirlenen yüzde oda sahibine veya atadığı kişiye komisyon olarak gider. Jeton hediyeleri için geçerlidir.'}
          </p>
          <Link href={`/${language}/admin/settings`} className={`inline-flex items-center gap-1.5 text-xs font-medium ${accentColor} hover:underline`}>
            <Settings className="w-3.5 h-3.5" />
            Tüm komisyon oranları → Platform Ayarları
          </Link>
        </div>

        {commissionLoading ? (
          <div className="flex justify-center py-10">
            <div className={`w-8 h-8 border-2 ${isFacebook ? 'border-blue-500' : isCosmic ? 'border-blue-400' : 'border-fuchsia-500'} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : (
          <div className="space-y-4">
            {commissionRooms.map((room: any) => (
              <div key={room.id} className={`${cardBg} rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{room.icon}</span>
                    <div>
                      <h4 className={`${textPrimary} font-semibold`}>{room.nameTr}</h4>
                      <p className={`${textMuted} text-xs`}>
                        {'Sahip'}: {room.owner ? (room.owner.username || room.owner.name) : ('Yok')}
                        {' • '}{room._count?.chatGifts ?? 0} {'hediye'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${room.giftCommissionPercent > 0 ? 'bg-pink-500/10 text-pink-500' : `${isFacebook ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'}`}`}>
                      %{room.giftCommissionPercent}
                    </span>
                    <button onClick={() => {
                      setEditingRoom(editingRoom === room.id ? null : room.id)
                      setEditPercent(room.giftCommissionPercent)
                      setEditBeneficiary(room.giftBeneficiaryId || '')
                      setBeneficiarySearch('')
                      setBeneficiaryResults([])
                    }} className={`p-2 rounded-lg ${btnSecondary} transition-colors`}>
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Beneficiary info */}
                {room.giftBeneficiary && (
                  <div className={`mb-3 px-3 py-2 rounded-lg ${isFacebook ? 'bg-pink-50' : 'bg-pink-500/5'} flex items-center gap-2`}>
                    <Crown className="w-4 h-4 text-pink-500" />
                    <span className={`${textSecondary} text-xs`}>{'Komisyon alıcısı'}:</span>
                    <span className={`${textPrimary} text-sm font-medium`}>{room.giftBeneficiary.username || room.giftBeneficiary.name}</span>
                  </div>
                )}

                {/* Edit Panel */}
                {editingRoom === room.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`mt-4 p-4 rounded-xl ${isFacebook ? 'bg-gray-50' : isCosmic ? 'bg-blue-900/20' : 'bg-purple-900/20'} space-y-4`}>
                    <div>
                      <label className={`${textSecondary} text-sm mb-2 block`}>{'Komisyon Yüzdesi (%)'}</label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={0} max={50} value={editPercent} onChange={(e) => setEditPercent(parseInt(e.target.value))}
                          className="flex-1 accent-pink-500" />
                        <input type="number" min={0} max={100} value={editPercent} onChange={(e) => setEditPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className={`w-20 px-3 py-2 rounded-lg border text-sm text-center ${inputBg}`} />
                        <span className={`${textMuted} text-sm`}>%</span>
                      </div>
                    </div>

                    <div>
                      <label className={`${textSecondary} text-sm mb-2 block`}>{'Komisyon Alıcısı (boş = oda sahibi)'}</label>
                      <div className="relative">
                        <input type="text" value={beneficiarySearch} onChange={(e) => searchBeneficiary(e.target.value)}
                          placeholder={'Kullanıcı ara...'}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg} focus:outline-none`} />
                        {beneficiaryResults.length > 0 && (
                          <div className={`absolute top-full left-0 right-0 mt-1 ${modalBg} border rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto`}>
                            {beneficiaryResults.map((u: any) => (
                              <button key={u.id} onClick={() => { setEditBeneficiary(u.id); setBeneficiarySearch(u.username || u.name); setBeneficiaryResults([]) }}
                                className={`w-full text-left px-3 py-2 ${hoverRow} ${textPrimary} text-sm`}>
                                {u.name} {u.username && <span className={textMuted}>@{u.username}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {editBeneficiary && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`${textMuted} text-xs`}>{'Seçili'}: {beneficiarySearch || editBeneficiary}</span>
                          <button onClick={() => { setEditBeneficiary(''); setBeneficiarySearch('') }}
                            className="text-red-400 text-xs hover:text-red-300">✕</button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditingRoom(null)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${btnSecondary}`}>
                        {'İptal'}
                      </button>
                      <button onClick={() => saveRoomCommission(room.id)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${btnPrimary} flex items-center justify-center gap-2`}>
                        <Save className="w-4 h-4" /> {'Kaydet'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <button onClick={fetchCommissionRooms} className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${btnPrimary}`}>
            <TrendingUp className="w-4 h-4" /> {'Yenile'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} flex`}>
      {/* Mobile sidebar toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-20 left-3 z-40 lg:hidden p-2 rounded-lg ${btnSecondary}`}>
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 ${sidebarBg} border-r z-40 pt-20 pb-6 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-8 h-8 rounded-lg ${isFacebook ? 'bg-blue-500' : isCosmic ? 'bg-blue-600' : 'bg-fuchsia-600'} flex items-center justify-center`}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className={`${textPrimary} font-bold text-sm`}>{'Yönetim Paneli'}</h2>
              <p className={`${textMuted} text-[10px]`}>FalClub</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 space-y-1 flex-1 overflow-y-auto">
          <p className={`${textMuted} text-[10px] font-semibold uppercase tracking-wider px-4 mb-2`}>
            {'Genel'}
          </p>
          {SIDEBAR_ITEMS.map(item => (
            <SidebarItem key={item.id} item={item} isActive={activeTab === item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }} />
          ))}

          <div className={`my-4 h-px ${isFacebook ? 'bg-gray-200' : isCosmic ? 'bg-blue-800/30' : 'bg-purple-800/30'}`} />

          <p className={`${textMuted} text-[10px] font-semibold uppercase tracking-wider px-4 mb-2`}>
            {'Yönetim'}
          </p>
          {MANAGEMENT_LINKS(language).map(link => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${textSecondary} ${hoverRow} transition-colors`}
                onClick={() => setSidebarOpen(false)}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{link.trLabel}</span>
                <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
              </Link>
            )
          })}
        </div>

        {/* Back to site */}
        <div className="px-3 mt-4">
          <Link href={`/`}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${textSecondary} ${hoverRow} transition-colors`}>
            <Home className="w-4 h-4" />
            <span>{'Siteye Dön'}</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-20 px-4 lg:px-8 pb-32">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`${textPrimary} text-2xl font-bold`}>
            {activeTab === 'dashboard' ? ('Gösterge Paneli') :
             activeTab === 'users' ? ('Kullanıcılar') :
             activeTab === 'chat' ? ('Sohbet Yönetimi') :
             activeTab === 'ads' ? ('Reklam Yönetimi') :
             activeTab === 'visitors' ? ('Ziyaretçi İstatistikleri') :
             activeTab === 'economy' ? ('Ekonomi Yönetimi') :
             activeTab === 'gift-settings' ? ('Hediye Komisyon Ayarları') :
             ('Tüm İstatistikler')}
          </h1>
          <p className={`${textMuted} text-sm mt-1`}>
            {'Platform yönetimi ve kontrol merkezi'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className={`w-8 h-8 border-2 ${isFacebook ? 'border-blue-500' : isCosmic ? 'border-blue-400' : 'border-fuchsia-500'} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'chat' && renderChat()}
            {activeTab === 'ads' && renderAds()}
            {activeTab === 'visitors' && renderVisitors()}
            {activeTab === 'statistics' && renderStatistics()}
            {activeTab === 'economy' && renderEconomy()}
            {activeTab === 'gift-settings' && renderGiftSettings()}
          </motion.div>
        )}
      </main>

      {/* Add Credits Modal */}
      <Dialog.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${modalBg} border rounded-2xl p-6 max-w-md w-full z-50 shadow-2xl`}>
            <Dialog.Title className={`${textPrimary} text-xl font-bold mb-6 flex items-center justify-between`}>
              {t('admin.add_credits')}
              <Dialog.Close asChild>
                <button className={`p-1 rounded-lg ${btnSecondary}`}><X className="w-5 h-5" /></button>
              </Dialog.Close>
            </Dialog.Title>

            <div className="space-y-4 mb-6">
              <div>
                <p className={`${textMuted} text-sm mb-1`}>{t('form.name')}</p>
                <p className={`${textPrimary} font-medium`}>{selectedUser?.name}</p>
              </div>
              <div>
                <p className={`${textMuted} text-sm mb-1`}>{'Mevcut CFC'}</p>
                <p className={`${goldColor} font-bold text-xl`}>{selectedUser?.credits}</p>
              </div>
              <div>
                <label className={`${textMuted} text-sm mb-2 block`}>{'Eklenecek CFC'}</label>
                <input type="number" value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e?.target?.value ?? '0'))}
                  min="1" className={`w-full px-4 py-3 rounded-xl border ${inputBg} focus:outline-none`} />
              </div>
            </div>

            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className={`flex-1 py-3 rounded-xl font-medium ${btnSecondary}`}>{t('form.cancel')}</button>
              </Dialog.Close>
              <button onClick={() => addCredits(selectedUser?.id ?? '', creditAmount)}
                className={`flex-1 py-3 rounded-xl font-semibold ${btnPrimary}`}>
                {'Ekle'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
