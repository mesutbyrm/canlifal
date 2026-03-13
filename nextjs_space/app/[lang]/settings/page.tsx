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
  Globe
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

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    fetchProfile()
  }, [session, status, language])

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
      }
    } catch (err) {
      console.error('Fetch profile error:', err)
    } finally {
      setLoading(false)
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
        const { url } = await urlRes.json()
        setImage(url)
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert(language === 'tr' ? 'Yükleme başarısız oldu' : 'Upload failed')
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
          messagePrivacy
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
          setError(language === 'tr' ? 'Bu kullanıcı adı zaten kullanılıyor' : 'This username is already taken')
        } else if (data.error === 'username_invalid') {
          setError(language === 'tr' ? 'Kullanıcı adı 3-20 karakter, sadece harf, rakam ve alt çizgi içerebilir' : 'Username must be 3-20 characters, letters, numbers and underscore only')
        } else if (data.error === 'email_taken') {
          setError(language === 'tr' ? 'Bu email adresi zaten kullanılıyor' : 'This email is already taken')
        } else if (data.error === 'email_invalid') {
          setError(language === 'tr' ? 'Geçerli bir email adresi girin' : 'Enter a valid email address')
        } else {
          setError(data.message || 'Kaydetme hatası')
        }
      }
    } catch (err) {
      console.error('Save error:', err)
      setError(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred')
    } finally {
      setSaving(false)
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
            {language === 'tr' ? 'Profil Ayarları' : 'Profile Settings'}
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-2xl border p-6 space-y-6 ${cardBg}`}>
          
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-4 border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-600 to-pink-600">
                {image ? (
                  <img src={image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/70" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors bg-gold-500 hover:bg-gold-400">
                {uploadingImage ? <Loader2 className="w-4 h-4 text-black animate-spin" /> : <Camera className="w-4 h-4 text-black" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
            <p className={`${labelColor} text-sm`}>{language === 'tr' ? 'Profil resmini değiştir' : 'Change profile picture'}</p>
          </div>

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
              {language === 'tr' ? 'Ad Soyad' : 'Full Name'}
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`} />
          </div>

          {/* Username */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <AtSign className="w-4 h-4" />
              {language === 'tr' ? 'Kullanıcı Adı' : 'Username'}
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${labelColor}`}>@</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={language === 'tr' ? 'kullanici_adi' : 'your_username'}
                className={`w-full text-white rounded-lg pl-8 pr-4 py-3 border focus:outline-none ${inputBg}`} />
            </div>
            <p className={`${labelColor} opacity-60 text-xs mt-1`}>{language === 'tr' ? '3-20 karakter, harf, rakam ve alt çizgi' : '3-20 chars, letters, numbers, underscore'}</p>
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <Mail className="w-4 h-4" />
              {language === 'tr' ? 'Email Adresi' : 'Email Address'}
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`} />
          </div>

          {/* Phone */}
          <div>
            <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
              <Phone className="w-4 h-4" />
              {language === 'tr' ? 'Telefon Numarası (opsiyonel)' : 'Phone Number (optional)'}
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
              className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`} />
          </div>

          <div className="border-t pt-6 border-fuchsia-500/20">
            <h3 className={`text-lg font-semibold text-white mb-4 flex items-center gap-2`}>
              <Sparkles className={`w-5 h-5 ${goldAccent}`} />
              {language === 'tr' ? 'Fal Bilgileri' : 'Fortune Details'}
            </h3>

            {/* Birth Date */}
            <div className="mb-4">
              <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                <Calendar className="w-4 h-4" />
                {language === 'tr' ? 'Doğum Tarihi' : 'Birth Date'}
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
                  <option value="">{language === 'tr' ? 'Gün' : 'Day'}</option>
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
                  <option value="">{language === 'tr' ? 'Ay' : 'Month'}</option>
                  {(language === 'tr' 
                    ? ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
                    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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
                  <option value="">{language === 'tr' ? 'Yıl' : 'Year'}</option>
                  {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Birth Time */}
            <div className="mb-4">
              <label className={`block text-sm ${labelColor} mb-2 flex items-center gap-2`}>
                <Clock className="w-4 h-4" />
                {language === 'tr' ? 'Doğum Saati (opsiyonel)' : 'Birth Time (optional)'}
              </label>
              <select value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`}>
                <option value="">{language === 'tr' ? 'Bilmiyorum' : "Don't know"}</option>
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
                      {language === 'tr' ? 'Burçunuz' : 'Your Zodiac'}: {currentZodiac[language as 'tr' | 'en']}
                    </p>
                    <p className={`${labelColor} text-sm`}>
                      {language === 'tr' ? 'Doğum tarihinize göre otomatik hesaplandı' : 'Auto-calculated from your birth date'}
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
                  {language === 'tr' ? 'Yükselen Burç' : 'Rising Sign'}
                </label>
                <select value={risingSign} onChange={(e) => setRisingSign(e.target.value)}
                  className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`}>
                  <option value="">{language === 'tr' ? 'Seçiniz...' : 'Select...'}</option>
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
                {language === 'tr' ? 'Tuttuğunuz Takım' : 'Favorite Team'}
              </label>
              <select value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value)}
                className={`w-full text-white rounded-lg px-4 py-3 border focus:outline-none ${inputBg}`}>
                <option value="">{language === 'tr' ? 'Seçiniz...' : 'Select...'}</option>
                {FOOTBALL_TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>
          </div>

          {/* Privacy Settings Section */}
          <div className={`rounded-2xl p-6 space-y-4 border ${privacyCardBg}`}>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className={`w-5 h-5 ${accentIcon}`} />
              {language === 'tr' ? 'Gizlilik Ayarları' : 'Privacy Settings'}
            </h3>

            <div>
              <label className={`block text-sm ${labelColor} mb-3`}>
                {language === 'tr' ? 'Kimler bana mesaj gönderebilir?' : 'Who can send me messages?'}
              </label>
              <div className="space-y-2">
                <button type="button" onClick={() => setMessagePrivacy('everyone')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    messagePrivacy === 'everyone' ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
                  }`}>
                  <Globe className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{language === 'tr' ? 'Herkes' : 'Everyone'}</p>
                    <p className="text-xs opacity-70">{language === 'tr' ? 'Tüm kullanıcılar size mesaj gönderebilir' : 'All users can message you'}</p>
                  </div>
                  {messagePrivacy === 'everyone' && <Check className="w-5 h-5 text-green-400" />}
                </button>

                <button type="button" onClick={() => setMessagePrivacy('followers')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    messagePrivacy === 'followers' ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
                  }`}>
                  <Users className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{language === 'tr' ? 'Takipçilerim' : 'Followers Only'}</p>
                    <p className="text-xs opacity-70">{language === 'tr' ? 'Sadece sizi takip edenler mesaj gönderebilir' : 'Only your followers can message you'}</p>
                  </div>
                  {messagePrivacy === 'followers' && <Check className="w-5 h-5 text-green-400" />}
                </button>

                <button type="button" onClick={() => setMessagePrivacy('nobody')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    messagePrivacy === 'nobody' ? `${privacyActive} text-white` : `${privacyInactive} ${labelColor}`
                  }`}>
                  <Lock className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{language === 'tr' ? 'Hiç Kimse' : 'Nobody'}</p>
                    <p className="text-xs opacity-70">{language === 'tr' ? 'Mesaj almayı tamamen kapatın' : 'Disable messaging completely'}</p>
                  </div>
                  {messagePrivacy === 'nobody' && <Check className="w-5 h-5 text-green-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3 bg-gradient-to-r ${btnGradient} text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50`}>
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <><Check className="w-5 h-5" />{language === 'tr' ? 'Kaydedildi!' : 'Saved!'}</>
            ) : (
              <><Save className="w-5 h-5" />{language === 'tr' ? 'Kaydet' : 'Save'}</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
