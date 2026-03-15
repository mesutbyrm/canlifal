'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Users, Search, Filter, ChevronLeft, ChevronRight, X, Save, Loader2,
  User, Mail, Phone, AtSign, Crown, Shield, Coins, Calendar, Camera,
  Key, Ban, Video, Radio, Eye, EyeOff, Trash2, Edit, MoreVertical,
  Check, AlertCircle, Gift, MessageCircle, Star, Lock, Unlock, Clock,
  UserX, UserCheck, RefreshCw, Upload, Award, Sparkles, Wallet
} from 'lucide-react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface UserListItem {
  id: string
  email: string
  name: string
  username: string | null
  image: string | null
  credits: number
  jetonBalance: number
  role: string
  membership: string
  createdAt: string
  _count: { fortunes: number }
}

interface UserDetail {
  id: string
  email: string
  name: string
  username: string | null
  phone: string | null
  image: string | null
  preferredLanguage: string
  credits: number
  jetonBalance: number
  role: string
  membership: string
  membershipExpiresAt: string | null
  createdAt: string
  birthDate: string | null
  birthTime: string | null
  zodiacSign: string | null
  risingSign: string | null
  referralCode: string | null
  referralCreditsEarned: number
  isStreamBanned: boolean
  streamBanReason: string | null
  specialBadges: string | null
  profileEffect: string | null
  _count: {
    fortunes: number
    liveSessions: number
    videoStreams: number
    chatMessages: number
    socialPosts: number
  }
  fortuneTellerProfile: {
    id: string
    displayName: string
    isOnline: boolean
    approvedAt: string | null
  } | null
  videoStreams: { id: string; title: string; viewerCount: number }[]
}

type BadgeType = 'basic' | 'premium' | 'gold' | 'diamond'
type EffectType = 'sparkles' | 'pulse' | 'rainbow' | 'fire' | 'glow' | 'none'

const BADGE_CONFIG: Record<BadgeType, { label: string; color: string; bgColor: string }> = {
  basic: { label: 'Basic', color: '#9ca3af', bgColor: 'bg-gray-500/20' },
  premium: { label: 'Premium', color: '#a855f7', bgColor: 'bg-purple-500/20' },
  gold: { label: 'Gold', color: '#fbbf24', bgColor: 'bg-yellow-500/20' },
  diamond: { label: 'Diamond', color: '#38bdf8', bgColor: 'bg-cyan-500/20' }
}

const EFFECT_CONFIG: Record<EffectType, { label: string; labelTr: string }> = {
  none: { label: 'None', labelTr: 'Yok' },
  sparkles: { label: 'Sparkles', labelTr: 'Parıltı' },
  pulse: { label: 'Pulse', labelTr: 'Nabız' },
  rainbow: { label: 'Rainbow', labelTr: 'Gökkuşağı' },
  fire: { label: 'Fire', labelTr: 'Ateş' },
  glow: { label: 'Glow', labelTr: 'Işıltı' }
}

