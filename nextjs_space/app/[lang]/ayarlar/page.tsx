'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'

import { motion } from 'framer-motion'
import {
  User,
  Calendar,
  Clock,
  Star,
  Heart,
  Camera,
  Save,
  Loader2,
  Check,
  Sparkles,
  Sun,
  Moon,
  Mail,
  Phone,
  AtSign,
  AlertCircle,
  Shield,
  Lock,
  Users,
  Globe,
  Ban,
  UserX,
  Trash2,
  MessageCircle,
  Video,
  Eye,
  EyeOff
} from 'lucide-react'

const ZODIAC_SIGNS = [
  { id: 'aries', tr: 'Koç', en: 'Aries', dates: { start: [3, 21], end: [4, 19] }, emoji: '♈' },
  { id: 'taurus', tr: 'Boğa', en: 'Taurus', dates: { start: [4, 20], end: [5, 20] }, emoji: '♉' },
  { id: 'gemini', tr: 'İkizler', en: 'Gemini', dates: { start: [5, 21], end: [6, 20] }, emoji: '♊' },
  { id: 'cancer', tr: 'Yengeç', en: 'Cancer', dates: { start: [6, 21], end: [7, 22] }, emoji: '♋' },
  { id: 'leo', tr: 'Aslan', en: 'Leo', dates: { start: [7, 23], end: [8, 22] }, emoji: '♌' },
  { id: 'virgo', tr: 'Başak', en: 'Virgo', dates: { start: [8, 23], end: [9, 22] }, emoji: '♍' },
  { id: 'libra', tr: 'Terazi', en: 'Libra', dates: { start: [9, 23], end: [10, 22] }, emoji: '♎' },
  { id: 'scorpio', tr: 'Akrep', en: 'Scorpio', dates: { start: [10, 23], end: [11, 21] }, emoji: '♏' },
  { id: 'sagittarius', tr: 'Yay', en: 'Sagittarius', dates: { start: [11, 22], end: [12, 21] }, emoji: '♐' },
  { id: 'capricorn', tr: 'Oğlak', en: 'Capricorn', dates: { start: [12, 22], end: [1, 19] }, emoji: '♑' },
  { id: 'aquarius', tr: 'Kova', en: 'Aquarius', dates: { start: [1, 20], end: [2, 18] }, emoji: '♒' },
  { id: 'pisces', tr: 'Balık', en: 'Pisces', dates: { start: [2, 19], end: [3, 20] }, emoji: '♓' }
]

const FOOTBALL_TEAMS = [
  'Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor',
  'Adana Demirspor', 'Antalyaspor', 'Alanyaspor', 'Başakşehir',
  'Gaziantep FK', 'Hatayspor', 'Kasimpasa', 'Kayserispor',
  'Konyaspor', 'MKE Ankaragucu', 'Pendikspor', 'Rizespor',
  'Samsunspor', 'Sivasspor', 'Diğer'
]

