'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { getMediaConstraints } from '@/lib/webrtc-config'
import {
  BEAUTY_PRESETS,
  DEFAULT_BEAUTY_SETTINGS,
  type AgoraBeautySettings,
} from '@/lib/agora-client'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Sparkles,
  Radio,
  X,
  ChevronLeft,
  Sun,
  Droplet,
  Loader2,
  Coffee,
  Moon,
  Heart,
  Star,
  Music,
  MessageCircle,
  Users,
  Flame,
  Check,
} from 'lucide-react'

interface StreamCategory {
  id: string
  name: string
  nameEn: string
  icon: string
  color: string
}

const FORTUNE_TYPES: StreamCategory[] = [
  { id: 'coffee', name: 'Kahve Falı', nameEn: 'Coffee Reading', icon: '☕', color: 'from-amber-600 to-yellow-700' },
  { id: 'tarot', name: 'Tarot Falı', nameEn: 'Tarot Reading', icon: '🎴', color: 'from-purple-600 to-indigo-700' },
  { id: 'astrology', name: 'Burç Yorumu', nameEn: 'Astrology', icon: '⭐', color: 'from-blue-600 to-cyan-700' },
  { id: 'palm', name: 'El Falı', nameEn: 'Palm Reading', icon: '🖐️', color: 'from-pink-600 to-rose-700' },
  { id: 'dream', name: 'Rüya Yorumu', nameEn: 'Dream Reading', icon: '🌙', color: 'from-indigo-600 to-purple-700' },
  { id: 'love', name: 'Aşk Falı', nameEn: 'Love Fortune', icon: '💕', color: 'from-red-500 to-pink-600' },
  { id: 'katina', name: 'Katina Falı', nameEn: 'Katina Cards', icon: '🃏', color: 'from-emerald-600 to-teal-700' },
  { id: 'numerology', name: 'Numeroloji', nameEn: 'Numerology', icon: '🔢', color: 'from-orange-600 to-amber-700' },
]

const OTHER_CATEGORIES: StreamCategory[] = [
  { id: 'chat', name: 'Sohbet', nameEn: 'Chat', icon: '💬', color: 'from-green-500 to-emerald-600' },
  { id: 'music', name: 'Müzik', nameEn: 'Music', icon: '🎵', color: 'from-violet-500 to-purple-600' },
  { id: 'hangout', name: 'Muhabbet', nameEn: 'Hangout', icon: '🎭', color: 'from-cyan-500 to-blue-600' },
]

