'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
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
  Contrast,
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
  Check
} from 'lucide-react'

interface BeautySettings {
  smoothness: number  // 0-100
  brightness: number  // -50 to 50
  contrast: number    // -50 to 50
  saturation: number  // -50 to 50
}

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
  const [beautySettings, setBeautySettings] = useState<BeautySettings>({
    smoothness: 30,
    brightness: 0,
    contrast: 0,
    saturation: 0
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
      router.push(`/${language}/login`)
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

  const handleVideoLoaded = () => {
    setIsVideoReady(true)
    if (videoRef.current) {
      videoRef.current.play().catch(console.error)
    }
    applyBeautyFilter()
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9/16 }
        },
        audio: true
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Listen for video to be ready
        videoRef.current.onloadedmetadata = handleVideoLoaded
      }
    } catch (error) {
      console.error('Camera error:', error)
      alert(language === 'tr' ? 'Kamera erişimi sağlanamadı' : 'Could not access camera')
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

      // Apply beauty filters using CSS filters on canvas
      const { smoothness, brightness, contrast, saturation } = beautySettings
      
      // Apply filter effects
      let filterString = ''
      filterString += `brightness(${1 + brightness / 100}) `
      filterString += `contrast(${1 + contrast / 100}) `
      filterString += `saturate(${1 + saturation / 100}) `
      
      // Apply smoothness using blur + composite
      if (smoothness > 0) {
        const blurAmount = smoothness / 50
        filterString += `blur(${blurAmount}px)`
        
        // Draw blurred version
        ctx.filter = filterString
        ctx.globalAlpha = smoothness / 100 * 0.5
        ctx.drawImage(canvas, 0, 0)
        ctx.globalAlpha = 1
        ctx.filter = 'none'
      } else {
        ctx.filter = filterString
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.filter = 'none'
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacing,
          width: { ideal: 720 },
          height: { ideal: 1280 }
        },
        audio: true
      })
      
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
    
    // Store beauty settings in localStorage for broadcast page
    localStorage.setItem('streamBeautySettings', JSON.stringify(beautySettings))
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
        router.push(`/${language}/chat/video/broadcast/${data.id}`)
      } else {
        console.error('Failed to create stream')
        setIsStarting(false)
      }
    } catch (error) {
      console.error('Error creating stream:', error)
      setIsStarting(false)
    }
  }

  const SliderControl = ({ 
    icon: Icon, 
    label, 
    value, 
    min, 
    max, 
    onChange 
  }: { 
    icon: any
    label: string
    value: number
    min: number
    max: number
    onChange: (v: number) => void 
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
          <p className="text-white/60">{language === 'tr' ? 'Kontrol ediliyor...' : 'Checking...'}</p>
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
            title: language === 'tr' ? 'Canlı Falcı Ol' : 'Become a Live Fortune Teller',
            message: language === 'tr' 
              ? 'Canlı yayın açabilmek için önce canlı falcı başvurusu yapmanız gerekmektedir.'
              : 'You need to apply as a live fortune teller before you can start streaming.',
            buttonText: language === 'tr' ? 'Başvuru Yap' : 'Apply Now',
            buttonLink: `/${language}/live-tellers/apply`,
            icon: '✨'
          }
        case 'pending':
          return {
            title: language === 'tr' ? 'Başvurunuz İnceleniyor' : 'Application Under Review',
            message: language === 'tr' 
              ? 'Canlı falcı başvurunuz henüz onaylanmadı. Onaylandıktan sonra yayın açabilirsiniz.'
              : 'Your live fortune teller application is still pending. You can start streaming after approval.',
            buttonText: language === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home',
            buttonLink: `/${language}`,
            icon: '⏳'
          }
        case 'rejected':
          return {
            title: language === 'tr' ? 'Başvurunuz Reddedildi' : 'Application Rejected',
            message: language === 'tr' 
              ? 'Canlı falcı başvurunuz reddedildi. Yeni bir başvuru yapabilirsiniz.'
              : 'Your live fortune teller application was rejected. You can submit a new application.',
            buttonText: language === 'tr' ? 'Tekrar Başvur' : 'Apply Again',
            buttonLink: `/${language}/live-tellers/apply`,
            icon: '❌'
          }
        case 'restricted':
          return {
            title: language === 'tr' ? 'Hesabınız Kısıtlandı' : 'Account Restricted',
            message: language === 'tr' 
              ? 'Canlı falcı hesabınız şu anda kısıtlanmış durumda. Destek ile iletişime geçin.'
              : 'Your live fortune teller account is currently restricted. Please contact support.',
            buttonText: language === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home',
            buttonLink: `/${language}`,
            icon: '🚫'
          }
        default:
          return {
            title: language === 'tr' ? 'Hata' : 'Error',
            message: language === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.',
            buttonText: language === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home',
            buttonLink: `/${language}`,
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
            {language === 'tr' ? 'Geri Dön' : 'Go Back'}
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
            <span>{language === 'tr' ? 'Geri' : 'Back'}</span>
          </button>
          <h1 className="text-white font-semibold">
            {language === 'tr' ? 'Yayın Hazırlığı' : 'Stream Setup'}
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
                {language === 'tr' ? 'Kamera kapalı' : 'Camera off'}
              </p>
            </div>
          </div>
        )}


      </div>

      {/* Beauty Effects Panel - Bottom Scrollable */}
      {showEffects && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="absolute bottom-0 inset-x-0 z-30"
        >
          {/* Transparent overlay with blur */}
          <div className="bg-black/40 backdrop-blur-sm rounded-t-3xl overflow-hidden max-h-[60vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                {language === 'tr' ? 'Efektler' : 'Effects'}
              </h3>
              <button onClick={() => setShowEffects(false)} className="text-white/60 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[45vh] p-4">
              {/* Preset Buttons - Horizontal Scroll */}
              <div className="mb-6">
                <p className="text-white/60 text-xs mb-3">
                  {language === 'tr' ? 'Hazır Ayarlar' : 'Presets'}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setBeautySettings({ smoothness: 0, brightness: 0, contrast: 0, saturation: 0 })}
                    className="flex-shrink-0 px-4 py-2 bg-white/10 text-white text-sm rounded-full hover:bg-white/20 whitespace-nowrap"
                  >
                    ✨ {language === 'tr' ? 'Doğal' : 'Natural'}
                  </button>
                  <button
                    onClick={() => setBeautySettings({ smoothness: 40, brightness: 10, contrast: 5, saturation: 10 })}
                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-white text-sm rounded-full hover:from-purple-500/60 hover:to-pink-500/60 whitespace-nowrap"
                  >
                    🌸 {language === 'tr' ? 'Yumuşak' : 'Soft'}
                  </button>
                  <button
                    onClick={() => setBeautySettings({ smoothness: 60, brightness: 15, contrast: 10, saturation: 15 })}
                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-pink-500/40 to-rose-500/40 text-white text-sm rounded-full hover:from-pink-500/60 hover:to-rose-500/60 whitespace-nowrap"
                  >
                    💎 Glamour
                  </button>
                  <button
                    onClick={() => setBeautySettings({ smoothness: 20, brightness: 20, contrast: 15, saturation: 5 })}
                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 text-white text-sm rounded-full hover:from-yellow-500/60 hover:to-orange-500/60 whitespace-nowrap"
                  >
                    ☀️ {language === 'tr' ? 'Parlak' : 'Bright'}
                  </button>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <SliderControl
                  icon={Droplet}
                  label={language === 'tr' ? 'Pürüzsüzlük' : 'Smoothness'}
                  value={beautySettings.smoothness}
                  min={0}
                  max={100}
                  onChange={(v) => setBeautySettings(prev => ({ ...prev, smoothness: v }))}
                />

                <SliderControl
                  icon={Sun}
                  label={language === 'tr' ? 'Parlaklık' : 'Brightness'}
                  value={beautySettings.brightness}
                  min={-50}
                  max={50}
                  onChange={(v) => setBeautySettings(prev => ({ ...prev, brightness: v }))}
                />

                <SliderControl
                  icon={Contrast}
                  label={language === 'tr' ? 'Kontrast' : 'Contrast'}
                  value={beautySettings.contrast}
                  min={-50}
                  max={50}
                  onChange={(v) => setBeautySettings(prev => ({ ...prev, contrast: v }))}
                />

                <SliderControl
                  icon={Sparkles}
                  label={language === 'tr' ? 'Doygunluk' : 'Saturation'}
                  value={beautySettings.saturation}
                  min={-50}
                  max={50}
                  onChange={(v) => setBeautySettings(prev => ({ ...prev, saturation: v }))}
                />
              </div>
            </div>

            {/* Close button at bottom */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowEffects(false)}
                className="w-full py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20"
              >
                {language === 'tr' ? 'Tamam' : 'Done'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-6 z-20 transition-opacity ${showEffects ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Selected Category Display */}
        {selectedCategory && (
          <button
            onClick={() => setShowCategorySelector(true)}
            className={`w-full mb-3 px-4 py-3 bg-gradient-to-r ${selectedCategory.color} rounded-xl flex items-center justify-center gap-2`}
          >
            <span className="text-2xl">{selectedCategory.icon}</span>
            <span className="text-white font-semibold">
              {language === 'tr' ? selectedCategory.name : selectedCategory.nameEn}
            </span>
            <span className="text-white/70 text-sm ml-auto">
              {language === 'tr' ? 'Değiştir' : 'Change'}
            </span>
          </button>
        )}
        
        {/* Stream Title Input */}
        <div className="mb-4">
          <input
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder={language === 'tr' ? 'Yayın başlığı (isteğe bağlı)' : 'Stream title (optional)'}
            className="w-full bg-white/10 text-white placeholder:text-white/40 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className={`w-14 h-14 rounded-full flex items-center justify-center ${showEffects ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'}`}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Start Stream Button */}
        <button
          onClick={handleStartStream}
          disabled={isStarting || !selectedCategory}
          className="w-full py-4 bg-gradient-to-r from-[#fe2c55] to-[#ff6b6b] text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isStarting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {language === 'tr' ? 'Başlatılıyor...' : 'Starting...'}
            </>
          ) : !selectedCategory ? (
            <>
              <Sparkles className="w-6 h-6" />
              {language === 'tr' ? 'Yayın Türü Seçin' : 'Select Stream Type'}
            </>
          ) : (
            <>
              <Radio className="w-6 h-6" />
              {language === 'tr' ? 'Canlı Yayını Başlat' : 'Go Live'}
            </>
          )}
        </button>
      </div>

      {/* Category Selector Modal */}
      <AnimatePresence>
        {showCategorySelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 z-50 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl font-bold">
                  {language === 'tr' ? 'Yayın Türünü Seçin' : 'Select Stream Type'}
                </h2>
                {selectedCategory && (
                  <button 
                    onClick={() => setShowCategorySelector(false)}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Fortune Types */}
              <div className="mb-6">
                <h3 className="text-purple-400 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {language === 'tr' ? 'Fal Türleri' : 'Fortune Types'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {FORTUNE_TYPES.map((category) => (
                    <motion.button
                      key={category.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowCategorySelector(false)
                      }}
                      className={`relative p-4 rounded-2xl bg-gradient-to-br ${category.color} flex flex-col items-center gap-2 transition-all ${
                        selectedCategory?.id === category.id ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      <span className="text-3xl">{category.icon}</span>
                      <span className="text-white font-medium text-sm text-center">
                        {language === 'tr' ? category.name : category.nameEn}
                      </span>
                      {selectedCategory?.id === category.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Other Categories */}
              <div>
                <h3 className="text-cyan-400 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {language === 'tr' ? 'Diğer Kategoriler' : 'Other Categories'}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {OTHER_CATEGORIES.map((category) => (
                    <motion.button
                      key={category.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowCategorySelector(false)
                      }}
                      className={`relative p-4 rounded-2xl bg-gradient-to-br ${category.color} flex flex-col items-center gap-2 transition-all ${
                        selectedCategory?.id === category.id ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <span className="text-white font-medium text-xs text-center">
                        {language === 'tr' ? category.name : category.nameEn}
                      </span>
                      {selectedCategory?.id === category.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            {selectedCategory && (
              <div className="p-6 border-t border-white/10">
                <button
                  onClick={() => setShowCategorySelector(false)}
                  className={`w-full py-4 bg-gradient-to-r ${selectedCategory.color} text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3`}
                >
                  <span className="text-2xl">{selectedCategory.icon}</span>
                  {language === 'tr' ? `${selectedCategory.name} ile Devam Et` : `Continue with ${selectedCategory.nameEn}`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