export default function SettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [image, setImage] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [favoriteTeam, setFavoriteTeam] = useState('')
  const [zodiacSign, setZodiacSign] = useState('')
  const [risingSign, setRisingSign] = useState('')
  const [messagePrivacy, setMessagePrivacy] = useState('everyone')
  const [hideProfileViews, setHideProfileViews] = useState(false)
  const [membership, setMembership] = useState('')
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [adminAssignedFrameId, setAdminAssignedFrameId] = useState<string | null>(null)
  const [availableFrames, setAvailableFrames] = useState<{id: string, name: string, imageUrl: string, tier: string}[]>([])
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null)
  const [savingFrame, setSavingFrame] = useState(false)
  
  // Blocked users
  interface BlockedUser {
    id: string
    roomId?: string
    roomName?: string
    roomSlug?: string
    streamId?: string
    streamTitle?: string
    userId: string
    userName: string | null
    userUsername: string | null
    userImage: string | null
    reason?: string | null
    createdAt?: string
    bannedAt?: string
    expiresAt?: string | null
  }
  const [blockedUsers, setBlockedUsers] = useState<{chatBans: BlockedUser[], streamBans: BlockedUser[]}>({ chatBans: [], streamBans: [] })
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/giris`)
      return
    }
    fetchProfile()
    fetchBlockedUsers()
  }, [session, status, language])

  const fetchBlockedUsers = async () => {
    setLoadingBlocked(true)
    try {
      const res = await fetch('/api/user/blocked')
      if (res.ok) {
        const data = await res.json()
        setBlockedUsers(data)
      }
    } catch (err) {
      console.error('Fetch blocked users error:', err)
    } finally {
      setLoadingBlocked(false)
    }
  }

  const handleUnblock = async (type: 'chat' | 'stream', id: string) => {
    setUnblocking(id)
    try {
      const res = await fetch('/api/user/blocked', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      })
      if (res.ok) {
        // Refresh the blocked users list
        fetchBlockedUsers()
      }
    } catch (err) {
      console.error('Unblock error:', err)
    } finally {
      setUnblocking(null)
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setName(data.name || '')
        setUsername(data.username || '')
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setImage(data.image || '')
        setBirthDate(data.birthDate ? data.birthDate.split('T')[0] : '')
        setBirthTime(data.birthTime || '')
        setFavoriteTeam(data.favoriteTeam || '')
        setZodiacSign(data.zodiacSign || '')
        setRisingSign(data.risingSign || '')
        setMessagePrivacy(data.messagePrivacy || 'everyone')
        setHideProfileViews(data.hideProfileViews || false)
        setMembership(data.membership || 'basic')
        setSelectedFrameId(data.profileFrameId || null)
        setAdminAssignedFrameId(data.adminAssignedFrameId || null)
        // Determine active frame URL (admin override takes priority)
        const activeFrame = data.adminAssignedFrame || data.profileFrame
        setActiveFrameUrl(activeFrame?.imageUrl || null)
      }
    } catch (err) {
      console.error('Fetch profile error:', err)
    } finally {
      setLoading(false)
    }
    // Fetch available frames
    try {
      const framesRes = await fetch('/api/profile-frames')
      if (framesRes.ok) {
        const framesData = await framesRes.json()
        setAvailableFrames(framesData)
      }
    } catch (err) {
      console.error('Fetch frames error:', err)
    }
  }

  const calculateZodiacSign = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    for (const sign of ZODIAC_SIGNS) {
      const [startMonth, startDay] = sign.dates.start
      const [endMonth, endDay] = sign.dates.end
      if (startMonth === endMonth) {
        if (month === startMonth && day >= startDay && day <= endDay) return sign.id
      } else if (startMonth > endMonth) {
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) return sign.id
      } else {
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) return sign.id
      }
    }
    return ''
  }

  useEffect(() => {
    if (birthDate) {
      const sign = calculateZodiacSign(birthDate)
      setZodiacSign(sign)
    }
  }, [birthDate])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır')
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
        const { url } = await urlRes.json()
        setImage(url)
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Yükleme başarısız oldu')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username: username || null,
          email,
          phone: phone || null,
          image,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
          favoriteTeam: favoriteTeam || null,
          zodiacSign: zodiacSign || null,
          risingSign: risingSign || null,
          messagePrivacy,
          hideProfileViews
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => {
          router.back()
        }, 600)
      } else {
        const data = await res.json()
        if (data.error === 'username_taken') {
          setError('Bu kullanıcı adı zaten kullanılıyor')
        } else if (data.error === 'username_invalid') {
          setError('Kullanıcı adı 3-20 karakter, sadece harf, rakam ve alt çizgi içerebilir')
        } else if (data.error === 'email_taken') {
          setError('Bu email adresi zaten kullanılıyor')
        } else if (data.error === 'email_invalid') {
          setError('Geçerli bir email adresi girin')
        } else {
          setError(data.message || 'Kaydetme hatası')
        }
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectFrame = async (frameId: string | null) => {
    setSavingFrame(true)
    try {
      const res = await fetch('/api/profile-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameId })
      })
      if (res.ok) {
        setSelectedFrameId(frameId)
        const frame = availableFrames.find(f => f.id === frameId)
        setActiveFrameUrl(adminAssignedFrameId ? activeFrameUrl : (frame?.imageUrl || null))
      }
    } catch (err) {
      console.error('Select frame error:', err)
    } finally {
      setSavingFrame(false)
    }
  }

  // FalClub theme colors
  const bgColor = 'falclub-starry-bg'
  const cardBg = 'bg-gradient-to-br from-[#2d1145]/60 to-[#1a0a2e]/60 border-fuchsia-500/20'
  const labelColor = 'text-fuchsia-300'
  const inputBg = 'bg-[#1a0a2e]/60 border-fuchsia-500/30 focus:border-fuchsia-400'
  const accentIcon = 'text-fuchsia-400'
  const goldAccent = 'text-gold-500'
  const btnGradient = 'from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700'
  const zodiacBg = 'from-fuchsia-600/20 to-pink-600/20 border-fuchsia-500/30'
  const privacyCardBg = 'bg-gradient-to-br from-fuchsia-900/40 to-pink-900/30 border-fuchsia-500/30'
  const privacyActive = 'bg-fuchsia-600/30 border-fuchsia-500'
  const privacyInactive = 'bg-fuchsia-900/20 border-fuchsia-800 hover:border-fuchsia-600'

  // Click outside form area to go back
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger if clicking directly on the outermost container (not on any child)
    if (e.target === e.currentTarget) {
      router.back()
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 ${accentIcon} animate-spin`} />
      </div>
    )
  }

  const currentZodiac = ZODIAC_SIGNS.find(z => z.id === zodiacSign)

  return (
    <div className={`min-h-screen ${bgColor} pt-16 pb-28 px-4`} onClick={handleBackgroundClick}>
      <div className="max-w-2xl mx-auto" ref={containerRef}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <User className={`w-8 h-8 ${accentIcon}`} />
            {'Profil Ayarları'}
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-2xl border p-6 space-y-6 ${cardBg}`}>
          
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-4 border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-600 to-pink-600">
                {image ? (
                  <img loading="lazy" src={image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/70" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors bg-gold-500 hover:bg-gold-400">
                {uploadingImage ? <Loader2 className="w-4 h-4 text-black animate-spin" /> : <Camera className="w-4 h-4 text-black" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
            <p className={`${labelColor} text-sm`}>{'Profil resmini değiştir'}</p>
          </div>

          {/* Profile Frame Selection */}
          {availableFrames.length > 0 && (
            <div>
              <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                <Sparkles className="w-4 h-4" />
                {'Profil Çerçevesi'}
              </label>
              {adminAssignedFrameId && (
                <p className="text-xs text-yellow-400 mb-2">✨ Admin tarafından özel bir çerçeve atandı</p>
              )}
              <div className="flex flex-wrap gap-3">
                {/* No frame option */}
                <button
                  onClick={() => handleSelectFrame(null)}
                  disabled={savingFrame}
                  className={`relative w-16 h-16 rounded-xl border-2 transition-all flex items-center justify-center ${
                    !selectedFrameId ? 'border-fuchsia-500 bg-fuchsia-500/20' : 'border-fuchsia-800/30 hover:border-fuchsia-600/50 bg-[#1a0a2e]/40'
                  }`}
                >
                  <span className="text-xs text-fuchsia-300">Yok</span>
                  {!selectedFrameId && <div className="absolute -top-1 -right-1 w-4 h-4 bg-fuchsia-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                </button>
                {availableFrames.map(frame => (
                  <button
                    key={frame.id}
                    onClick={() => handleSelectFrame(frame.id)}
                    disabled={savingFrame}
                    className={`relative w-16 h-16 rounded-xl border-2 transition-all overflow-hidden ${
                      selectedFrameId === frame.id ? 'border-fuchsia-500 bg-fuchsia-500/20' : 'border-fuchsia-800/30 hover:border-fuchsia-600/50 bg-[#1a0a2e]/40'
                    }`}
                    title={frame.name}
                  >
                    <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                    {selectedFrameId === frame.id && <div className="absolute -top-1 -right-1 w-4 h-4 bg-fuchsia-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                  </button>
                ))}
              </div>
              {savingFrame && <p className="text-xs text-fuchsia-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Kaydediliyor...</p>}
              {membership !== 'gold' && availableFrames.some(f => f.tier === 'gold') && (
                <p className="text-xs text-yellow-400/70 mt-2">💎 Gold üyelik ile daha fazla çerçeveye erişebilirsiniz</p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <User className="w-4 h-4" />
              {'Ad Soyad'}
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`} />
          </div>

          {/* Username */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <AtSign className="w-4 h-4" />
              {'Kullanıcı Adı'}
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${labelColor}`}>@</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={'kullanici_adi'}
                className={`w-full text-white rounded-lg pl-8 pr-4 py-3 border focus:outline-none ${inputBg}`} />
            </div>
            <p className={`${labelColor} opacity-60 text-xs mt-1`}>{'3-20 karakter, harf, rakam ve alt çizgi'}</p>
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <Mail className="w-4 h-4" />
              {'Email Adresi'}
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`} />
          </div>

          {/* Phone */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <Phone className="w-4 h-4" />
              {'Telefon Numarası (opsiyonel)'}
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
              className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`} />
          </div>

          <div className="border-t pt-6 border-fuchsia-500/20">
            <h3 className={`text-lg font-semibold text-white mb-4 flex items-center gap-2`}>
              <Sparkles className={`w-5 h-5 ${goldAccent}`} />
              {'Fal Bilgileri'}
            </h3>

            {/* Birth Date */}
            <div className="mb-4">
              <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                <Calendar className="w-4 h-4" />
                {'Doğum Tarihi'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select value={birthDate ? new Date(birthDate).getDate() : ''}
                  onChange={(e) => {
                    const day = e.target.value
                    if (!day) { setBirthDate(''); return }
                    const currentDate = birthDate ? new Date(birthDate) : new Date(2000, 0, 1)
                    currentDate.setDate(parseInt(day))
                    setBirthDate(currentDate.toISOString().split('T')[0])
                  }}
                  className={`text-white rounded-lg px-3 py-3 border focus:outline-none text-center ${inputBg}`}>
                  <option value="">{'Gün'}</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={birthDate ? new Date(birthDate).getMonth() : ''}
                  onChange={(e) => {
                    const month = e.target.value
                    if (month === '') { setBirthDate(''); return }
                    const currentDate = birthDate ? new Date(birthDate) : new Date(2000, 0, 1)
                    currentDate.setMonth(parseInt(month))
                    setBirthDate(currentDate.toISOString().split('T')[0])
                  }}
                  className={`text-white rounded-lg px-3 py-3 border focus:outline-none text-center ${inputBg}`}>
                  <option value="">{'Ay'}</option>
                  {(['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
                  ).map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={birthDate ? new Date(birthDate).getFullYear() : ''}
                  onChange={(e) => {
                    const year = e.target.value
                    if (!year) { setBirthDate(''); return }
                    const currentDate = birthDate ? new Date(birthDate) : new Date(2000, 0, 1)
                    currentDate.setFullYear(parseInt(year))
                    setBirthDate(currentDate.toISOString().split('T')[0])
                  }}
                  className={`text-white rounded-lg px-3 py-3 border focus:outline-none text-center ${inputBg}`}>
                  <option value="">{'Yıl'}</option>
                  {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Birth Time */}
            <div className="mb-4">
              <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                <Clock className="w-4 h-4" />
                {'Doğum Saati (opsiyonel)'}
              </label>
              <select value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`}>
                <option value="">{'Bilmiyorum'}</option>
                {Array.from({length: 24}, (_, i) => {
                  const hour = i.toString().padStart(2, '0')
                  return <option key={i} value={`${hour}:00`}>{`${hour}:00`}</option>
                })}
              </select>
            </div>

            {/* Zodiac Sign (auto-calculated) */}
            {zodiacSign && currentZodiac && (
              <div className={`p-4 bg-gradient-to-r ${zodiacBg} rounded-xl border mb-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{currentZodiac.emoji}</span>
                  <div>
                    <p className="text-white font-semibold">
                      {'Burçunuz'}: {currentZodiac[language as 'tr' | 'en']}
                    </p>
                    <p className={`${labelColor} text-sm`}>
                      {'Doğum tarihinize göre otomatik hesaplandı'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rising Sign (manual) */}
            {birthTime && (
              <div className="mb-4">
                <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                  <Moon className="w-4 h-4" />
                  {'Yükselen Burç'}
                </label>
                <select value={risingSign} onChange={(e) => setRisingSign(e.target.value)}
                  className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`}>
                  <option value="">{'Seçiniz...'}</option>
                  {ZODIAC_SIGNS.map(sign => (
                    <option key={sign.id} value={sign.id}>{sign.emoji} {sign[language as 'tr' | 'en']}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Favorite Team */}
            <div>
              <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                <Heart className="w-4 h-4" />
                {'Tuttuğunuz Takım'}
              </label>
              <select value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value)}
                className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`}>
                <option value="">{'Seçiniz...'}</option>
                {FOOTBALL_TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>
          </div>

          {/* Privacy Settings Section */}
          <div className={`rounded-2xl p-6 space-y-4 border ${privacyCardBg}`}>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className={`w-5 h-5 ${accentIcon}`} />
              {'Gizlilik Ayarları'}
            </h3>

            <div>
              <label className={`block text-sm ${labelColor} mb-3`}>
                {'Kimler bana mesaj gönderebilir?'}
              </label>
              <div className="space-y-2">
                <button type="button" onClick={() => setMessagePrivacy('everyone')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    messagePrivacy === 'everyone' ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
                  }`}>
                  <Globe className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{'Herkes'}</p>
                    <p className="text-xs opacity-70">{'Tüm kullanıcılar size mesaj gönderebilir'}</p>
                  </div>
                  {messagePrivacy === 'everyone' && <Check className="w-5 h-5 text-green-400" />}
                </button>

                <button type="button" onClick={() => setMessagePrivacy('followers')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    messagePrivacy === 'followers' ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
                  }`}>
                  <Users className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{'Takipçilerim'}</p>
                    <p className="text-xs opacity-70">{'Sadece sizi takip edenler mesaj gönderebilir'}</p>
                  </div>
                  {messagePrivacy === 'followers' && <Check className="w-5 h-5 text-green-400" />}
                </button>

                <button type="button" onClick={() => setMessagePrivacy('nobody')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    messagePrivacy === 'nobody' ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
                  }`}>
                  <Lock className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{'Hiç Kimse'}</p>
                    <p className="text-xs opacity-70">{'Mesaj almayı tamamen kapatın'}</p>
                  </div>
                  {messagePrivacy === 'nobody' && <Check className="w-5 h-5 text-green-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Profile View Privacy */}
          <div className={`rounded-2xl p-6 space-y-4 border ${privacyCardBg}`}>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className={`w-5 h-5 ${accentIcon}`} />
              {'Profil Görüntüleme Gizliliği'}
            </h3>
            <button
              type="button"
              onClick={() => setHideProfileViews(!hideProfileViews)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                hideProfileViews ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
              }`}
            >
              <EyeOff className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p className="font-medium">{'Gizli Gezinme Modu'}</p>
                <p className="text-xs opacity-70">{'Açıldığında: başkalarının profilini ziyaret ettiğinizde görünmezsiniz ve karşı tarafa bildirim gitmez'}</p>
              </div>
              <div className={`w-12 h-7 rounded-full transition-all flex items-center ${hideProfileViews ? 'bg-fuchsia-500 justify-end' : 'bg-gray-600 justify-start'}`}>
                <div className="w-5 h-5 bg-white rounded-full mx-1 shadow-md" />
              </div>
            </button>
          </div>

          {/* Blocked Users Section */}
          <div className={`rounded-2xl p-6 space-y-4 border ${privacyCardBg}`}>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Ban className={`w-5 h-5 ${accentIcon}`} />
              {'Engellenen Kullanıcılar'}
            </h3>

            {loadingBlocked ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
              </div>
            ) : (blockedUsers.chatBans.length === 0 && blockedUsers.streamBans.length === 0) ? (
              <p className={`text-sm ${labelColor}`}>
                {'Henüz kimseyi engellemediniz.'}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Chat Room Bans */}
                {blockedUsers.chatBans.length > 0 && (
                  <div>
                    <p className={`text-xs ${labelColor} mb-2 flex items-center gap-1`}>
                      <MessageCircle className="w-3 h-3" />
                      {'Sohbet Odalarından'}
                    </p>
                    {blockedUsers.chatBans.map(ban => (
                      <div key={ban.id} className={`flex items-center justify-between p-3 rounded-xl ${privacyInactive} mb-2`}>
                        <div className="flex items-center gap-3">
                          {ban.userImage ? (
                            <img loading="lazy" src={ban.userImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-fuchsia-600/30 flex items-center justify-center">
                              <UserX className="w-5 h-5 text-fuchsia-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium text-sm">
                              {ban.userName || ban.userUsername || 'Kullanıcı'}
                            </p>
                            <p className={`text-xs ${labelColor}`}>
                              {'Oda'}: {ban.roomName}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblock('chat', ban.id)}
                          disabled={unblocking === ban.id}
                          className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-white rounded-lg text-sm flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {unblocking === ban.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              {'Kaldır'}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stream Bans */}
                {blockedUsers.streamBans.length > 0 && (
                  <div>
                    <p className={`text-xs ${labelColor} mb-2 flex items-center gap-1`}>
                      <Video className="w-3 h-3" />
                      {'Canlı Yayınlardan'}
                    </p>
                    {blockedUsers.streamBans.map(ban => (
                      <div key={ban.id} className={`flex items-center justify-between p-3 rounded-xl ${privacyInactive} mb-2`}>
                        <div className="flex items-center gap-3">
                          {ban.userImage ? (
                            <img loading="lazy" src={ban.userImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-fuchsia-600/30 flex items-center justify-center">
                              <UserX className="w-5 h-5 text-fuchsia-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium text-sm">
                              {ban.userName || ban.userUsername || 'Kullanıcı'}
                            </p>
                            <p className={`text-xs ${labelColor}`}>
                              {'Yayın'}: {ban.streamTitle}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblock('stream', ban.id)}
                          disabled={unblocking === ban.id}
                          className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-white rounded-lg text-sm flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {unblocking === ban.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              {'Kaldır'}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3 bg-gradient-to-r ${btnGradient} text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50`}>
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <><Check className="w-5 h-5" />{'Kaydedildi!'}</>
            ) : (
              <><Save className="w-5 h-5" />{'Kaydet'}</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