export default function StreamSetupPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()

  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [streamTitle, setStreamTitle] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [showEffects, setShowEffects] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory | null>(null)
  const [beautySettings, setBeautySettings] = useState<AgoraBeautySettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('agoraBeautySettings')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return DEFAULT_BEAUTY_SETTINGS
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [tellerStatus, setTellerStatus] = useState<'loading' | 'approved' | 'pending' | 'rejected' | 'not_applied' | 'restricted'>('loading')

  // Check if user is an approved live fortune teller
  useEffect(() => {
    const checkTellerStatus = async () => {
      if (!session?.user) return
      
      try {
        const res = await fetch('/api/fortune-tellers/my-profile')
        if (res.status === 404) {
          // No teller profile, redirect to apply page
          setTellerStatus('not_applied')
          return
        }
        if (res.ok) {
          const teller = await res.json()
          if (teller.isBanned || teller.isFrozen || !teller.isActive) {
            setTellerStatus('restricted')
          } else if (teller.applicationStatus === 'approved') {
            setTellerStatus('approved')
          } else if (teller.applicationStatus === 'pending') {
            setTellerStatus('pending')
          } else {
            setTellerStatus('rejected')
          }
        }
      } catch (error) {
        console.error('Error checking teller status:', error)
        setTellerStatus('not_applied')
      }
    }

    if (session?.user) {
      checkTellerStatus()
    }
  }, [session])

  useEffect(() => {
    if (!session?.user) {
      router.push(`/giris`)
      return
    }
    // Only start camera if teller is approved
    if (tellerStatus === 'approved') {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [session, tellerStatus])

  useEffect(() => {
    if (streamRef.current && videoRef.current && isVideoReady) {
      applyBeautyFilter()
    }
  }, [beautySettings, isVideoOn, isVideoReady])

  // Save beauty settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('agoraBeautySettings', JSON.stringify(beautySettings))
  }, [beautySettings])

  const handleVideoLoaded = () => {
    setIsVideoReady(true)
    if (videoRef.current) {
      videoRef.current.play().catch(console.error)
    }
    applyBeautyFilter()
  }

  const startCamera = async () => {
    try {
      const constraints = getMediaConstraints('high', facingMode)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch {
        stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints('medium', facingMode))
      }
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Listen for video to be ready
        videoRef.current.onloadedmetadata = handleVideoLoaded
      }
    } catch (error) {
      console.error('Camera error:', error)
      alert('Kamera erişimi sağlanamadı')
    }
  }

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
  }

  const applyBeautyFilter = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isVideoOn) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      if (!video || !canvas || !ctx || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      canvas.width = video.videoWidth || 720
      canvas.height = video.videoHeight || 1280

      // Mirror for front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Reset transform
      if (facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }

      // Apply beauty filters using CSS filters on canvas (preview of Agora effects)
      const { smoothnessLevel, lighteningLevel, rednessLevel, lighteningContrastLevel, enabled } = beautySettings
      
      if (enabled) {
        // Map Agora settings to canvas filter approximations
        let filterString = ''
        filterString += `brightness(${1 + lighteningLevel * 0.4}) `
        const contrastBoost = lighteningContrastLevel === 0 ? -0.1 : lighteningContrastLevel === 2 ? 0.15 : 0
        filterString += `contrast(${1 + contrastBoost}) `
        // Redness mapped to a slight warm saturate
        filterString += `saturate(${1 + rednessLevel * 0.3}) `
        
        // Apply smoothness using blur
        if (smoothnessLevel > 0) {
          const blurAmount = smoothnessLevel * 1.5
          filterString += `blur(${blurAmount}px)`
          
          ctx.filter = filterString
          ctx.globalAlpha = smoothnessLevel * 0.4
          ctx.drawImage(canvas, 0, 0)
          ctx.globalAlpha = 1
          ctx.filter = 'none'
        } else {
          ctx.filter = filterString
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          ctx.filter = 'none'
        }
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(render)
  }

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    setIsVideoReady(false)
    stopCamera()
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints('high', newFacing))
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = handleVideoLoaded
      }
    } catch (e) {
      console.error('Switch camera error:', e)
    }
  }

  const toggleVideo = () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsVideoOn(track.enabled)
    }
  }

  const toggleAudio = () => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsAudioOn(track.enabled)
    }
  }

  const handleStartStream = async () => {
    if (!selectedCategory) {
      setShowCategorySelector(true)
      return
    }
    
    setIsStarting(true)
    
    // Store beauty settings in localStorage for broadcast page (Agora format)
    localStorage.setItem('agoraBeautySettings', JSON.stringify(beautySettings))
    localStorage.setItem('streamCategory', JSON.stringify(selectedCategory))
    
    try {
      const res = await fetch('/api/video-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: streamTitle || null,
          category: selectedCategory.id
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        stopCamera()
        router.push(`/sohbet/video/broadcast/${data.id}`)
      } else {
        try {
          const errData = await res.json()
          if (errData.error === 'COOLDOWN_ACTIVE' && errData.remainingMinutes) {
            alert(`Yayın bekleme süresi aktif. ${errData.remainingMinutes} dakika sonra tekrar yayın açabilirsiniz.`)
          } else {
            alert(errData.message || 'Yayın oluşturulamadı.')
          }
        } catch {
          alert('Yayın oluşturulamadı.')
        }
        setIsStarting(false)
      }
    } catch (error) {
      console.error('Error creating stream:', error)
      alert('Yayın başlatılırken bir hata oluştu.')
      setIsStarting(false)
    }
  }

  const updateBeauty = (partial: Partial<AgoraBeautySettings>) => {
    setBeautySettings(prev => ({ ...prev, ...partial }))
  }

  const applyPreset = (idx: number) => {
    const preset = BEAUTY_PRESETS[idx]
    if (!preset) return
    setBeautySettings({
      enabled: idx > 0,
      ...preset.settings,
    })
  }

  const SliderControl = ({ 
    icon: Icon, 
    label, 
    value, 
    min, 
    max, 
    onChange,
    colorFrom = 'from-purple-500',
    colorTo = 'to-pink-500',
  }: { 
    icon: any
    label: string
    value: number
    min: number
    max: number
    onChange: (v: number) => void
    colorFrom?: string
    colorTo?: string
  }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <span className="text-white/60 text-xs">{value > 0 ? `+${value}` : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
          [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
          [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-purple-500 [&::-moz-range-thumb]:to-pink-500 
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0"
      />
    </div>
  )

  // Show loading state while checking teller status
  if (tellerStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0118] to-[#1a0a2e] z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">{'Kontrol ediliyor...'}</p>
        </div>
      </div>
    )
  }

  // Show message for non-approved users
  if (tellerStatus !== 'approved') {
    const getMessage = () => {
      switch (tellerStatus) {
        case 'not_applied':
          return {
            title: 'Canlı Falcı Ol',
            message: 'Canlı yayın açabilmek için önce canlı falcı başvurusu yapmanız gerekmektedir.',
            buttonText: 'Başvuru Yap',
            buttonLink: `/canli-falcilar/apply`,
            icon: '✨'
          }
        case 'pending':
          return {
            title: 'Başvurunuz İnceleniyor',
            message: 'Canlı falcı başvurunuz henüz onaylanmadı. Onaylandıktan sonra yayın açabilirsiniz.',
            buttonText: 'Ana Sayfaya Dön',
            buttonLink: `/`,
            icon: '⏳'
          }
        case 'rejected':
          return {
            title: 'Başvurunuz Reddedildi',
            message: 'Canlı falcı başvurunuz reddedildi. Yeni bir başvuru yapabilirsiniz.',
            buttonText: 'Tekrar Başvur',
            buttonLink: `/canli-falcilar/apply`,
            icon: '❌'
          }
        case 'restricted':
          return {
            title: 'Hesabınız Kısıtlandı',
            message: 'Canlı falcı hesabınız şu anda kısıtlanmış durumda. Destek ile iletişime geçin.',
            buttonText: 'Ana Sayfaya Dön',
            buttonLink: `/`,
            icon: '🚫'
          }
        default:
          return {
            title: 'Hata',
            message: 'Bir hata oluştu.',
            buttonText: 'Ana Sayfaya Dön',
            buttonLink: `/`,
            icon: '⚠️'
          }
      }
    }

    const msg = getMessage()

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0118] to-[#1a0a2e] z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a0a2e]/80 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full text-center border border-purple-500/20"
        >
          <div className="text-6xl mb-6">{msg.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-4">{msg.title}</h2>
          <p className="text-white/70 mb-8 leading-relaxed">{msg.message}</p>
          <button
            onClick={() => router.push(msg.buttonLink)}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            {msg.buttonText}
          </button>
          <button
            onClick={() => router.back()}
            className="mt-4 text-white/50 hover:text-white/80 transition-colors"
          >
            {'Geri Dön'}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white"
          >
            <ChevronLeft className="w-6 h-6" />
            <span>{'Geri'}</span>
          </button>
          <h1 className="text-white font-semibold">
            {'Yayın Hazırlığı'}
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Camera Preview */}
      <div className="flex-1 relative">
        {/* Hidden video element for source */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        
        {/* Canvas with effects */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />

        {!isVideoOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <VideoOff className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">
                {'Kamera kapalı'}
              </p>
            </div>
          </div>
        )}


      </div>

      {/* Beauty Effects Panel - Compact overlay at bottom, camera stays visible */}
      <AnimatePresence>
        {showEffects && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 inset-x-0 z-30"
          >
            {/* Semi-transparent panel - max 38% height so camera preview (top 62%) stays visible */}
            <div className="bg-black/60 backdrop-blur-md rounded-t-3xl overflow-hidden" style={{ maxHeight: '38vh' }}>
              {/* Drag Handle + Header */}
              <div className="flex flex-col items-center pt-2 pb-1">
                <div className="w-10 h-1 bg-white/30 rounded-full mb-2" />
                <div className="flex items-center justify-between w-full px-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span className="text-white font-semibold text-sm">Efektler</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateBeauty({ enabled: !beautySettings.enabled })}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        beautySettings.enabled
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white/15 text-white/50'
                      }`}
                    >
                      {beautySettings.enabled ? 'AÇIK' : 'KAPALI'}
                    </button>
                    <button onClick={() => setShowEffects(false)} className="text-white/60 p-0.5">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable compact content */}
              <div className="overflow-y-auto px-4 pb-3" style={{ maxHeight: 'calc(38vh - 60px)' }}>
                {/* Preset Buttons - Horizontal Scroll */}
                <div className="mb-3">
                  <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                    {BEAUTY_PRESETS.map((preset, idx) => {
                      const isActive = beautySettings.enabled
                        ? (beautySettings.smoothnessLevel === preset.settings.smoothnessLevel &&
                           beautySettings.lighteningLevel === preset.settings.lighteningLevel &&
                           beautySettings.rednessLevel === preset.settings.rednessLevel)
                        : idx === 0
                      return (
                        <button
                          key={idx}
                          onClick={() => applyPreset(idx)}
                          className={`flex-shrink-0 px-3 py-1.5 text-white text-xs rounded-full whitespace-nowrap transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {preset.icon} {preset.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Compact Sliders */}
                <div className="space-y-2.5">
                  <SliderControl
                    icon={Droplet}
                    label={'Pürüzsüzlük'}
                    value={Math.round(beautySettings.smoothnessLevel * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateBeauty({ enabled: true, smoothnessLevel: v / 100 })}
                  />
                  <SliderControl
                    icon={Sun}
                    label={'Parlaklık'}
                    value={Math.round(beautySettings.lighteningLevel * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateBeauty({ enabled: true, lighteningLevel: v / 100 })}
                  />
                  <SliderControl
                    icon={Heart}
                    label={'Allık'}
                    value={Math.round(beautySettings.rednessLevel * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateBeauty({ enabled: true, rednessLevel: v / 100 })}
                  />

                  {/* Contrast - inline */}
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs whitespace-nowrap">Kontrast:</span>
                    <div className="flex gap-1.5 flex-1">
                      {[
                        { value: 0 as const, label: 'Düşük' },
                        { value: 1 as const, label: 'Normal' },
                        { value: 2 as const, label: 'Yüksek' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateBeauty({ enabled: true, lighteningContrastLevel: opt.value })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                            beautySettings.lighteningContrastLevel === opt.value
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-white/10 text-white/50 hover:bg-white/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-6 z-20 transition-opacity ${showEffects ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Selected Category Display */}
        {selectedCategory && (
          <button
            onClick={() => setShowCategorySelector(true)}
            className="w-full mb-3 px-4 py-3 rounded-2xl flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.3) 0%, rgba(236, 72, 153, 0.2) 100%)',
              border: '2px solid rgba(217, 70, 239, 0.5)',
              boxShadow: '0 0 20px rgba(217, 70, 239, 0.3)',
            }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                border: '2px solid rgba(240, 171, 252, 0.7)',
                background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.3) 0%, rgba(236, 72, 153, 0.2) 100%)',
                boxShadow: '0 0 15px rgba(217, 70, 239, 0.4)',
              }}
            >
              <span className="text-xl">{selectedCategory.icon}</span>
            </div>
            <span className="text-white font-semibold flex-1 text-left">
              {selectedCategory.name}
            </span>
            <span className="text-fuchsia-300 text-xs">
              {'Değiştir'}
            </span>
          </button>
        )}
        
        {/* Stream Title Input */}
        <div className="mb-4">
          <input
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder={'Yayın başlığı (isteğe bağlı)'}
            className="w-full bg-white/10 text-white placeholder:text-white/40 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 border border-fuchsia-500/20"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-white/20' : 'bg-red-500'}`}
          >
            {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>
          
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${isAudioOn ? 'bg-white/20' : 'bg-red-500'}`}
          >
            {isAudioOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>
          
          <button
            onClick={switchCamera}
            className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
          >
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>
          
          <button
            onClick={() => setShowEffects(!showEffects)}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${showEffects || beautySettings.enabled ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'}`}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Start Stream Button */}
        <button
          onClick={handleStartStream}
          disabled={isStarting || !selectedCategory}
          className="w-full py-4 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50"
          style={{
            background: selectedCategory 
              ? 'linear-gradient(135deg, #d946ef 0%, #ec4899 50%, #f43f5e 100%)'
              : 'rgba(255,255,255,0.1)',
            boxShadow: selectedCategory ? '0 0 25px rgba(217, 70, 239, 0.5)' : 'none',
          }}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {'Başlatılıyor...'}
            </>
          ) : !selectedCategory ? (
            <>
              <Sparkles className="w-6 h-6" />
              {'Yayın Türü Seçin'}
            </>
          ) : (
            <>
              <Radio className="w-6 h-6" />
              {'Canlı Yayını Başlat'}
            </>
          )}
        </button>
      </div>

      {/* Category Selector Modal - FalClub themed */}
      <AnimatePresence>
        {showCategorySelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0a0118 0%, #1a0a2e 40%, #0d0520 100%)' }}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-5 pt-6 pb-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-white text-lg font-bold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-fuchsia-400" />
                  {'Yayın Türü Seçin'}
                </h2>
                {selectedCategory && (
                  <button 
                    onClick={() => setShowCategorySelector(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                )}
              </div>
              <p className="text-fuchsia-300/60 text-xs">
                {'Hangi tür yayın yapacaksınız?'}
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* Fortune Types Section */}
              <div className="mb-5">
                <h3 className="text-fuchsia-300 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  {'Fal Türleri'}
                </h3>
                <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                  {FORTUNE_TYPES.map((category) => (
                    <motion.button
                      key={category.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowCategorySelector(false)
                      }}
                      className="flex flex-col items-center group"
                    >
                      <div 
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                          selectedCategory?.id === category.id 
                            ? 'scale-110' 
                            : 'group-hover:scale-105'
                        }`}
                        style={{
                          border: selectedCategory?.id === category.id 
                            ? '3px solid rgba(240, 171, 252, 0.9)' 
                            : '3px solid rgba(217, 70, 239, 0.7)',
                          boxShadow: selectedCategory?.id === category.id
                            ? '0 0 30px rgba(217, 70, 239, 0.8), inset 0 0 25px rgba(217, 70, 239, 0.3)'
                            : '0 0 20px rgba(217, 70, 239, 0.5), inset 0 0 20px rgba(217, 70, 239, 0.2)',
                          background: selectedCategory?.id === category.id
                            ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.4) 0%, rgba(236, 72, 153, 0.3) 100%)'
                            : 'linear-gradient(135deg, rgba(217, 70, 239, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)',
                        }}
                      >
                        <span className="text-3xl">{category.icon}</span>
                        {selectedCategory?.id === category.id && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-fuchsia-500 rounded-full flex items-center justify-center border-2 border-[#0a0118]">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium mt-1.5 text-center leading-tight transition-colors ${
                        selectedCategory?.id === category.id ? 'text-fuchsia-200' : 'text-fuchsia-300/80'
                      }`}>
                        {category.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
              </div>

              {/* Other Categories Section */}
              <div>
                <h3 className="text-fuchsia-300 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" />
                  {'Diğer Kategoriler'}
                </h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                  {OTHER_CATEGORIES.map((category) => (
                    <motion.button
                      key={category.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowCategorySelector(false)
                      }}
                      className="flex flex-col items-center group"
                    >
                      <div 
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                          selectedCategory?.id === category.id 
                            ? 'scale-110' 
                            : 'group-hover:scale-105'
                        }`}
                        style={{
                          border: selectedCategory?.id === category.id 
                            ? '3px solid rgba(240, 171, 252, 0.9)' 
                            : '3px solid rgba(217, 70, 239, 0.7)',
                          boxShadow: selectedCategory?.id === category.id
                            ? '0 0 30px rgba(217, 70, 239, 0.8), inset 0 0 25px rgba(217, 70, 239, 0.3)'
                            : '0 0 20px rgba(217, 70, 239, 0.5), inset 0 0 20px rgba(217, 70, 239, 0.2)',
                          background: selectedCategory?.id === category.id
                            ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.4) 0%, rgba(236, 72, 153, 0.3) 100%)'
                            : 'linear-gradient(135deg, rgba(217, 70, 239, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)',
                        }}
                      >
                        <span className="text-3xl">{category.icon}</span>
                        {selectedCategory?.id === category.id && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-fuchsia-500 rounded-full flex items-center justify-center border-2 border-[#0a0118]">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium mt-1.5 text-center leading-tight transition-colors ${
                        selectedCategory?.id === category.id ? 'text-fuchsia-200' : 'text-fuchsia-300/80'
                      }`}>
                        {category.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Continue Button */}
            {selectedCategory && (
              <div className="flex-shrink-0 p-5" style={{ borderTop: '1px solid rgba(217, 70, 239, 0.2)' }}>
                <button
                  onClick={() => setShowCategorySelector(false)}
                  className="w-full py-4 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg, #d946ef 0%, #ec4899 50%, #f43f5e 100%)',
                    boxShadow: '0 0 30px rgba(217, 70, 239, 0.5)',
                  }}
                >
                  <span className="text-2xl">{selectedCategory.icon}</span>
                  {`${selectedCategory.name} ile Devam Et`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
