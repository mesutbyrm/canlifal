'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { MessageSquare, Users, Crown, Shield, Star, Mic, Plus, Edit2, Trash2, Search, Save, X, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface ChatRoom {
  id: string
  slug: string
  nameTr: string
  nameEn: string
  descTr: string
  descEn: string
  icon: string
  isActive: boolean
  isMuted: boolean
  ownerId: string | null
  owner: { id: string; name: string; username: string | null } | null
  giftCommissionPercent: number
  _count: { messages: number; chatGifts: number; presences: number }
}

interface User {
  id: string
  name: string
  email: string
  username: string | null
}

const ROOM_ICONS = ['🔮', '⭐', '🌙', '💬', '❤️', '🌟', '🔥', '🌌', '🧧', '🎭', '🎵', '🌺', '🦋', '👑', '💎', '🌈']

export default function AdminChatRoomsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRoom, setEditingRoom] = useState<ChatRoom | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState<ChatRoom | null>(null)
  
  // Create form
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createIcon, setCreateIcon] = useState('💬')
  const [creating, setCreating] = useState(false)
  
  // User search for owner
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [assigningOwner, setAssigningOwner] = useState(false)
  
  // Grid user limit setting
  const [gridUserLimit, setGridUserLimit] = useState(6)
  const [savingGridLimit, setSavingGridLimit] = useState(false)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/giris`)
    }
  }, [status, router, language])
  
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat-rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchRooms()
    fetchGridLimit()
  }, [fetchRooms])
  
  const fetchGridLimit = async () => {
    try {
      const res = await fetch('/api/settings/public?key=chat_grid_user_limit')
      if (res.ok) {
        const data = await res.json()
        if (data.value) setGridUserLimit(parseInt(data.value))
      }
    } catch (e) { console.error(e) }
  }
  
  const saveGridLimit = async () => {
    setSavingGridLimit(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat_grid_user_limit', value: String(gridUserLimit) })
      })
      if (res.ok) {
        alert('Kayıt başarılı!')
      }
    } catch (e) { console.error(e) }
    setSavingGridLimit(false)
  }
  
  const handleCreateRoom = async () => {
    if (!createName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/chat-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, description: createDesc, icon: createIcon })
      })
      if (res.ok) {
        setShowCreateModal(false)
        setCreateName('')
        setCreateDesc('')
        setCreateIcon('💬')
        fetchRooms()
      }
    } catch (error) {
      console.error('Error creating room:', error)
    } finally {
      setCreating(false)
    }
  }
  
  const handleUpdateRoom = async () => {
    if (!editingRoom) return
    try {
      const res = await fetch('/api/admin/chat-rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: editingRoom.id,
          nameTr: editingRoom.nameTr,
          nameEn: editingRoom.nameEn,
          descTr: editingRoom.descTr,
          descEn: editingRoom.descEn,
          icon: editingRoom.icon,
          isActive: editingRoom.isActive,
          isMuted: editingRoom.isMuted,
          giftCommissionPercent: editingRoom.giftCommissionPercent
        })
      })
      if (res.ok) {
        setEditingRoom(null)
        fetchRooms()
      }
    } catch (error) {
      console.error('Error updating room:', error)
    }
  }
  
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Bu odayı silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch('/api/admin/chat-rooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) {
        fetchRooms()
      }
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }
  
  const searchUsers = async () => {
    if (!userSearchQuery.trim()) return
    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(userSearchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setUserSearchResults(data.users || [])
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearchingUsers(false)
    }
  }
  
  const assignOwner = async (userId: string) => {
    if (!showOwnerModal) return
    setAssigningOwner(true)
    try {
      const res = await fetch('/api/admin/chat-rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: showOwnerModal.id, ownerId: userId })
      })
      if (res.ok) {
        setShowOwnerModal(null)
        setUserSearchQuery('')
        setUserSearchResults([])
        fetchRooms()
      }
    } catch (error) {
      console.error('Error assigning owner:', error)
    } finally {
      setAssigningOwner(false)
    }
  }
  
  const removeOwner = async () => {
    if (!showOwnerModal) return
    if (!confirm('Oda sahibini kaldırmak istediğinize emin misiniz?')) return
    setAssigningOwner(true)
    try {
      const res = await fetch('/api/admin/chat-rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: showOwnerModal.id, ownerId: null })
      })
      if (res.ok) {
        setShowOwnerModal(null)
        fetchRooms()
      }
    } catch (error) {
      console.error('Error removing owner:', error)
    } finally {
      setAssigningOwner(false)
    }
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen  pt-16 pb-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-fuchsia-400" />
              {'Sohbet Odaları Yönetimi'}
            </h1>
            <p className="text-fuchsia-300/60 text-sm mt-1">
              {'Odaları yönetin, sahip atayın'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-medium hover:from-fuchsia-500 hover:to-pink-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            {'Yeni Oda'}
          </button>
        </div>
        
        {/* Grid User Limit Setting */}
        <div className="bg-purple-900/30 border border-fuchsia-500/30 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-fuchsia-400" />
            Sohbet Odası Yetkili Grid Ayarı
          </h3>
          <div className="flex items-center gap-3">
            <label className="text-fuchsia-300/70 text-sm whitespace-nowrap">Üst kısımdaki kare sayısı (max):</label>
            <select
              value={gridUserLimit}
              onChange={(e) => setGridUserLimit(parseInt(e.target.value))}
              className="bg-purple-900/50 border border-fuchsia-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            >
              {[1,2,3,4,5,6,7,8].map(n => (
                <option key={n} value={n} className="bg-purple-950 text-white">{n}</option>
              ))}
            </select>
            <button
              onClick={saveGridLimit}
              disabled={savingGridLimit}
              className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {savingGridLimit ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
          <p className="text-fuchsia-300/50 text-xs mt-2">Sohbet odasına girildiğinde üst kısımda gösterilen yetkili kullanıcı kare sayısını belirler (1-8 arası).</p>
        </div>

        {/* Rooms List */}
        <div className="space-y-3">
          {rooms.map((room) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a0a2e]/80 border border-fuchsia-500/30 rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{room.icon}</span>
                  <div>
                    <h3 className="text-white font-bold">
                      {room.nameTr}
                    </h3>
                    <p className="text-fuchsia-300/60 text-sm">
                      {room.descTr}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-fuchsia-300/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {room._count.presences} aktif
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {room._count.messages} mesaj
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${room.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {room.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                      {room.isMuted && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Susturulmuş</span>
                      )}
                      {room.giftCommissionPercent > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                          %{room.giftCommissionPercent} Komisyon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Owner */}
                  <button
                    onClick={() => setShowOwnerModal(room)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      room.owner 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30' 
                        : 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 hover:bg-fuchsia-500/30'
                    }`}
                  >
                    <Crown className="w-3 h-3" />
                    {room.owner ? room.owner.name : ('Sahip Ata')}
                  </button>
                  
                  {/* Edit */}
                  <button
                    onClick={() => setEditingRoom(room)}
                    className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/30 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] rounded-2xl p-6 w-full max-w-md border border-fuchsia-500/30"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-fuchsia-400" />
                {'Yeni Oda Oluştur'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-fuchsia-300/70 text-sm block mb-2">İkon</label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setCreateIcon(icon)}
                        className={`text-2xl p-2 rounded-lg transition-all ${createIcon === icon ? 'bg-fuchsia-500/30 scale-110' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-fuchsia-300/70 text-sm block mb-1">Oda Adı</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Oda adı..."
                    className="w-full px-4 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white placeholder-fuchsia-300/40 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="text-fuchsia-300/70 text-sm block mb-1">Açıklama</label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Oda açıklaması..."
                    className="w-full px-4 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white placeholder-fuchsia-300/40 focus:outline-none resize-none"
                    rows={3}
                  />
                </div>
                
                <button
                  onClick={handleCreateRoom}
                  disabled={creating || !createName.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold disabled:opacity-50 hover:from-fuchsia-500 hover:to-pink-500 transition-all"
                >
                  {creating ? 'Oluşturuluyor...' : 'Oda Oluştur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Room Modal */}
      <AnimatePresence>
        {editingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] rounded-2xl p-6 w-full max-w-md border border-fuchsia-500/30"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-fuchsia-400" />
                {'Odayı Düzenle'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-fuchsia-300/70 text-sm block mb-2">İkon</label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setEditingRoom({ ...editingRoom, icon })}
                        className={`text-2xl p-2 rounded-lg transition-all ${editingRoom.icon === icon ? 'bg-fuchsia-500/30 scale-110' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-fuchsia-300/70 text-sm block mb-1">Ad (TR)</label>
                    <input
                      type="text"
                      value={editingRoom.nameTr}
                      onChange={(e) => setEditingRoom({ ...editingRoom, nameTr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-fuchsia-300/70 text-sm block mb-1">Ad (EN)</label>
                    <input
                      type="text"
                      value={editingRoom.nameEn}
                      onChange={(e) => setEditingRoom({ ...editingRoom, nameEn: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-fuchsia-300/70 text-sm block mb-1">Açıklama (TR)</label>
                    <textarea
                      value={editingRoom.descTr}
                      onChange={(e) => setEditingRoom({ ...editingRoom, descTr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white text-sm focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-fuchsia-300/70 text-sm block mb-1">Açıklama (EN)</label>
                    <textarea
                      value={editingRoom.descEn}
                      onChange={(e) => setEditingRoom({ ...editingRoom, descEn: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white text-sm focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoom.isActive}
                      onChange={(e) => setEditingRoom({ ...editingRoom, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-fuchsia-500/30"
                    />
                    <span className="text-fuchsia-300/70 text-sm">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoom.isMuted}
                      onChange={(e) => setEditingRoom({ ...editingRoom, isMuted: e.target.checked })}
                      className="w-4 h-4 rounded border-orange-500/30"
                    />
                    <span className="text-orange-300/70 text-sm">Oda Susturulmuş</span>
                  </label>
                </div>
                
                <div>
                  <label className="text-fuchsia-300/70 text-sm block mb-1">Hediye Komisyon Oranı (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingRoom.giftCommissionPercent}
                    onChange={(e) => setEditingRoom({ ...editingRoom, giftCommissionPercent: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white text-sm focus:outline-none"
                  />
                  <p className="text-fuchsia-300/40 text-xs mt-1">Hediye gönderimlerinden alınacak komisyon oranı (0-100)</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRoom(null)}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleUpdateRoom}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Owner Assignment Modal */}
      <AnimatePresence>
        {showOwnerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowOwnerModal(null); setUserSearchQuery(''); setUserSearchResults([]) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0a2e] rounded-2xl p-6 w-full max-w-md border border-fuchsia-500/30"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                {'Oda Sahibi Ata'}
              </h2>
              
              <p className="text-fuchsia-300/70 text-sm mb-4">
                {showOwnerModal.icon} {showOwnerModal.nameTr}
              </p>
              
              {showOwnerModal.owner && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm font-medium mb-2">
                    {'Mevcut Sahip:'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-white">{showOwnerModal.owner.name}</span>
                    <button
                      onClick={removeOwner}
                      disabled={assigningOwner}
                      className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-all"
                    >
                      {'Kaldır'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                    placeholder={'Kullanıcı ara (isim/email)...'}
                    className="flex-1 px-4 py-2 rounded-xl bg-fuchsia-900/30 border border-fuchsia-500/30 text-white placeholder-fuchsia-300/40 focus:outline-none"
                  />
                  <button
                    onClick={searchUsers}
                    disabled={searchingUsers}
                    className="px-4 py-2 rounded-xl bg-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/40 transition-all"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                
                {searchingUsers && (
                  <div className="text-center text-fuchsia-300/60 text-sm py-4">
                    Aranıyor...
                  </div>
                )}
                
                {userSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => assignOwner(user.id)}
                        disabled={assigningOwner}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 hover:bg-fuchsia-500/20 transition-all"
                      >
                        <div className="text-left">
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-fuchsia-300/60 text-xs">{user.email}</p>
                        </div>
                        <UserPlus className="w-4 h-4 text-fuchsia-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
