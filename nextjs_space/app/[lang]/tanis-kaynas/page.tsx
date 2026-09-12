'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart, Star, UserPlus, MessageCircle, MapPin, Clock, Users, Search,
  Filter, ChevronRight, Shield, Crown, Sparkles, X, AlertTriangle,
  ThumbsUp, Bookmark, UserCheck, Ban, Flag, Globe, Eye,
  Flame, Zap, Radio, ArrowLeft, Loader2,
} from 'lucide-react'
import FramedAvatar from '@/components/framed-avatar'
import { useUserAdminModal } from '@/components/admin/user-admin-modal-provider'

interface DiscoveryUser {
  id: string
  name: string
  username: string
  image: string | null
  bio: string | null
  membership: string
  vipXp: number
  age: number | null
  city: string | null
  isVerified: boolean
  lastActive: string | null
  followers: number
  following: number
  hobbies: string[]
  commonHobbies: string[]
  matchPercent: number
  distance: { band: string; text: string } | null
  socialLinks: Record<string, string> | null
  createdAt: string
}

interface ProfileData {
  id: string
  name: string
  username: string
  image: string | null
  bio: string | null
  age: number | null
  city: string | null
  membership: string
  vipXp: number
  vipTitle: string | null
  isVerified: boolean
  isBroadcaster: boolean
  lastActive: string | null
  joinedAt: string
  followers: number
  following: number
  hobbies: string[]
  commonHobbies: string[]
  matchPercent: number
  distance: { band: string; text: string } | null
  socialLinks: Record<string, string> | null
  badges: { id: string; name: string; icon: string; description?: string; color?: string; bgColor?: string }[]
  profileVisits: number
  commonFollowers: number
  isLiked: boolean
  isFavorited: boolean
  friendStatus: { status: string; direction: string } | null
  isFollowing: boolean
  isBlocked: boolean
}

const FILTERS = [
  { key: '', label: 'Önerilen', icon: Sparkles },
  { key: 'nearby', label: 'Yakında', icon: MapPin },
  { key: 'online', label: 'Çevrimiçi', icon: Radio },
  { key: 'new', label: 'Yeni', icon: Zap },
  { key: 'popular', label: 'Popüler', icon: Flame },
]

const MEMBERSHIP_COLORS: Record<string, string> = {
  svip: 'from-red-500 to-orange-500',
  diamond: 'from-cyan-400 to-blue-500',
  premium: 'from-purple-500 to-fuchsia-500',
  gold: 'from-yellow-400 to-amber-500',
  silver: 'from-gray-300 to-gray-400',
  basic: 'from-gray-600 to-gray-700',
}

const MEMBERSHIP_BADGES: Record<string, string> = {
  svip: '👑 SVIP',
  diamond: '💎 Diamond',
  premium: '⭐ Premium',
  gold: '🧱 Gold',
  silver: '🥈 Silver',
}

