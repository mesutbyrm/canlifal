'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Users, Sparkles, TrendingUp, Coffee, Star, Moon, Plus, MessageCircle, Crown, Shield, Mic, Ban, UserMinus, VolumeX, Volume2 } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { format } from 'date-fns'

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

export default function AdminPage() {
  const { language, t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users')
  
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

  useEffect(() => {
    fetchData()
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

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'users' ? 'bg-gold-600 text-black' : 'bg-deep-purple-800 text-deep-purple-200 hover:bg-deep-purple-700'}`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            {language === 'tr' ? 'Kullanıcılar' : 'Users'}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'chat' ? 'bg-gold-600 text-black' : 'bg-deep-purple-800 text-deep-purple-200 hover:bg-deep-purple-700'}`}
          >
            <MessageCircle className="w-5 h-5 inline mr-2" />
            {language === 'tr' ? 'Sohbet Yönetimi' : 'Chat Management'}
          </button>
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
              className="grid md:grid-cols-3 gap-6 mb-12"
            >
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
                      <span className="text-deep-purple-200">{t('fortune.coffee.name')}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.coffee ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{t('fortune.tarot.name')}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.tarot ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{t('fortune.dream.name')}</span>
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
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'Açıklar' : 'Actions'}</th>
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
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gold-600/20 text-gold-400 rounded hover:bg-gold-600/30 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          {language === 'tr' ? 'Kredi Ekle' : 'Add Credits'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </>
        ) : (
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
        )}

        {/* Add Credits Modal */}
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedUser(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-mystical-card border border-mystical rounded-lg p-8 max-w-md w-full mystical-shadow"
            >
              <h3 className="font-serif text-2xl text-gold-400 mb-6">
                {t('admin.add_credits')}
              </h3>

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
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-3 bg-deep-purple-800 text-deep-purple-200 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium"
                >
                  {t('form.cancel')}
                </button>
                <button
                  onClick={() => addCredits(selectedUser?.id, creditAmount)}
                  className="flex-1 py-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold mystical-shadow"
                >
                  {language === 'tr' ? 'Ekle' : 'Add'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
