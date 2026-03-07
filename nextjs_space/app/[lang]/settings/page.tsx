'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
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
  Moon
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [favoriteTeam, setFavoriteTeam] = useState('')
  const [zodiacSign, setZodiacSign] = useState('')
  const [risingSign, setRisingSign] = useState('')

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
        setImage(data.image || '')
        setBirthDate(data.birthDate ? data.birthDate.split('T')[0] : '')
        setBirthTime(data.birthTime || '')
        setFavoriteTeam(data.favoriteTeam || '')
        setZodiacSign(data.zodiacSign || '')
        setRisingSign(data.risingSign || '')
      }
    } catch (err) {
      console.error('Fetch profile error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate zodiac sign from birth date
  const calculateZodiacSign = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()

    for (const sign of ZODIAC_SIGNS) {
      const [startMonth, startDay] = sign.dates.start
      const [endMonth, endDay] = sign.dates.end

      if (startMonth === endMonth) {
        if (month === startMonth && day >= startDay && day <= endDay) {
          return sign.id
        }
      } else if (startMonth > endMonth) {
        // Capricorn case: Dec 22 - Jan 19
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
          return sign.id
        }
      } else {
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
          return sign.id
        }
      }
    }
    return ''
  }

  // Auto-calculate zodiac when birth date changes
  useEffect(() => {
    if (birthDate) {
      const sign = calculateZodiacSign(birthDate)
      setZodiacSign(sign)
    }
  }, [birthDate])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalıdır' : 'File size must be less than 5MB')
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

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, cloud_storage_path } = await presignedRes.json()

      // Check if Content-Disposition is in signed headers
      const url = new URL(uploadUrl)
      const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') || ''
      const headers: Record<string, string> = { 'Content-Type': file.type }
      
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment'
      }

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file
      })

      if (!uploadRes.ok) throw new Error('Failed to upload file')

      // Get public URL
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
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          image,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
          favoriteTeam: favoriteTeam || null,
          zodiacSign: zodiacSign || null,
          risingSign: risingSign || null
        })
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  const currentZodiac = ZODIAC_SIGNS.find(z => z.id === zodiacSign)

  return (
    <div className="min-h-screen bg-[#0a0118] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/${language}/dashboard`}
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === 'tr' ? 'Panelim' : 'Dashboard'}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <User className="w-8 h-8 text-purple-400" />
            {language === 'tr' ? 'Profil Ayarları' : 'Profile Settings'}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-2xl border border-purple-500/20 p-6 space-y-6"
        >
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden border-4 border-purple-500/30">
                {image ? (
                  <img src={image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/70" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-gold-400 transition-colors">
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 text-black animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-black" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
            <p className="text-purple-300 text-sm">
              {language === 'tr' ? 'Profil resmini değiştir' : 'Change profile picture'}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-purple-300 mb-2">
              {language === 'tr' ? 'İsim' : 'Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-deep-purple-900/50 text-white rounded-lg px-4 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none"
            />
          </div>

          {/* Birth Date - Simplified with dropdowns */}
          <div>
            <label className="block text-sm text-purple-300 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {language === 'tr' ? 'Doğum Tarihi' : 'Birth Date'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={birthDate ? new Date(birthDate).getDate() : ''}
                onChange={(e) => {
                  const day = e.target.value
                  if (!day) { setBirthDate(''); return }
                  const currentDate = birthDate ? new Date(birthDate) : new Date(2000, 0, 1)
                  currentDate.setDate(parseInt(day))
                  setBirthDate(currentDate.toISOString().split('T')[0])
                }}
                className="bg-deep-purple-900/50 text-white rounded-lg px-3 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none text-center"
              >
                <option value="">{language === 'tr' ? 'Gün' : 'Day'}</option>
                {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={birthDate ? new Date(birthDate).getMonth() : ''}
                onChange={(e) => {
                  const month = e.target.value
                  if (month === '') { setBirthDate(''); return }
                  const currentDate = birthDate ? new Date(birthDate) : new Date(2000, 0, 1)
                  currentDate.setMonth(parseInt(month))
                  setBirthDate(currentDate.toISOString().split('T')[0])
                }}
                className="bg-deep-purple-900/50 text-white rounded-lg px-3 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none text-center"
              >
                <option value="">{language === 'tr' ? 'Ay' : 'Month'}</option>
                {(language === 'tr' 
                  ? ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
                  : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                ).map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={birthDate ? new Date(birthDate).getFullYear() : ''}
                onChange={(e) => {
                  const year = e.target.value
                  if (!year) { setBirthDate(''); return }
                  const currentDate = birthDate ? new Date(birthDate) : new Date(2000, 0, 1)
                  currentDate.setFullYear(parseInt(year))
                  setBirthDate(currentDate.toISOString().split('T')[0])
                }}
                className="bg-deep-purple-900/50 text-white rounded-lg px-3 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none text-center"
              >
                <option value="">{language === 'tr' ? 'Yıl' : 'Year'}</option>
                {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Birth Time - Optional simple dropdown */}
          <div>
            <label className="block text-sm text-purple-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {language === 'tr' ? 'Doğum Saati (opsiyonel)' : 'Birth Time (optional)'}
            </label>
            <select
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full bg-deep-purple-900/50 text-white rounded-lg px-4 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none"
            >
              <option value="">{language === 'tr' ? 'Bilmiyorum' : "Don't know"}</option>
              {Array.from({length: 24}, (_, i) => {
                const hour = i.toString().padStart(2, '0')
                return (
                  <option key={i} value={`${hour}:00`}>{`${hour}:00`}</option>
                )
              })}
            </select>
          </div>

          {/* Zodiac Sign (auto-calculated) */}
          {zodiacSign && currentZodiac && (
            <div className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{currentZodiac.emoji}</span>
                <div>
                  <p className="text-white font-semibold">
                    {language === 'tr' ? 'Burçunuz' : 'Your Zodiac'}: {currentZodiac[language as 'tr' | 'en']}
                  </p>
                  <p className="text-purple-300 text-sm">
                    {language === 'tr' ? 'Doğum tarihinize göre otomatik hesaplandı' : 'Auto-calculated from your birth date'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rising Sign (manual) */}
          {birthTime && (
            <div>
              <label className="block text-sm text-purple-300 mb-2 flex items-center gap-2">
                <Moon className="w-4 h-4" />
                {language === 'tr' ? 'Yüselen Burç' : 'Rising Sign'}
              </label>
              <select
                value={risingSign}
                onChange={(e) => setRisingSign(e.target.value)}
                className="w-full bg-deep-purple-900/50 text-white rounded-lg px-4 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none"
              >
                <option value="">{language === 'tr' ? 'Seçiniz...' : 'Select...'}</option>
                {ZODIAC_SIGNS.map(sign => (
                  <option key={sign.id} value={sign.id}>
                    {sign.emoji} {sign[language as 'tr' | 'en']}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Favorite Team */}
          <div>
            <label className="block text-sm text-purple-300 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              {language === 'tr' ? 'Tuttuğunuz Takım' : 'Favorite Team'}
            </label>
            <select
              value={favoriteTeam}
              onChange={(e) => setFavoriteTeam(e.target.value)}
              className="w-full bg-deep-purple-900/50 text-white rounded-lg px-4 py-3 border border-purple-500/30 focus:border-gold-500 focus:outline-none"
            >
              <option value="">{language === 'tr' ? 'Seçiniz...' : 'Select...'}</option>
              {FOOTBALL_TEAMS.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-5 h-5" />
                {language === 'tr' ? 'Kaydedildi!' : 'Saved!'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {language === 'tr' ? 'Kaydet' : 'Save'}
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