export default function AdminUsersPage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const router = useRouter()
  
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [membershipFilter, setMembershipFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Selected user modal
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  
  // Edit states
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<UserDetail>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Password reset
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Stream ban
  const [showStreamBanModal, setShowStreamBanModal] = useState(false)
  const [streamBanReason, setStreamBanReason] = useState('')
  
  // Currency management
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditAmount, setCreditAmount] = useState(100)
  const [creditAction, setCreditAction] = useState<'add' | 'remove' | 'set'>('add')
  const [creditCurrency, setCreditCurrency] = useState<'cfc' | 'jeton'>('cfc')
  
  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Badge management
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [selectedBadges, setSelectedBadges] = useState<BadgeType[]>([])
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('none')

  useEffect(() => {
    if ((session?.user as any)?.role !== 'admin') {
      router.push(`/${language}`)
      return
    }
    fetchUsers()
  }, [session, page, searchQuery, roleFilter, membershipFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(membershipFilter !== 'all' && { membership: membershipFilter }),
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || data)
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetail = async (userId: string) => {
    setLoadingUser(true)
    setShowUserModal(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedUser(data)
        setEditData(data)
      }
    } catch (error) {
      console.error('Error fetching user detail:', error)
    } finally {
      setLoadingUser(false)
    }
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: language === 'tr' ? 'Kullanıcı güncellendi' : 'User updated' })
        setSelectedUser({ ...selectedUser, ...editData } as UserDetail)
        setEditMode(false)
        fetchUsers()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving user' })
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', newPassword })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: language === 'tr' ? 'Şifre sıfırlandı' : 'Password reset' })
        setShowPasswordModal(false)
        setNewPassword('')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  const handleStreamBan = async (ban: boolean) => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: ban ? 'ban_stream' : 'unban_stream',
          streamBanReason: streamBanReason
        })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: ban ? 'Yayın yasağı uygulandı' : 'Yayın yasağı kaldırıldı' })
        setSelectedUser({ ...selectedUser, isStreamBanned: ban, streamBanReason: ban ? streamBanReason : null })
        setShowStreamBanModal(false)
        setStreamBanReason('')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  const handleCredits = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      let action = ''
      if (creditCurrency === 'cfc') {
        action = creditAction === 'set' ? 'set_credits' : creditAction === 'add' ? 'add_credits' : 'remove_credits'
      } else {
        action = creditAction === 'set' ? 'set_jetons' : creditAction === 'add' ? 'add_jetons' : 'remove_jetons'
      }
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          credits: creditAmount,
          amount: creditAmount
        })
      })
      const data = await res.json()
      if (res.ok) {
        const currLabel = creditCurrency === 'cfc' ? 'CFC' : 'Jeton'
        const actLabel = creditAction === 'add' ? 'eklendi' : creditAction === 'remove' ? 'çıkarıldı' : 'ayarlandı'
        setMessage({ type: 'success', text: `${currLabel} ${actLabel}` })
        setSelectedUser({ ...selectedUser, credits: data.newCredits, jetonBalance: data.newJetons })
        setShowCreditModal(false)
        fetchUsers()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedUser) return
    
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Dosya 5MB\'dan küçük olmalı' })
      return
    }

    setUploadingImage(true)
    try {
      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file.name, 
          contentType: file.type,
          isPublic: true 
        })
      })
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()

      // Upload to S3
      const uploadHeaders: HeadersInit = { 'Content-Type': file.type }
      if (uploadUrl.includes('content-disposition')) {
        uploadHeaders['Content-Disposition'] = 'attachment'
      }
      await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file })

      // Get public URL
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })
      const { url } = await urlRes.json()

      // Update user image
      await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url })
      })

      setSelectedUser({ ...selectedUser, image: url })
      setEditData({ ...editData, image: url })
      setMessage({ type: 'success', text: 'Resim güncellendi' })
      fetchUsers()
    } catch (error) {
      setMessage({ type: 'error', text: 'Resim yüklenemedi' })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    if (!confirm(language === 'tr' ? 'Bu kullanıcıyı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this user?')) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowUserModal(false)
        setSelectedUser(null)
        fetchUsers()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting user' })
    } finally {
      setSaving(false)
    }
  }

  const handleStartStream = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_stream' })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Yayın başlatıldı' })
        fetchUserDetail(selectedUser.id)
      } else {
        setMessage({ type: 'error', text: data.error || 'Error' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEndStream = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_stream' })
      })
      setMessage({ type: 'success', text: 'Yayın sonlandırıldı' })
      fetchUserDetail(selectedUser.id)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  // Badge management functions
  const parseBadges = (badgesString: string | null): BadgeType[] => {
    if (!badgesString) return []
    try {
      const parsed = JSON.parse(badgesString)
      return Array.isArray(parsed) ? parsed.filter((b: string) => 
        ['basic', 'premium', 'gold', 'diamond'].includes(b)
      ) as BadgeType[] : []
    } catch {
      return []
    }
  }

  const openBadgeModal = () => {
    if (selectedUser) {
      setSelectedBadges(parseBadges(selectedUser.specialBadges))
      setSelectedEffect((selectedUser.profileEffect as EffectType) || 'none')
      setShowBadgeModal(true)
    }
  }

  const toggleBadge = (badge: BadgeType) => {
    setSelectedBadges(prev => 
      prev.includes(badge) 
        ? prev.filter(b => b !== badge)
        : [...prev, badge]
    )
  }

  const handleSaveBadges = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          specialBadges: JSON.stringify(selectedBadges),
          profileEffect: selectedEffect === 'none' ? null : selectedEffect
        })
      })
      if (res.ok) {
        setMessage({ type: 'success', text: language === 'tr' ? 'Rozet ve efektler güncellendi' : 'Badges and effects updated' })
        setSelectedUser({ 
          ...selectedUser, 
          specialBadges: JSON.stringify(selectedBadges),
          profileEffect: selectedEffect === 'none' ? null : selectedEffect
        })
        setShowBadgeModal(false)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0118] py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/${language}/admin`} className="text-purple-400 hover:text-purple-300">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-7 h-7 text-gold-400" />
                {language === 'tr' ? 'Kullanıcı Yönetimi' : 'User Management'}
              </h1>
              <p className="text-purple-300 text-sm">{users.length} kullanıcı</p>
            </div>
          </div>
          <button onClick={() => fetchUsers()} className="p-2 text-purple-300 hover:text-white">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#1a0b2e] rounded-xl p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                placeholder={language === 'tr' ? 'İsim, email, kullanıcı adı...' : 'Name, email, username...'}
                className="w-full bg-white/5 border border-purple-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-purple-400/50 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none"
          >
            <option value="all">{language === 'tr' ? 'Tüm Roller' : 'All Roles'}</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={membershipFilter}
            onChange={(e) => { setMembershipFilter(e.target.value); setPage(1) }}
            className="bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none"
          >
            <option value="all">{language === 'tr' ? 'Tüm Üyelikler' : 'All Memberships'}</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="gold">Gold</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-[#1a0b2e] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">Kullanıcı</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">CFC</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">Jeton</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">Rol</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">Üyelik</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium">Kayıt</th>
                    <th className="text-left px-4 py-3 text-purple-300 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr 
                      key={user.id} 
                      className="border-b border-purple-500/10 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => fetchUserDetail(user.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            {user.image ? (
                              <Image src={user.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold">{user.name?.[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            {user.username && <p className="text-purple-400 text-xs">@{user.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-purple-200">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-emerald-400 font-medium">{user.credits}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-yellow-400 font-medium">{user.jetonBalance}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role === 'admin' ? '👑 Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.membership === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                          user.membership === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.membership}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-purple-300 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-2 hover:bg-white/10 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-purple-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-purple-500/20">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-purple-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-purple-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* User Detail Modal */}
        <Dialog.Root open={showUserModal} onOpenChange={setShowUserModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a0b2e] rounded-2xl z-50 p-6">
              {loadingUser ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : selectedUser && (
                <>
                  <Dialog.Title className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Kullanıcı Detayları</h2>
                    <div className="flex items-center gap-2">
                      {!editMode && (
                        <button 
                          onClick={() => setEditMode(true)}
                          className="p-2 text-purple-400 hover:text-white hover:bg-white/10 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      <Dialog.Close className="p-2 text-purple-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </div>
                  </Dialog.Title>

                  {/* Message */}
                  {message && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                      message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {message.text}
                    </div>
                  )}

                  {/* Profile Header */}
                  <div className="flex items-start gap-6 mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {selectedUser.image ? (
                          <Image src={selectedUser.image} alt="" width={96} height={96} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-3xl font-bold">{selectedUser.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      {editMode && (
                        <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-500">
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4 text-white" />
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
                        {selectedUser.role === 'admin' && <Crown className="w-5 h-5 text-yellow-400" />}
                        {selectedUser.isStreamBanned && <Ban className="w-5 h-5 text-red-500" />}
                      </div>
                      {selectedUser.username && <p className="text-purple-400">@{selectedUser.username}</p>}
                      <p className="text-purple-300 text-sm">{selectedUser.email}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-sm">
                          🪙 {selectedUser.credits} CFC
                        </span>
                        <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm">
                          💰 {selectedUser.jetonBalance} Jeton
                        </span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          selectedUser.membership === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                          selectedUser.membership === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {selectedUser.membership.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <button
                      onClick={() => setShowCreditModal(true)}
                      className="p-3 bg-gradient-to-br from-emerald-500/20 to-yellow-500/20 rounded-xl text-center hover:from-emerald-500/30 hover:to-yellow-500/30 transition-colors"
                    >
                      <Coins className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <span className="text-emerald-300 text-xs">CFC / Jeton</span>
                    </button>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="p-3 bg-blue-500/20 rounded-xl text-center hover:bg-blue-500/30 transition-colors"
                    >
                      <Key className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                      <span className="text-blue-400 text-sm">Şifre</span>
                    </button>
                    <button
                      onClick={openBadgeModal}
                      className="p-3 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl text-center hover:from-purple-500/30 hover:to-cyan-500/30 transition-colors"
                    >
                      <Award className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                      <span className="text-cyan-400 text-sm">Rozet/Efekt</span>
                    </button>
                    <button
                      onClick={() => selectedUser.isStreamBanned ? handleStreamBan(false) : setShowStreamBanModal(true)}
                      className={`p-3 rounded-xl text-center transition-colors ${
                        selectedUser.isStreamBanned 
                          ? 'bg-green-500/20 hover:bg-green-500/30' 
                          : 'bg-red-500/20 hover:bg-red-500/30'
                      }`}
                    >
                      {selectedUser.isStreamBanned ? (
                        <><Unlock className="w-5 h-5 text-green-400 mx-auto mb-1" /><span className="text-green-400 text-sm">Yasağı Kaldır</span></>
                      ) : (
                        <><Ban className="w-5 h-5 text-red-400 mx-auto mb-1" /><span className="text-red-400 text-sm">Yayın Yasağı</span></>
                      )}
                    </button>
                    <button
                      onClick={selectedUser.videoStreams?.length > 0 ? handleEndStream : handleStartStream}
                      disabled={selectedUser.isStreamBanned}
                      className={`p-3 rounded-xl text-center transition-colors disabled:opacity-50 ${
                        selectedUser.videoStreams?.length > 0 
                          ? 'bg-red-500/20 hover:bg-red-500/30' 
                          : 'bg-green-500/20 hover:bg-green-500/30'
                      }`}
                    >
                      {selectedUser.videoStreams?.length > 0 ? (
                        <><Video className="w-5 h-5 text-red-400 mx-auto mb-1" /><span className="text-red-400 text-sm">Yayını Bitir</span></>
                      ) : (
                        <><Radio className="w-5 h-5 text-green-400 mx-auto mb-1" /><span className="text-green-400 text-sm">Yayın Başlat</span></>
                      )}
                    </button>
                  </div>

                  {/* Withdrawal Limit */}
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-500/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-300 font-medium">Çekim Limiti</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          defaultValue={(selectedUser as any).withdrawalLimit || 0}
                          id="withdrawalLimitInput"
                          className="w-24 px-2 py-1 bg-black/30 border border-green-500/20 rounded-lg text-white text-sm outline-none"
                          placeholder="0"
                        />
                        <span className="text-xs text-green-400">jeton</span>
                        <button
                          onClick={async () => {
                            const input = document.getElementById('withdrawalLimitInput') as HTMLInputElement
                            const limit = parseInt(input?.value || '0')
                            try {
                              await fetch('/api/admin/users/withdrawal-limit', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: selectedUser.id, limit })
                              })
                              setMessage({ type: 'success', text: 'Çekim limiti güncellendi' })
                            } catch { setMessage({ type: 'error', text: 'Hata oluştu' }) }
                          }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-green-400/60 mt-1">0 = çekim kapalı. Kullanıcının tek seferde çekebileceği maks jeton.</p>
                  </div>

                  {/* Edit Form */}
                  {editMode ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-purple-300 text-sm mb-1 block">Ad Soyad</label>
                          <input
                            type="text"
                            value={editData.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-purple-300 text-sm mb-1 block">Kullanıcı Adı</label>
                          <input
                            type="text"
                            value={editData.username || ''}
                            onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                            className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-purple-300 text-sm mb-1 block">Email</label>
                          <input
                            type="email"
                            value={editData.email || ''}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-purple-300 text-sm mb-1 block">Telefon</label>
                          <input
                            type="tel"
                            value={editData.phone || ''}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-purple-300 text-sm mb-1 block">Rol</label>
                          <select
                            value={editData.role || 'user'}
                            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                            className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-purple-300 text-sm mb-1 block">Üyelik</label>
                          <select
                            value={editData.membership || 'basic'}
                            onChange={(e) => setEditData({ ...editData, membership: e.target.value })}
                            className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
                          >
                            <option value="basic">Basic</option>
                            <option value="premium">Premium</option>
                            <option value="gold">Gold</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={handleSaveUser}
                          disabled={saving}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Kaydet
                        </button>
                        <button
                          onClick={() => { setEditMode(false); setEditData(selectedUser) }}
                          className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">{selectedUser._count.fortunes}</p>
                          <p className="text-purple-400 text-xs">Fal</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">{selectedUser._count.videoStreams}</p>
                          <p className="text-purple-400 text-xs">Yayın</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">{selectedUser._count.chatMessages}</p>
                          <p className="text-purple-400 text-xs">Mesaj</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">{selectedUser._count.socialPosts}</p>
                          <p className="text-purple-400 text-xs">Paylaşım</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">{selectedUser._count.liveSessions}</p>
                          <p className="text-purple-400 text-xs">Seans</p>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-purple-400 text-sm mb-1">Telefon</p>
                          <p className="text-white">{selectedUser.phone || '-'}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-purple-400 text-sm mb-1">Doğum Tarihi</p>
                          <p className="text-white">{selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString('tr-TR') : '-'}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-purple-400 text-sm mb-1">Burç</p>
                          <p className="text-white">{selectedUser.zodiacSign || '-'}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-purple-400 text-sm mb-1">Referans Kodu</p>
                          <p className="text-white">{selectedUser.referralCode || '-'}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-purple-400 text-sm mb-1">Kayıt Tarihi</p>
                          <p className="text-white">{new Date(selectedUser.createdAt).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-purple-400 text-sm mb-1">Dil</p>
                          <p className="text-white">{selectedUser.preferredLanguage?.toUpperCase()}</p>
                        </div>
                      </div>

                      {/* Fortune Teller Profile */}
                      {selectedUser.fortuneTellerProfile && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                          <h4 className="text-purple-300 font-medium mb-2">Falcı Profili</h4>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white">{selectedUser.fortuneTellerProfile.displayName}</p>
                              <p className="text-sm text-purple-400">
                                {selectedUser.fortuneTellerProfile.approvedAt ? '✅ Onaylı' : '⏳ Onay Bekliyor'}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              selectedUser.fortuneTellerProfile.isOnline 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {selectedUser.fortuneTellerProfile.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Stream Ban Info */}
                      {selectedUser.isStreamBanned && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <h4 className="text-red-400 font-medium mb-1 flex items-center gap-2">
                            <Ban className="w-4 h-4" /> Yayın Yasağı
                          </h4>
                          <p className="text-red-300 text-sm">{selectedUser.streamBanReason}</p>
                        </div>
                      )}

                      {/* Delete Button */}
                      <div className="pt-4 border-t border-purple-500/20">
                        <button
                          onClick={handleDeleteUser}
                          className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Kullanıcıyı Sil
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Password Reset Modal */}
        <Dialog.Root open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a0b2e] rounded-2xl z-50 p-6">
              <Dialog.Title className="text-xl font-bold text-white mb-4">Şifre Sıfırla</Dialog.Title>
              <div className="mb-4">
                <label className="text-purple-300 text-sm mb-1 block">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white pr-10"
                    placeholder="Yeni şifre girin"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  disabled={saving || !newPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Şifreyi Sıfırla'}
                </button>
                <Dialog.Close className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20">
                  İptal
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Stream Ban Modal */}
        <Dialog.Root open={showStreamBanModal} onOpenChange={setShowStreamBanModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a0b2e] rounded-2xl z-50 p-6">
              <Dialog.Title className="text-xl font-bold text-white mb-4">Yayın Yasağı Uygula</Dialog.Title>
              <div className="mb-4">
                <label className="text-purple-300 text-sm mb-1 block">Yasak Sebebi</label>
                <textarea
                  value={streamBanReason}
                  onChange={(e) => setStreamBanReason(e.target.value)}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white h-24 resize-none"
                  placeholder="Yasak sebebini girin..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStreamBan(true)}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yasakla'}
                </button>
                <Dialog.Close className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20">
                  İptal
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Currency Management Modal */}
        <Dialog.Root open={showCreditModal} onOpenChange={setShowCreditModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a0b2e] rounded-2xl z-50 p-6">
              <Dialog.Title className="text-xl font-bold text-white mb-4">CFC / Jeton Yönetimi</Dialog.Title>

              {/* Current Balances */}
              {selectedUser && (
                <div className="flex gap-3 mb-5">
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <p className="text-emerald-400 text-xs mb-1">Mevcut CFC</p>
                    <p className="text-emerald-300 text-xl font-bold">{selectedUser.credits}</p>
                  </div>
                  <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                    <p className="text-yellow-400 text-xs mb-1">Mevcut Jeton</p>
                    <p className="text-yellow-300 text-xl font-bold">{selectedUser.jetonBalance}</p>
                  </div>
                </div>
              )}

              {/* Currency selector */}
              <div className="mb-4">
                <label className="text-purple-300 text-sm mb-2 block">Birim Seçin</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreditCurrency('cfc')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                      creditCurrency === 'cfc' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    🪙 CFC
                  </button>
                  <button
                    onClick={() => setCreditCurrency('jeton')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                      creditCurrency === 'jeton' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    💰 Jeton
                  </button>
                </div>
              </div>

              {/* Action selector */}
              <div className="mb-4">
                <label className="text-purple-300 text-sm mb-2 block">İşlem</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreditAction('add')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                      creditAction === 'add' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    Ekle
                  </button>
                  <button
                    onClick={() => setCreditAction('remove')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                      creditAction === 'remove' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    Çıkar
                  </button>
                  <button
                    onClick={() => setCreditAction('set')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                      creditAction === 'set' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    Ayarla
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="mb-5">
                <label className="text-purple-300 text-sm mb-1 block">
                  {creditAction === 'set' ? 'Yeni Bakiye' : 'Miktar'}
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-3 text-white text-lg"
                  min="0"
                />
                {creditAction !== 'set' && selectedUser && (
                  <p className="text-purple-400/60 text-xs mt-1">
                    Sonuç: {creditCurrency === 'cfc' 
                      ? (creditAction === 'add' ? selectedUser.credits + creditAmount : Math.max(0, selectedUser.credits - creditAmount))
                      : (creditAction === 'add' ? selectedUser.jetonBalance + creditAmount : Math.max(0, selectedUser.jetonBalance - creditAmount))
                    } {creditCurrency === 'cfc' ? 'CFC' : 'Jeton'}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCredits}
                  disabled={saving || (creditAction !== 'set' && creditAmount <= 0)}
                  className={`flex-1 py-2.5 rounded-lg disabled:opacity-50 font-medium ${
                    creditAction === 'add' ? 'bg-green-600 hover:bg-green-500 text-white' :
                    creditAction === 'remove' ? 'bg-red-600 hover:bg-red-500 text-white' :
                    'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                    creditAction === 'add' ? `${creditCurrency === 'cfc' ? 'CFC' : 'Jeton'} Ekle` :
                    creditAction === 'remove' ? `${creditCurrency === 'cfc' ? 'CFC' : 'Jeton'} Çıkar` :
                    `${creditCurrency === 'cfc' ? 'CFC' : 'Jeton'} Ayarla`
                  )}
                </button>
                <Dialog.Close className="px-6 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20">
                  İptal
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Badge & Effect Modal */}
        <Dialog.Root open={showBadgeModal} onOpenChange={setShowBadgeModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#1a0b2e] rounded-2xl z-50 p-6">
              <Dialog.Title className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-cyan-400" />
                {language === 'tr' ? 'Rozet ve Efekt Yönetimi' : 'Badge & Effect Management'}
              </Dialog.Title>
              
              {/* Badge Selection */}
              <div className="mb-6">
                <label className="text-purple-300 text-sm mb-3 block font-medium">
                  {language === 'tr' ? 'Rozetler (Birden fazla seçilebilir)' : 'Badges (Multiple selection)'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(BADGE_CONFIG) as BadgeType[]).map((badge) => (
                    <button
                      key={badge}
                      onClick={() => toggleBadge(badge)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedBadges.includes(badge)
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${BADGE_CONFIG[badge].color}40, ${BADGE_CONFIG[badge].color}20)`,
                          boxShadow: selectedBadges.includes(badge) ? `0 0 15px ${BADGE_CONFIG[badge].color}60` : 'none'
                        }}
                      >
                        <Award className="w-6 h-6" style={{ color: BADGE_CONFIG[badge].color }} />
                      </div>
                      <span className="text-white font-medium">{BADGE_CONFIG[badge].label}</span>
                      {selectedBadges.includes(badge) && (
                        <Check className="w-4 h-4 text-cyan-400 absolute top-2 right-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Effect Selection */}
              <div className="mb-6">
                <label className="text-purple-300 text-sm mb-3 block font-medium">
                  {language === 'tr' ? 'Profil Efekti' : 'Profile Effect'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(EFFECT_CONFIG) as EffectType[]).map((effect) => (
                    <button
                      key={effect}
                      onClick={() => setSelectedEffect(effect)}
                      className={`p-3 rounded-xl border transition-all text-center ${
                        selectedEffect === effect
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {effect !== 'none' && <Sparkles className="w-4 h-4 text-purple-400" />}
                        <span className="text-white text-sm">
                          {language === 'tr' ? EFFECT_CONFIG[effect].labelTr : EFFECT_CONFIG[effect].label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preview */}
              <div className="mb-6 p-4 bg-white/5 rounded-xl">
                <p className="text-purple-300 text-sm mb-3">{language === 'tr' ? 'Önizleme' : 'Preview'}</p>
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ${
                      selectedEffect !== 'none' ? `animate-${selectedEffect === 'sparkles' ? 'sparkle' : selectedEffect === 'pulse' ? 'pulse-glow' : selectedEffect === 'rainbow' ? 'rainbow' : selectedEffect === 'fire' ? 'fire-glow' : 'soft-glow'}-border` : ''
                    }`}
                    style={{
                      boxShadow: selectedEffect !== 'none' ? '0 0 15px rgba(168, 85, 247, 0.5)' : 'none'
                    }}
                  >
                    <span className="text-white text-xl font-bold">
                      {selectedUser?.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedUser?.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {selectedBadges.map((badge) => (
                        <div 
                          key={badge}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ 
                            background: `linear-gradient(135deg, ${BADGE_CONFIG[badge].color}, ${BADGE_CONFIG[badge].color}80)`,
                            boxShadow: `0 0 6px ${BADGE_CONFIG[badge].color}60`
                          }}
                        >
                          <Award className="w-3 h-3 text-white" />
                        </div>
                      ))}
                      {selectedBadges.length === 0 && (
                        <span className="text-purple-400 text-xs">{language === 'tr' ? 'Rozet yok' : 'No badges'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveBadges}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
                <Dialog.Close className="px-6 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20">
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  )
}