const HOBBY_LABELS: Record<string, string> = {
  muzik: '🎵 Müzik', oyun: '🎮 Oyun', spor: '⚽ Spor', film: '🎬 Film',
  dizi: '📺 Dizi', seyahat: '✈️ Seyahat', yemek: '🍽️ Yemek', teknoloji: '💻 Teknoloji',
  kitap: '📚 Kitap', sanat: '🎨 Sanat', fotograf: '📷 Fotoğraf', dans: '💃 Dans',
  yoga: '🧘 Yoga', fitness: '🏋️ Fitness', dogal_yasam: '🌿 Doğa', astroloji: '🔮 Astroloji',
  tasarim: '✏️ Tasarım', moda: '👗 Moda', otomobil: '🚗 Otomobil', tarih: '🏛️ Tarih',
  felsefe: '🧠 Felsefe', edebiyat: '✍️ Edebiyat', bilim: '🔬 Bilim',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min}dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa`
  const day = Math.floor(hr / 24)
  return `${day}g`
}

export default function TanisKaynasPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { openUserAdmin } = useUserAdminModal()
  const isAdmin = ['admin', 'yonetici', 'kurucu'].includes((session?.user as any)?.role || '')

  const [users, setUsers] = useState<DiscoveryUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filter) params.set('filter', filter)
      const res = await fetch(`/api/social/discovery?${params}`)
      const json = await res.json()
      if (json.success) {
        setUsers(json.data.users)
        setTotal(json.data.total)
      }
    } catch { /* */ }
    setLoading(false)
  }, [page, filter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openProfile = async (userId: string) => {
    setProfileLoading(true)
    try {
      const res = await fetch(`/api/social/profile?userId=${userId}`)
      const json = await res.json()
      if (json.success) setSelectedUser(json.data)
    } catch { /* */ }
    setProfileLoading(false)
  }

  const performAction = async (type: string, targetId: string, message?: string) => {
    setActionLoading(type)
    try {
      const body: any = { type, targetId }
      if (message) body.message = message
      const res = await fetch('/api/social/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (json.success && selectedUser) {
        // Refresh profile
        const res2 = await fetch(`/api/social/profile?userId=${targetId}`)
        const json2 = await res2.json()
        if (json2.success) setSelectedUser(json2.data)
      }
    } catch { /* */ }
    setActionLoading(null)
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8">
          <Users className="w-16 h-16 text-fuchsia-400/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Giriş Yapın</h2>
          <p className="text-gray-400 mb-4">Tanış & Kaynaş'ı kullanmak için giriş yapmalısınız.</p>
          <Link href="/giris" className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl font-semibold">Giriş Yap</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-fuchsia-400" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                Tanış & Kaynaş
              </h1>
            </div>
            <Link href="/ayarlar" className="text-xs text-gray-400 hover:text-fuchsia-400 transition-colors">
              Gizlilik Ayarları
            </Link>
          </div>
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map(f => {
              const Icon = f.icon
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key); setPage(1) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
                      : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* User Grid */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Bu filtrede kullanıcı bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {users.map(u => (
                <motion.button
                  key={u.id}
                  onClick={() => openProfile(u.id)}
                  className="bg-gray-900/80 border border-gray-800/60 rounded-2xl p-3 text-left hover:border-fuchsia-500/30 transition-all group"
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Avatar + membership badge */}
                  <div className="relative mb-2">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-800">
                      {u.image ? (
                        <Image src={u.image} alt={u.name} fill className="object-cover" sizes="200px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">
                          <Users className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    {/* Online indicator */}
                    {u.lastActive && (Date.now() - new Date(u.lastActive).getTime()) < 5 * 60 * 1000 && (
                      <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg shadow-green-400/50" />
                    )}
                    {/* Membership badge */}
                    {u.membership !== 'basic' && MEMBERSHIP_BADGES[u.membership] && (
                      <div className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-gradient-to-r ${MEMBERSHIP_COLORS[u.membership] || 'from-gray-600 to-gray-700'}`}>
                        {MEMBERSHIP_BADGES[u.membership]}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <h3 className="font-semibold text-sm text-white leading-tight flex items-center gap-1">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{u.name}</span>
                    {u.isVerified && <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
                    {u.age && <span>{u.age} yaş</span>}
                    {u.age && u.city && <span>·</span>}
                    {u.city && <span className="overflow-hidden text-ellipsis whitespace-nowrap">{u.city}</span>}
                  </div>
                  {/* Match & Distance */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {u.matchPercent > 0 && (
                      <span className="px-1.5 py-0.5 bg-fuchsia-500/20 text-fuchsia-300 rounded text-[10px] font-medium">
                        %{u.matchPercent} ortak
                      </span>
                    )}
                    {u.distance && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-medium">
                        <MapPin className="w-2.5 h-2.5 inline mr-0.5" />{u.distance.text}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-40"
                >
                  Önceki
                </button>
                <span className="px-4 py-2 text-sm text-gray-400">{page} / {Math.ceil(total / 20)}</span>
                <button
                  disabled={page >= Math.ceil(total / 20)}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 disabled:opacity-40"
                >
                  Sonraki
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {(selectedUser || profileLoading) && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !profileLoading && setSelectedUser(null)} />
            <motion.div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            >
              {profileLoading && !selectedUser ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
                </div>
              ) : selectedUser ? (
                <ProfileCard
                  profile={selectedUser}
                  isAdmin={isAdmin}
                  onAction={performAction}
                  actionLoading={actionLoading}
                  onClose={() => setSelectedUser(null)}
                  onMessage={() => router.push(`/mesajlar?userId=${selectedUser.id}`)}
                  onAdminOpen={() => { setSelectedUser(null); openUserAdmin(selectedUser.id) }}
                />
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProfileCard({ profile, isAdmin, onAction, actionLoading, onClose, onMessage, onAdminOpen }: {
  profile: ProfileData
  isAdmin: boolean
  onAction: (type: string, targetId: string, message?: string) => void
  actionLoading: string | null
  onClose: () => void
  onMessage: () => void
  onAdminOpen: () => void
}) {
  const p = profile

  return (
    <div className="p-5">
      {/* Close + admin */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
          <X className="w-5 h-5" />
        </button>
        {isAdmin && (
          <button onClick={onAdminOpen} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30">
            <Shield className="w-3.5 h-3.5" /> 360°
          </button>
        )}
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center text-center mb-5">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-fuchsia-500/40 mb-3">
          {p.image ? (
            <Image src={p.image} alt={p.name} fill className="object-cover" sizes="96px" />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Users className="w-10 h-10 text-gray-600" />
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
          {p.name}
          {p.isVerified && <Shield className="w-4 h-4 text-blue-400" />}
          {p.isBroadcaster && <Radio className="w-4 h-4 text-pink-400" />}
        </h2>
        <p className="text-sm text-gray-400">@{p.username}</p>
        {p.membership !== 'basic' && MEMBERSHIP_BADGES[p.membership] && (
          <span className={`mt-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${MEMBERSHIP_COLORS[p.membership]}`}>
            {MEMBERSHIP_BADGES[p.membership]}
          </span>
        )}
        {p.vipTitle && (
          <span className="mt-1 text-xs text-amber-400 font-medium">{p.vipTitle}</span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Takipçi', val: p.followers },
          { label: 'Takip', val: p.following },
          { label: 'Ziyaret', val: p.profileVisits },
          { label: 'Ortak', val: p.commonFollowers },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/50 rounded-xl p-2 text-center">
            <div className="text-sm font-bold text-white">{s.val}</div>
            <div className="text-[10px] text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {p.age && (
          <span className="px-2 py-1 bg-gray-800/60 rounded-lg text-xs text-gray-300">{p.age} yaş</span>
        )}
        {p.city && (
          <span className="px-2 py-1 bg-gray-800/60 rounded-lg text-xs text-gray-300 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {p.city}
          </span>
        )}
        {p.distance && (
          <span className="px-2 py-1 bg-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {p.distance.text}
          </span>
        )}
        {p.lastActive && (
          <span className="px-2 py-1 bg-gray-800/60 rounded-lg text-xs text-gray-300 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(p.lastActive)}
          </span>
        )}
      </div>

      {/* Match percent */}
      {p.matchPercent > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-sm font-semibold text-fuchsia-300">%{p.matchPercent} Ortak İlgi</span>
          </div>
          {p.commonHobbies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.commonHobbies.map(h => (
                <span key={h} className="px-1.5 py-0.5 bg-fuchsia-500/20 rounded text-[10px] text-fuchsia-200">
                  {HOBBY_LABELS[h] || h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bio */}
      {p.bio && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Hakkında</h4>
          <p className="text-sm text-gray-300 leading-relaxed">{p.bio}</p>
        </div>
      )}

      {/* Hobbies */}
      {p.hobbies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1.5">İlgi Alanları</h4>
          <div className="flex flex-wrap gap-1.5">
            {p.hobbies.map(h => (
              <span key={h} className="px-2 py-1 bg-gray-800/60 rounded-lg text-xs text-gray-300">
                {HOBBY_LABELS[h] || h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      {p.badges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Rozetler</h4>
          <div className="flex flex-wrap gap-1.5">
            {p.badges.map(b => (
              <span key={b.id} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: b.bgColor || '#78350f', color: b.color || '#fbbf24' }}>
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      {p.socialLinks && Object.keys(p.socialLinks).length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Sosyal Medya</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(p.socialLinks).filter(([, v]) => v).map(([platform, link]) => (
              <a
                key={platform}
                href={String(link).startsWith('http') ? String(link) : `https://${link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg text-xs text-gray-300 capitalize transition-colors"
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-5">
        <button
          onClick={() => onAction('like', p.id)}
          disabled={actionLoading === 'like'}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            p.isLiked
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-gray-800/60 text-gray-300 hover:bg-pink-500/10 hover:text-pink-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${p.isLiked ? 'fill-current' : ''}`} />
          {p.isLiked ? 'Beğendin' : 'Beğen'}
        </button>
        <button
          onClick={() => onAction('favorite', p.id)}
          disabled={actionLoading === 'favorite'}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            p.isFavorited
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-gray-800/60 text-gray-300 hover:bg-amber-500/10 hover:text-amber-400'
          }`}
        >
          <Star className={`w-4 h-4 ${p.isFavorited ? 'fill-current' : ''}`} />
          {p.isFavorited ? 'Favoride' : 'Favorile'}
        </button>
        <button
          onClick={onMessage}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:shadow-lg hover:shadow-fuchsia-500/25 transition-all"
        >
          <MessageCircle className="w-4 h-4" /> Mesaj
        </button>
        {!p.friendStatus || p.friendStatus.status === 'rejected' ? (
          <button
            onClick={() => onAction('friend_request', p.id)}
            disabled={actionLoading === 'friend_request'}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-gray-800/60 text-gray-300 hover:bg-green-500/10 hover:text-green-400 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Arkadaş Ekle
          </button>
        ) : p.friendStatus.status === 'accepted' ? (
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <UserCheck className="w-4 h-4" /> Arkadaş
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-4 h-4" /> {p.friendStatus?.direction === 'sent' ? 'Gönderildi' : 'Bekliyor'}
          </div>
        )}
      </div>

      {/* Secondary actions */}
      <div className="flex justify-center gap-4 mt-4 pb-2">
        <button
          onClick={() => onAction('block', p.id)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          <Ban className="w-3.5 h-3.5" /> {p.isBlocked ? 'Engeli Kaldır' : 'Engelle'}
        </button>
        <button
          onClick={() => {
            const reason = prompt('Şikayet nedeninizi yazın:')
            if (reason) onAction('report', p.id, reason)
          }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-400 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" /> Şikayet Et
        </button>
      </div>
    </div>
  )
}
