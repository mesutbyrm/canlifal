'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { Sparkles, AlertCircle, RotateCw, Droplets, Smartphone } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import FortuneAccessGate from '@/components/fortune-access-gate'

type Phase = 'ready' | 'waiting_flip' | 'pouring' | 'settling' | 'interpreting' | 'complete'

export default function KursunDokmePage() {
  const { data: session } = useSession() || {}
  const { language } = useLanguage()
  const router = useRouter()
  
  const [phase, setPhase] = useState<Phase>('ready')
  const [fortune, setFortune] = useState('')
  const [error, setError] = useState('')
  const [adWatched, setAdWatched] = useState(false)
  const [shapes, setShapes] = useState<{x: number, y: number, size: number, type: string}[]>([])
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, size: number, alpha: number}[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const phaseRef = useRef<Phase>('ready')
  const shapesRef = useRef<{x: number, y: number, size: number, type: string}[]>([])
  
  // Keep refs in sync with state
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  
  useEffect(() => {
    shapesRef.current = shapes
  }, [shapes])

  // Hot iron in water sizzling sound - Kızgın demir suya girdiğindeki ses
  const playSizzlingSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      
      const duration = 4
      const now = audioContext.currentTime

      // Main sizzling/hissing noise (white noise filtered)
      const bufferSize = audioContext.sampleRate * duration
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
      
      const whiteNoise = audioContext.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      
      // High-pass filter for sizzling character
      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.setValueAtTime(3000, now)
      highPass.frequency.exponentialRampToValueAtTime(1500, now + duration)
      
      // Band-pass for steam sound
      const bandPass = audioContext.createBiquadFilter()
      bandPass.type = 'bandpass'
      bandPass.frequency.setValueAtTime(4000, now)
      bandPass.Q.setValueAtTime(2, now)
      
      // Gain envelope - starts loud, fades
      const noiseGain = audioContext.createGain()
      noiseGain.gain.setValueAtTime(0.4, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.15, now + 0.5)
      noiseGain.gain.exponentialRampToValueAtTime(0.05, now + 2)
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      whiteNoise.connect(highPass)
      highPass.connect(bandPass)
      bandPass.connect(noiseGain)
      noiseGain.connect(audioContext.destination)
      
      whiteNoise.start(now)
      whiteNoise.stop(now + duration)
      
      // Initial splash/impact sound
      const splashOsc = audioContext.createOscillator()
      const splashGain = audioContext.createGain()
      splashOsc.type = 'sine'
      splashOsc.frequency.setValueAtTime(150, now)
      splashOsc.frequency.exponentialRampToValueAtTime(50, now + 0.3)
      splashGain.gain.setValueAtTime(0.5, now)
      splashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      splashOsc.connect(splashGain)
      splashGain.connect(audioContext.destination)
      splashOsc.start(now)
      splashOsc.stop(now + 0.3)
      
      // Random bubble/pop sounds (steam bubbles)
      for (let i = 0; i < 25; i++) {
        const delay = Math.random() * 2.5
        const bubbleOsc = audioContext.createOscillator()
        const bubbleGain = audioContext.createGain()
        const bubbleFilter = audioContext.createBiquadFilter()
        
        bubbleOsc.type = 'sine'
        bubbleOsc.frequency.setValueAtTime(800 + Math.random() * 1500, now + delay)
        bubbleOsc.frequency.exponentialRampToValueAtTime(200 + Math.random() * 400, now + delay + 0.08)
        
        bubbleFilter.type = 'bandpass'
        bubbleFilter.frequency.setValueAtTime(1000 + Math.random() * 2000, now + delay)
        bubbleFilter.Q.setValueAtTime(5, now + delay)
        
        bubbleGain.gain.setValueAtTime(0, now + delay)
        bubbleGain.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.1, now + delay + 0.01)
        bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1 + Math.random() * 0.1)
        
        bubbleOsc.connect(bubbleFilter)
        bubbleFilter.connect(bubbleGain)
        bubbleGain.connect(audioContext.destination)
        bubbleOsc.start(now + delay)
        bubbleOsc.stop(now + delay + 0.2)
      }
      
      // Crackling sounds
      for (let i = 0; i < 15; i++) {
        const crackDelay = Math.random() * 3
        const crackBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate)
        const crackData = crackBuffer.getChannelData(0)
        for (let j = 0; j < crackData.length; j++) {
          crackData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (crackData.length * 0.1))
        }
        const crackSource = audioContext.createBufferSource()
        crackSource.buffer = crackBuffer
        const crackGain = audioContext.createGain()
        crackGain.gain.setValueAtTime(0.2 + Math.random() * 0.15, now + crackDelay)
        crackSource.connect(crackGain)
        crackGain.connect(audioContext.destination)
        crackSource.start(now + crackDelay)
      }
      
    } catch (e) {
      console.log('Audio not supported:', e)
    }
  }, [])

  // Canvas animation for pouring lead
  const animatePour = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Initialize particles if empty
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 100; i++) {
        particlesRef.current.push({
          x: width / 2 + (Math.random() - 0.5) * 50,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 3 + 2,
          size: Math.random() * 8 + 4,
          alpha: 1
        })
      }
    }

    // Clear canvas
    ctx.fillStyle = '#0a0118'
    ctx.fillRect(0, 0, width, height)

    // Draw water bowl
    ctx.beginPath()
    ctx.ellipse(width / 2, height - 80, 120, 40, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)'
    ctx.fill()
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw bowl rim
    ctx.beginPath()
    ctx.ellipse(width / 2, height - 80, 140, 50, 0, 0, Math.PI * 2)
    ctx.strokeStyle = '#b8860b'
    ctx.lineWidth = 5
    ctx.stroke()

    // Update and draw particles
    let activeParticles = 0
    particlesRef.current.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.1 // gravity

      // Check if particle hit the water
      if (p.y > height - 100) {
        p.vy *= -0.3
        p.vx += (Math.random() - 0.5) * 2
        p.alpha -= 0.05
      }

      if (p.alpha > 0) {
        activeParticles++
        // Draw lead particle with glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        gradient.addColorStop(0, `rgba(192, 192, 192, ${p.alpha})`)
        gradient.addColorStop(0.5, `rgba(128, 128, 128, ${p.alpha * 0.8})`)
        gradient.addColorStop(1, `rgba(64, 64, 64, 0)`)
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }
    })

    // Generate random shapes when particles settle - use ref for phase check
    if (activeParticles < 20 && phaseRef.current === 'pouring') {
      generateShapes(ctx, width, height)
      phaseRef.current = 'settling'
      setPhase('settling')
      setTimeout(() => {
        captureAndInterpret()
      }, 2000)
      return
    }

    // Continue animation if still pouring - use ref for phase check
    if (phaseRef.current === 'pouring') {
      animationRef.current = requestAnimationFrame(animatePour)
    }
  }, [])

  // Generate random mystical shapes
  const generateShapes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const newShapes: {x: number, y: number, size: number, type: string}[] = []
    const shapeTypes = ['bird', 'heart', 'eye', 'crescent', 'star', 'hand', 'snake', 'tree', 'fish', 'ring']
    
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
      const shape = {
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height - 120 + (Math.random() - 0.5) * 60,
        size: 15 + Math.random() * 30,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
      }
      newShapes.push(shape)
      
      // Draw the shape
      ctx.save()
      ctx.translate(shape.x, shape.y)
      ctx.rotate(Math.random() * Math.PI * 2)
      
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, shape.size)
      gradient.addColorStop(0, 'rgba(169, 169, 169, 0.9)')
      gradient.addColorStop(0.7, 'rgba(105, 105, 105, 0.7)')
      gradient.addColorStop(1, 'rgba(64, 64, 64, 0.3)')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      
      // Draw abstract blob shapes
      const points = 6 + Math.floor(Math.random() * 4)
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2
        const radius = shape.size * (0.5 + Math.random() * 0.5)
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        if (j === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.quadraticCurveTo(
            Math.cos(angle - 0.3) * radius * 1.2,
            Math.sin(angle - 0.3) * radius * 1.2,
            x, y
          )
        }
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    
    shapesRef.current = newShapes
    setShapes(newShapes)
  }

  // Start pouring animation
  const startPouring = useCallback(() => {
    if (phaseRef.current !== 'waiting_flip') return
    
    phaseRef.current = 'pouring'
    setPhase('pouring')
    playSizzlingSound()
    particlesRef.current = []
    
    // Start animation
    requestAnimationFrame(animatePour)
  }, [playSizzlingSound, animatePour])

  // Device orientation detection
  useEffect(() => {
    if (phase !== 'waiting_flip') return

    let triggered = false
    
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (triggered) return
      const beta = event.beta ?? 0
      
      // Check if device is flipped upside down
      if (Math.abs(beta) > 120 || (beta < -60 && beta > -180)) {
        triggered = true
        startPouring()
      }
    }

    // Request permission for iOS 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation)
          }
        })
        .catch(console.error)
    } else {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [phase, startPouring])

  // For desktop users - click to pour
  const handleManualPour = () => {
    if (phaseRef.current === 'waiting_flip') {
      startPouring()
    }
  }

  const captureAndInterpret = async () => {
    phaseRef.current = 'interpreting'
    setPhase('interpreting')
    setError('')
    
    try {
      // Use ref to get shapes as they were set synchronously
      const shapesDescription = shapesRef.current.map(s => s.type).join(', ')
      
      const response = await fetch('/api/fortunes/kursundokme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shapes: shapesDescription,
          language, adWatched }),
      })

      // Check if response is JSON error
      const contentType = response.headers.get('content-type')
      if (!response.ok) {
        if (contentType?.includes('application/json')) {
          const errData = await response.json()
          throw new Error(errData.error || ('Fal yorumu alınamadı'))
        } else {
          throw new Error('Fal yorumu alınamadı')
        }
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Yanıt alınamadı')

      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
        setFortune(result)
      }

      if (result.length === 0) {
        throw new Error('Fal yorumu boş geldi. Lütfen tekrar deneyin.')
      }

      phaseRef.current = 'complete'
      setPhase('complete')
    } catch (err: any) {
      console.error('Fortune interpretation error:', err)
      setError(err.message || ('Bir hata oluştu'))
      phaseRef.current = 'ready'
      setPhase('ready')
    }
  }

  const startFortune = async () => {
    if (!session?.user) {
      router.push(`/giris`)
      return
    }

    setError('')
    setFortune('')
    setShapes([])
    shapesRef.current = []
    phaseRef.current = 'waiting_flip'
    setPhase('waiting_flip')

    // Draw initial canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#0a0118'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw waiting message
        ctx.fillStyle = '#d4af37'
        ctx.font = '20px serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          'Telefonu çevirin veya tıklayın...',
          canvas.width / 2,
          canvas.height / 2
        )
      }
    }
  }

  const resetFortune = () => {
    phaseRef.current = 'ready'
    setPhase('ready')
    setFortune('')
    setError('')
    setShapes([])
    shapesRef.current = []
    particlesRef.current = []
    cancelAnimationFrame(animationRef.current)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {'Kurşun Dökme'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {'Geleneksel Türk kurşun dökme ritüeli ile geleceğinizi keşfedin'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-gold-400">
            <Sparkles className="w-5 h-5" />
            <span>6 {'Jeton'}</span>
          </div>
        </motion.div>

        {/* Canvas Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-mystical-card border border-mystical rounded-lg p-4 mb-6 mystical-shadow"
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onClick={handleManualPour}
            className="w-full aspect-square bg-[#0a0118] rounded-lg cursor-pointer"
          />
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="space-y-4">
          {phase === 'ready' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={startFortune}
              className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-deep-purple-950 font-semibold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center justify-center gap-3"
            >
              <Droplets className="w-6 h-6" />
              {'Kurşun Dök'}
            </motion.button>
          )}

          {phase === 'waiting_flip' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="animate-bounce">
                <Smartphone className="w-16 h-16 text-gold-400 mx-auto transform rotate-180" />
              </div>
              <p className="text-gold-400 text-lg">
                {'Telefonu ters çevirin veya tıklayın!'}
              </p>
              <button
                onClick={handleManualPour}
                className="px-6 py-3 bg-deep-purple-800 text-gold-400 rounded-lg hover:bg-deep-purple-700 transition-colors"
              >
                {'Tıklayarak Dök'}
              </button>
            </motion.div>
          )}

          {phase === 'pouring' && (
            <div className="text-center">
              <p className="text-gold-400 text-lg animate-pulse">
                {'Kurşun dökülüyor...'}
              </p>
            </div>
          )}

          {phase === 'settling' && (
            <div className="text-center">
              <p className="text-gold-400 text-lg animate-pulse">
                {'Şekiller oluşuyor...'}
              </p>
            </div>
          )}

          {phase === 'interpreting' && (
            <LoadingSpinner 
              message={'Şekiller yorumlanıyor...'} 
            />
          )}
        </div>

        {/* Fortune Result */}
        <AnimatePresence>
          {fortune && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-gold-500" />
                <h2 className="font-serif text-2xl text-gold-400">
                  {'Kurşun Falınız'}
                </h2>
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">
                  {fortune}
                </p>
              </div>
              
              {phase === 'complete' && (
                <div className="mt-6 pt-6 border-t border-deep-purple-800">
                  <SocialShare
                    title={'Kurşun Dökme Falım'}
                    text={fortune.substring(0, 200) + '...'}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Button */}
        {(phase === 'complete' || error) && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={resetFortune}
            className="w-full mt-6 py-3 bg-deep-purple-800 text-gold-400 rounded-lg hover:bg-deep-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            {'Yeniden Dök'}
          </motion.button>
        )}
      </div>
    </div>
  )
}
