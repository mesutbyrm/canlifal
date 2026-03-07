'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Users, Sparkles, TrendingUp, Coffee, Star, Moon, Plus, MessageCircle, Crown, Shield, Mic, Ban, UserMinus, VolumeX, Volume2, MoreVertical, X, ChevronDown, Settings, Megaphone, Save, CheckCircle, Eye } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { LiveVisitorCount } from '@/components/live-visitor-count'
import { format } from 'date-fns'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'

interface User {
  id: string
  email: string
  name: string
  credits: number
  role: string
  preferredLanguage: string
  createdAt: string
  _count: {
    fortunes: number
  }
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
}

export default function AdminPage() {
  const { language, t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'ads' | 'visitors'>('users')
  
  // Chat management state
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [roomModData, setRoomModData] = useState<{
    roomMuted: boolean
    roles: ChatUserRole[]
    mutes: ChatMute[]
    bans: ChatBan[]
  } | null>(null)
  const [roleUserId, setRoleUserId] = useState('')
  const [roleType, setRoleType] = useState('op')

  // Ads management state
  const [adSettings, setAdSettings] = useState<Record<string, string>>({})
  const [adSaveStatus, setAdSaveStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchAdSettings()
    fetchVisitorStats()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes, roomsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/statistics'),
        fetch('/api/chat/rooms'),
      ])
      
      const usersData = await usersRes.json()
      const statsData = await statsRes.json()
      const roomsData = await roomsRes.json()
      
      setUsers(usersData?.users || usersData || [])
      setStatistics(statsData)
      setChatRooms(roomsData || [])
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVisitorStats = async () => {
    try {
      const res = await fetch('/api/admin/visitor-stats')
      if (res.ok) {
        const data = await res.json()
        setVisitorStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch visitor stats:', error)
    }
  }

  const fetchRoomModeration = async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/moderation`)
      if (res.ok) {
        const data = await res.json()
        setRoomModData(data)
      }
    } catch (error) {
      console.error('Failed to fetch room moderation:', error)
    }
  }

  const selectRoom = async (room: ChatRoom) => {
    setSelectedRoom(room)
    await fetchRoomModeration(room.id)
  }

  const performModAction = async (action: string, targetUserId: string, extra?: Record<string, unknown>) => {
    if (!selectedRoom) return
    
    try {
      const res = await fetch(`/api/chat/rooms/${selectedRoom.id}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId, ...extra })
      })
      
      if (res.ok) {
        await fetchRoomModeration(selectedRoom.id)
        alert(language === 'tr' ? 'İşlem başarılı!' : 'Action successful!')
      } else {
        const errorData = await res.json()
        alert(errorData.error)
      }
    } catch (error) {
      console.error('Mod action error:', error)
    }
  }

  const grantRole = async () => {
    if (!roleUserId || !selectedRoom) return
    await performModAction('set_role', roleUserId, { role: roleType })
    setRoleUserId('')
  }

  const addCredits = async (userId: string, amount: number) => {
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      })

      if (response?.ok) {
        // Refresh data
        await fetchData()
        setSelectedUser(null)
        alert(language === 'tr' ? 'Kredi eklendi!' : 'Credits added!')
      } else {
        alert(language === 'tr' ? 'Kredi eklenemedi!' : 'Failed to add credits!')
      }
    } catch (error) {
      console.error('Failed to add credits:', error)
      alert(language === 'tr' ? 'Hata oluştu!' : 'Error occurred!')
    }
  }

  const fetchAdSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setAdSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch ad settings:', error)
    }
  }

  const saveAdSetting = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      if (res.ok) {
        setAdSettings(prev => ({ ...prev, [key]: value }))
        setAdSaveStatus(key)
        setTimeout(() => setAdSaveStatus(null), 2000)
      }
    } catch (error) {
      console.error('Failed to save ad setting:', error)
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl text-gold-500 gold-glow mb-4">
            {t('nav.admin')}
          </h1>
        </motion.div>

        {/* Tab Navigation with Dropdown */}
        <div className="flex gap-4 mb-8 items-center">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="px-6 py-3 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500 transition-colors">
                {activeTab === 'users' ? (
                  <>
                    <Users className="w-5 h-5" />
                    {language === 'tr' ? 'Kullanıcılar' : 'Users'}
                  </>
                ) : activeTab === 'chat' ? (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    {language === 'tr' ? 'Sohbet Yönetimi' : 'Chat Management'}
                  </>
                ) : (
                  <>
                    <Megaphone className="w-5 h-5" />
                    {language === 'tr' ? 'Reklam Yönetimi' : 'Ad Management'}
                  </>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className="min-w-[200px] bg-deep-purple-900 border border-deep-purple-700 rounded-lg shadow-xl p-1 z-50"
                sideOffset={5}
              >
                <DropdownMenu.Item 
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-4 py-3 rounded cursor-pointer outline-none ${activeTab === 'users' ? 'bg-gold-600/20 text-gold-400' : 'text-deep-purple-200 hover:bg-deep-purple-800'}`}
                >
                  <Users className="w-5 h-5" />
                  {language === 'tr' ? 'Kullanıcılar' : 'Users'}
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-3 rounded cursor-pointer outline-none ${activeTab === 'chat' ? 'bg-gold-600/20 text-gold-400' : 'text-deep-purple-200 hover:bg-deep-purple-800'}`}
                >
                  <MessageCircle className="w-5 h-5" />
                  {language === 'tr' ? 'Sohbet Yönetimi' : 'Chat Management'}
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  onClick={() => setActiveTab('ads')}
                  className={`flex items-center gap-2 px-4 py-3 rounded cursor-pointer outline-none ${activeTab === 'ads' ? 'bg-gold-600/20 text-gold-400' : 'text-deep-purple-200 hover:bg-deep-purple-800'}`}
                >
                  <Megaphone className="w-5 h-5" />
                  {language === 'tr' ? 'Reklam Yönetimi' : 'Ad Management'}
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  onClick={() => setActiveTab('visitors')}
                  className={`flex items-center gap-2 px-4 py-3 rounded cursor-pointer outline-none ${activeTab === 'visitors' ? 'bg-gold-600/20 text-gold-400' : 'text-deep-purple-200 hover:bg-deep-purple-800'}`}
                >
                  <TrendingUp className="w-5 h-5" />
                  {language === 'tr' ? 'Ziyaretçi İstatistikleri' : 'Visitor Statistics'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          
          <div className="flex-1" />
          
          <p className="text-deep-purple-400 text-sm">
            FALCI {language === 'tr' ? 'Yönetim Paneli' : 'Admin Panel'}
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner message={language === 'tr' ? 'Veriler yükleniyor...' : 'Loading data...'} />
        ) : activeTab === 'users' ? (
          <>
            {/* Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            >
              {/* Live Visitor Count - Prominent */}
              <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-lg p-6 mystical-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <Eye className="w-6 h-6 text-green-400" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-green-300 font-medium">{language === 'tr' ? 'Aktif Ziyaretçi' : 'Active Visitors'}</h3>
                </div>
                <LiveVisitorCount variant="admin" />
              </div>

              <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-gold-500" />
                  <h3 className="text-deep-purple-200 font-medium">{t('admin.total_users')}</h3>
                </div>
                <p className="text-4xl font-serif text-gold-400">{statistics?.totalUsers ?? 0}</p>
              </div>

              <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-gold-500" />
                  <h3 className="text-deep-purple-200 font-medium">{t('admin.total_fortunes')}</h3>
                </div>
                <p className="text-4xl font-serif text-gold-400">{statistics?.totalFortunes ?? 0}</p>
              </div>

              <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow">
                <h3 className="text-deep-purple-200 font-medium mb-3">{language === 'tr' ? 'Fal Türleri' : 'Fortune Types'}</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{language === 'tr' ? 'Kahve Falı' : 'Coffee Fortune'}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.coffee ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{language === 'tr' ? 'Tarot Falı' : 'Tarot Reading'}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.tarot ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{language === 'tr' ? 'Rüya Tabiri' : 'Dream Interpretation'}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.dream ?? 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Users Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow overflow-x-auto"
            >
              <h2 className="font-serif text-2xl text-gold-400 mb-6">{t('admin.users')}</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-deep-purple-800">
                    <th className="text-left py-3 px-4 text-deep-purple-300 font-medium">{t('form.name')}</th>
                    <th className="text-left py-3 px-4 text-deep-purple-300 font-medium">{t('form.email')}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{t('nav.credits')}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'Fal Sayısı' : 'Fortunes'}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'Kayıt' : 'Joined'}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'İşlemler' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user?.id} className="border-b border-deep-purple-900/50 hover:bg-deep-purple-900/20">
                      <td className="py-3 px-4 text-deep-purple-100">{user?.name}</td>
                      <td className="py-3 px-4 text-deep-purple-100">{user?.email}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gold-400 font-medium">
                          <Sparkles className="w-4 h-4" />
                          {user?.credits}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-deep-purple-100">{user?._count?.fortunes ?? 0}</td>
                      <td className="py-3 px-4 text-center text-deep-purple-300 text-sm">
                        {format(new Date(user?.createdAt), 'MMM dd')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-2 hover:bg-deep-purple-800 rounded-lg transition-colors">
                              <MoreVertical className="w-5 h-5 text-deep-purple-300" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content 
                              className="min-w-[180px] bg-deep-purple-900 border border-deep-purple-700 rounded-lg shadow-xl p-1 z-50"
                              sideOffset={5}
                            >
                              <DropdownMenu.Item 
                                onClick={() => setSelectedUser(user)}
                                className="flex items-center gap-2 px-3 py-2 text-gold-400 hover:bg-deep-purple-800 rounded cursor-pointer outline-none"
                              >
                                <Plus className="w-4 h-4" />
                                {language === 'tr' ? 'Kredi Ekle' : 'Add Credits'}
                              </DropdownMenu.Item>
                              <DropdownMenu.Item 
                                className="flex items-center gap-2 px-3 py-2 text-deep-purple-200 hover:bg-deep-purple-800 rounded cursor-pointer outline-none"
                              >
                                <Settings className="w-4 h-4" />
                                {language === 'tr' ? 'Düzenle' : 'Edit'}
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="h-px bg-deep-purple-700 my-1" />
                              <DropdownMenu.Item 
                                className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/30 rounded cursor-pointer outline-none"
                              >
                                <Ban className="w-4 h-4" />
                                {language === 'tr' ? 'Engelle' : 'Ban'}
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </>
        ) : activeTab === 'chat' ? (
          /* Chat Management Tab */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Chat Rooms List */}
            <div className="bg-mystical-card border border-mystical rounded-lg p-6">
              <h2 className="font-serif text-xl text-gold-400 mb-4">
                {language === 'tr' ? 'Sohbet Odaları' : 'Chat Rooms'}
              </h2>
              <div className="space-y-3">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => selectRoom(room)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${selectedRoom?.id === room.id ? 'bg-gold-600/20 border border-gold-500/50' : 'bg-deep-purple-900/50 hover:bg-deep-purple-800/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{room.icon}</span>
                      <div>
                        <h3 className="text-deep-purple-100 font-medium">
                          {language === 'tr' ? room.nameTr : room.nameEn}
                        </h3>
                        <p className="text-deep-purple-400 text-sm">
                          {room.onlineCount} {language === 'tr' ? 'çevrimiçi' : 'online'} • {room.messageCount} {language === 'tr' ? 'mesaj' : 'messages'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Management */}
            <div className="lg:col-span-2 bg-mystical-card border border-mystical rounded-lg p-6">
              {selectedRoom && roomModData ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-xl text-gold-400 flex items-center gap-2">
                      <span>{selectedRoom.icon}</span>
                      {language === 'tr' ? selectedRoom.nameTr : selectedRoom.nameEn}
                      {roomModData.roomMuted && <VolumeX className="w-5 h-5 text-red-400" />}
                    </h2>
                    <button
                      onClick={() => performModAction(roomModData.roomMuted ? 'unmute_room' : 'mute_room', '')}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${roomModData.roomMuted ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}
                    >
                      {roomModData.roomMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      {roomModData.roomMuted ? (language === 'tr' ? 'Sessizi Aç' : 'Unmute Room') : (language === 'tr' ? 'Odayı Sessize Al' : 'Mute Room')}
                    </button>
                  </div>

                  {/* Grant Role Section */}
                  <div className="mb-6 p-4 bg-deep-purple-900/50 rounded-lg">
                    <h3 className="text-deep-purple-200 font-medium mb-3">
                      {language === 'tr' ? 'Yetki Ver' : 'Grant Role'}
                    </h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-deep-purple-400 text-sm mb-1 block">
                          {language === 'tr' ? 'Kullanıcı ID' : 'User ID'}
                        </label>
                        <select
                          value={roleUserId}
                          onChange={(e) => setRoleUserId(e.target.value)}
                          className="w-full px-3 py-2 bg-deep-purple-800 border border-deep-purple-700 rounded-lg text-deep-purple-100"
                        >
                          <option value="">{language === 'tr' ? 'Kullanıcı Seç' : 'Select User'}</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-deep-purple-400 text-sm mb-1 block">
                          {language === 'tr' ? 'Yetki' : 'Role'}
                        </label>
                        <select
                          value={roleType}
                          onChange={(e) => setRoleType(e.target.value)}
                          className="px-3 py-2 bg-deep-purple-800 border border-deep-purple-700 rounded-lg text-deep-purple-100"
                        >
                          <option value="voice">+ Voice</option>
                          <option value="op">@ Op</option>
                          <option value="admin">& Admin</option>
                          <option value="founder">~ Founder</option>
                        </select>
                      </div>
                      <button
                        onClick={grantRole}
                        className="px-4 py-2 bg-gold-600 text-black rounded-lg hover:bg-gold-500"
                      >
                        {language === 'tr' ? 'Ver' : 'Grant'}
                      </button>
                    </div>
                  </div>

                  {/* Current Roles */}
                  <div className="mb-6">
                    <h3 className="text-deep-purple-200 font-medium mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-gold-400" />
                      {language === 'tr' ? 'Yetkili Kullanıcılar' : 'Users with Roles'}
                    </h3>
                    {roomModData.roles.length > 0 ? (
                      <div className="space-y-2">
                        {roomModData.roles.map((role) => (
                          <div key={role.id} className="flex items-center justify-between p-3 bg-deep-purple-900/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {role.role === 'founder' && <Crown className="w-4 h-4 text-red-400" />}
                              {role.role === 'admin' && <Shield className="w-4 h-4 text-orange-400" />}
                              {role.role === 'op' && <Star className="w-4 h-4 text-green-400" />}
                              {role.role === 'voice' && <Mic className="w-4 h-4 text-blue-400" />}
                              <span className="text-deep-purple-100">{role.user.name}</span>
                              <span className="text-deep-purple-400 text-sm">({role.role})</span>
                            </div>
                            <button
                              onClick={() => performModAction('remove_role', role.userId)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              {language === 'tr' ? 'Kaldır' : 'Remove'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-deep-purple-400 text-sm">{language === 'tr' ? 'Yetkili kullanıcı yok' : 'No users with roles'}</p>
                    )}
                  </div>

                  {/* Muted Users */}
                  <div className="mb-6">
                    <h3 className="text-deep-purple-200 font-medium mb-3 flex items-center gap-2">
                      <VolumeX className="w-4 h-4 text-orange-400" />
                      {language === 'tr' ? 'Susturulanlar' : 'Muted Users'}
                    </h3>
                    {roomModData.mutes.length > 0 ? (
                      <div className="space-y-2">
                        {roomModData.mutes.map((mute) => (
                          <div key={mute.id} className="flex items-center justify-between p-3 bg-orange-900/20 rounded-lg">
                            <span className="text-deep-purple-100">{mute.user.name}</span>
                            <button
                              onClick={() => performModAction('unmute_user', mute.userId)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              {language === 'tr' ? 'Susturmayı Kaldır' : 'Unmute'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-deep-purple-400 text-sm">{language === 'tr' ? 'Susturulan yok' : 'No muted users'}</p>
                    )}
                  </div>

                  {/* Banned Users */}
                  <div>
                    <h3 className="text-deep-purple-200 font-medium mb-3 flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400" />
                      {language === 'tr' ? 'Engellenenler' : 'Banned Users'}
                    </h3>
                    {roomModData.bans.length > 0 ? (
                      <div className="space-y-2">
                        {roomModData.bans.map((ban) => (
                          <div key={ban.id} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                            <span className="text-deep-purple-100">{ban.user.name}</span>
                            <button
                              onClick={() => performModAction('unban_user', ban.userId)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              {language === 'tr' ? 'Engeli Kaldır' : 'Unban'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-deep-purple-400 text-sm">{language === 'tr' ? 'Engellenen yok' : 'No banned users'}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-deep-purple-400 mx-auto mb-4" />
                  <p className="text-deep-purple-400">
                    {language === 'tr' ? 'Yönetmek için bir oda seçin' : 'Select a room to manage'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'ads' ? (
          /* Ads Management Tab */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info Banner */}
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <h3 className="text-blue-300 font-medium mb-2">
                {language === 'tr' ? 'Google Ads Entegrasyonu' : 'Google Ads Integration'}
              </h3>
              <p className="text-blue-200 text-sm">
                {language === 'tr' 
                  ? 'Google AdSense kodlarınızı aşağıdaki alanlara yapıştırın. Her alan farklı bir konumda görüntülenecektir.'
                  : 'Paste your Google AdSense codes in the fields below. Each field will display in a different location.'}
              </p>
            </div>

            {/* Ad Slots */}
            <div className="grid gap-6">
              {/* Header Ad */}
              <div className="bg-mystical-card border border-mystical rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-gold-400 font-medium">
                      {language === 'tr' ? 'Üst Banner Reklamı' : 'Header Banner Ad'}
                    </h3>
                    <p className="text-deep-purple-400 text-sm">
                      {language === 'tr' ? 'Sayfanın üst kısmında görünür' : 'Appears at the top of pages'}
                    </p>
                  </div>
                  {adSaveStatus === 'ads_header' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {language === 'tr' ? 'Kaydedildi' : 'Saved'}
                    </span>
                  )}
                </div>
                <textarea
                  value={adSettings['ads_header'] || ''}
                  onChange={(e) => setAdSettings(prev => ({ ...prev, ads_header: e.target.value }))}
                  placeholder={language === 'tr' ? 'Google AdSense kodunu buraya yapıştırın...' : 'Paste Google AdSense code here...'}
                  className="w-full h-32 px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-600 font-mono text-sm"
                />
                <button
                  onClick={() => saveAdSetting('ads_header', adSettings['ads_header'] || '')}
                  className="mt-3 px-4 py-2 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500"
                >
                  <Save className="w-4 h-4" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>

              {/* Sidebar Ad */}
              <div className="bg-mystical-card border border-mystical rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-gold-400 font-medium">
                      {language === 'tr' ? 'Kenar Çubuğu Reklamı' : 'Sidebar Ad'}
                    </h3>
                    <p className="text-deep-purple-400 text-sm">
                      {language === 'tr' ? 'Sayfa kenarında görünür' : 'Appears in the sidebar'}
                    </p>
                  </div>
                  {adSaveStatus === 'ads_sidebar' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {language === 'tr' ? 'Kaydedildi' : 'Saved'}
                    </span>
                  )}
                </div>
                <textarea
                  value={adSettings['ads_sidebar'] || ''}
                  onChange={(e) => setAdSettings(prev => ({ ...prev, ads_sidebar: e.target.value }))}
                  placeholder={language === 'tr' ? 'Google AdSense kodunu buraya yapıştırın...' : 'Paste Google AdSense code here...'}
                  className="w-full h-32 px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-600 font-mono text-sm"
                />
                <button
                  onClick={() => saveAdSetting('ads_sidebar', adSettings['ads_sidebar'] || '')}
                  className="mt-3 px-4 py-2 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500"
                >
                  <Save className="w-4 h-4" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>

              {/* Inline Ad (between content) */}
              <div className="bg-mystical-card border border-mystical rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-gold-400 font-medium">
                      {language === 'tr' ? 'İçerik Arası Reklam' : 'Inline Content Ad'}
                    </h3>
                    <p className="text-deep-purple-400 text-sm">
                      {language === 'tr' ? 'İçerik arasında görünür' : 'Appears between content sections'}
                    </p>
                  </div>
                  {adSaveStatus === 'ads_inline' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {language === 'tr' ? 'Kaydedildi' : 'Saved'}
                    </span>
                  )}
                </div>
                <textarea
                  value={adSettings['ads_inline'] || ''}
                  onChange={(e) => setAdSettings(prev => ({ ...prev, ads_inline: e.target.value }))}
                  placeholder={language === 'tr' ? 'Google AdSense kodunu buraya yapıştırın...' : 'Paste Google AdSense code here...'}
                  className="w-full h-32 px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-600 font-mono text-sm"
                />
                <button
                  onClick={() => saveAdSetting('ads_inline', adSettings['ads_inline'] || '')}
                  className="mt-3 px-4 py-2 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500"
                >
                  <Save className="w-4 h-4" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>

              {/* Footer Ad */}
              <div className="bg-mystical-card border border-mystical rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-gold-400 font-medium">
                      {language === 'tr' ? 'Alt Banner Reklamı' : 'Footer Banner Ad'}
                    </h3>
                    <p className="text-deep-purple-400 text-sm">
                      {language === 'tr' ? 'Sayfanın alt kısmında görünür' : 'Appears at the bottom of pages'}
                    </p>
                  </div>
                  {adSaveStatus === 'ads_footer' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {language === 'tr' ? 'Kaydedildi' : 'Saved'}
                    </span>
                  )}
                </div>
                <textarea
                  value={adSettings['ads_footer'] || ''}
                  onChange={(e) => setAdSettings(prev => ({ ...prev, ads_footer: e.target.value }))}
                  placeholder={language === 'tr' ? 'Google AdSense kodunu buraya yapıştırın...' : 'Paste Google AdSense code here...'}
                  className="w-full h-32 px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-600 font-mono text-sm"
                />
                <button
                  onClick={() => saveAdSetting('ads_footer', adSettings['ads_footer'] || '')}
                  className="mt-3 px-4 py-2 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500"
                >
                  <Save className="w-4 h-4" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>

              {/* Rewarded Ad (Watch to earn credits) */}
              <div className="bg-mystical-card border border-mystical rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-gold-400 font-medium flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      {language === 'tr' ? 'Ödüllü Reklam (Kredi Kazanma)' : 'Rewarded Ad (Earn Credits)'}
                    </h3>
                    <p className="text-deep-purple-400 text-sm">
                      {language === 'tr' 
                        ? 'Kullanıcılar bu reklamı izleyerek 5 kredi kazanır. Günlük limit: 10 reklam.'
                        : 'Users earn 5 credits by watching this ad. Daily limit: 10 ads.'}
                    </p>
                  </div>
                  {adSaveStatus === 'ads_rewarded' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {language === 'tr' ? 'Kaydedildi' : 'Saved'}
                    </span>
                  )}
                </div>
                <textarea
                  value={adSettings['ads_rewarded'] || ''}
                  onChange={(e) => setAdSettings(prev => ({ ...prev, ads_rewarded: e.target.value }))}
                  placeholder={language === 'tr' ? 'Google AdSense kodunu buraya yapıştırın...' : 'Paste Google AdSense code here...'}
                  className="w-full h-32 px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-600 font-mono text-sm"
                />
                <button
                  onClick={() => saveAdSetting('ads_rewarded', adSettings['ads_rewarded'] || '')}
                  className="mt-3 px-4 py-2 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500"
                >
                  <Save className="w-4 h-4" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>

              {/* Google AdSense Client ID */}
              <div className="bg-mystical-card border border-mystical rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-gold-400 font-medium">
                      {language === 'tr' ? 'Google AdSense Script' : 'Google AdSense Script'}
                    </h3>
                    <p className="text-deep-purple-400 text-sm">
                      {language === 'tr' 
                        ? 'Google AdSense ana script kodunu buraya yapıştırın (head bölümüne eklenecek)'
                        : 'Paste your Google AdSense main script code here (will be added to head)'}
                    </p>
                  </div>
                  {adSaveStatus === 'ads_script' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {language === 'tr' ? 'Kaydedildi' : 'Saved'}
                    </span>
                  )}
                </div>
                <textarea
                  value={adSettings['ads_script'] || ''}
                  onChange={(e) => setAdSettings(prev => ({ ...prev, ads_script: e.target.value }))}
                  placeholder='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX" crossorigin="anonymous"></script>'
                  className="w-full h-24 px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-600 font-mono text-sm"
                />
                <button
                  onClick={() => saveAdSetting('ads_script', adSettings['ads_script'] || '')}
                  className="mt-3 px-4 py-2 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500"
                >
                  <Save className="w-4 h-4" />
                  {language === 'tr' ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'visitors' ? (
          /* Visitor Statistics Tab */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <h2 className="font-serif text-3xl text-gold-400 mb-2">
                {language === 'tr' ? 'Ziyaretçi İstatistikleri' : 'Visitor Statistics'}
              </h2>
              <p className="text-deep-purple-300">
                {language === 'tr' ? 'Tekil ve toplam ziyaretçi sayıları ile coğrafi dağılım' : 'Unique and total visitor counts with geographic distribution'}
              </p>
            </div>

            {/* Time-based Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Today */}
              <div className="bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-deep-purple-200 font-medium">{language === 'tr' ? 'Bugün' : 'Today'}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Tekil' : 'Unique'}</p>
                    <p className="text-2xl font-bold text-blue-400">{visitorStats?.today?.unique ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Toplam' : 'Total'}</p>
                    <p className="text-lg text-blue-300">{visitorStats?.today?.total ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Week */}
              <div className="bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-deep-purple-200 font-medium">{language === 'tr' ? 'Bu Hafta' : 'This Week'}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Tekil' : 'Unique'}</p>
                    <p className="text-2xl font-bold text-green-400">{visitorStats?.week?.unique ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Toplam' : 'Total'}</p>
                    <p className="text-lg text-green-300">{visitorStats?.week?.total ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Month */}
              <div className="bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-deep-purple-200 font-medium">{language === 'tr' ? 'Bu Ay' : 'This Month'}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Tekil' : 'Unique'}</p>
                    <p className="text-2xl font-bold text-yellow-400">{visitorStats?.month?.unique ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Toplam' : 'Total'}</p>
                    <p className="text-lg text-yellow-300">{visitorStats?.month?.total ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Year */}
              <div className="bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-deep-purple-200 font-medium">{language === 'tr' ? 'Bu Yıl' : 'This Year'}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Tekil' : 'Unique'}</p>
                    <p className="text-2xl font-bold text-purple-400">{visitorStats?.year?.unique ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-deep-purple-400 text-xs">{language === 'tr' ? 'Toplam' : 'Total'}</p>
                    <p className="text-lg text-purple-300">{visitorStats?.year?.total ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Geographic Statistics */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Countries */}
              <div className="bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl p-6">
                <h3 className="font-serif text-xl text-gold-400 mb-4 flex items-center gap-2">
                  🌍 {language === 'tr' ? 'Ülkelere Göre (Son 30 Gün)' : 'By Country (Last 30 Days)'}
                </h3>
                <div className="space-y-3">
                  {visitorStats?.geo?.countries?.length ? (
                    visitorStats.geo.countries.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-deep-purple-200">{item.country}</span>
                        <span className="text-gold-400 font-semibold">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-deep-purple-400 text-sm">{language === 'tr' ? 'Henüz veri yok' : 'No data yet'}</p>
                  )}
                </div>
              </div>

              {/* Cities */}
              <div className="bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl p-6">
                <h3 className="font-serif text-xl text-gold-400 mb-4 flex items-center gap-2">
                  🏙️ {language === 'tr' ? 'Şehirlere Göre (Son 30 Gün)' : 'By City (Last 30 Days)'}
                </h3>
                <div className="space-y-3">
                  {visitorStats?.geo?.cities?.length ? (
                    visitorStats.geo.cities.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-deep-purple-200">{item.city}</span>
                        <span className="text-gold-400 font-semibold">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-deep-purple-400 text-sm">{language === 'tr' ? 'Henüz veri yok' : 'No data yet'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={fetchVisitorStats}
                className="px-6 py-3 bg-gold-600 text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gold-500 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                {language === 'tr' ? 'Verileri Yenile' : 'Refresh Data'}
              </button>
            </div>
          </motion.div>
        ) : null}

        {/* Add Credits Modal */}
        <Dialog.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-deep-purple-950 border border-deep-purple-700 rounded-lg p-8 max-w-md w-full z-50 shadow-2xl">
              <Dialog.Title className="font-serif text-2xl text-gold-400 mb-6 flex items-center justify-between">
                {t('admin.add_credits')}
                <Dialog.Close asChild>
                  <button className="p-1 hover:bg-deep-purple-800 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-deep-purple-400" />
                  </button>
                </Dialog.Close>
              </Dialog.Title>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-deep-purple-300 text-sm mb-1">{t('form.name')}</p>
                  <p className="text-deep-purple-100 font-medium">{selectedUser?.name}</p>
                </div>
                <div>
                  <p className="text-deep-purple-300 text-sm mb-1">{language === 'tr' ? 'Mevcut Kredi' : 'Current Credits'}</p>
                  <p className="text-gold-400 font-semibold text-xl">{selectedUser?.credits}</p>
                </div>

                <div>
                  <label className="text-deep-purple-300 text-sm mb-2 block">
                    {language === 'tr' ? 'Eklenecek Kredi' : 'Credits to Add'}
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e?.target?.value ?? '0'))}
                    min="1"
                    className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Dialog.Close asChild>
                  <button className="flex-1 py-3 bg-deep-purple-800 text-deep-purple-200 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium">
                    {t('form.cancel')}
                  </button>
                </Dialog.Close>
                <button
                  onClick={() => addCredits(selectedUser?.id ?? '', creditAmount)}
                  className="flex-1 py-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold mystical-shadow"
                >
                  {language === 'tr' ? 'Ekle' : 'Add'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  )
}
