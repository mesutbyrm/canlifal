'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
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
  Loader2
} from 'lucide-react'

interface BeautySettings {
  smoothness: number  // 0-100
  brightness: number  // -50 to 50
  contrast: number    // -50 to 50
  saturation: number  // -50 to 50
}

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

  useEffect(() => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    startCamera()
    return () => {
      stopCamera()
    }
  }, [session])

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
    setIsStarting(true)
    
    // Store beauty settings in localStorage for broadcast page
    localStorage.setItem('streamBeautySettings', JSON.stringify(beautySettings))
    
    try {
      const res = await fetch('/api/video-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: streamTitle || null })
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

        {/* Beauty Effects Panel */}
        {showEffects && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-16 bottom-40 w-72 bg-black/80 backdrop-blur-md rounded-l-2xl p-4 z-30 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                {language === 'tr' ? 'Güzelleştirme' : 'Beauty'}
              </h3>
              <button onClick={() => setShowEffects(false)} className="text-white/60">
                <X className="w-5 h-5" />
              </button>
            </div>

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

            {/* Preset Buttons */}
            <div className="mt-6 space-y-2">
              <p className="text-white/60 text-xs mb-2">
                {language === 'tr' ? 'Hazır Ayarlar' : 'Presets'}
              </p>
              <button
                onClick={() => setBeautySettings({ smoothness: 0, brightness: 0, contrast: 0, saturation: 0 })}
                className="w-full py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20"
              >
                {language === 'tr' ? 'Doğal' : 'Natural'}
              </button>
              <button
                onClick={() => setBeautySettings({ smoothness: 40, brightness: 10, contrast: 5, saturation: 10 })}
                className="w-full py-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white text-sm rounded-lg hover:from-purple-500/50 hover:to-pink-500/50"
              >
                {language === 'tr' ? 'Yumuşak' : 'Soft'}
              </button>
              <button
                onClick={() => setBeautySettings({ smoothness: 60, brightness: 15, contrast: 10, saturation: 15 })}
                className="w-full py-2 bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-white text-sm rounded-lg hover:from-pink-500/50 hover:to-rose-500/50"
              >
                {language === 'tr' ? 'Glamour' : 'Glamour'}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-6 z-20">
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
          disabled={isStarting}
          className="w-full py-4 bg-gradient-to-r from-[#fe2c55] to-[#ff6b6b] text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isStarting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {language === 'tr' ? 'Başlatılıyor...' : 'Starting...'}
            </>
          ) : (
            <>
              <Radio className="w-6 h-6" />
              {language === 'tr' ? 'Canlı Yayını Başlat' : 'Go Live'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
