'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Hand, Sparkles, Upload, X, Camera, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import ShareToSocial from '@/components/share-to-social'
import TextToSpeech from '@/components/text-to-speech'
import Image from 'next/image'

export default function PalmReadingPage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const [palmImage, setPalmImage] = useState<File | null>(null)
  const [palmPreview, setPalmPreview] = useState('')
  const [hand, setHand] = useState<'left' | 'right'>('right')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setStream(mediaStream)
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      setError(language === 'tr' ? 'Kamera erişimi reddedildi' : 'Camera access denied')
    }
  }, [language])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'palm-capture.jpg', { type: 'image/jpeg' })
            setPalmImage(file)
            setPalmPreview(canvas.toDataURL('image/jpeg'))
            stopCamera()
          }
        }, 'image/jpeg', 0.9)
      }
    }
  }, [stopCamera])

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(language === 'tr' ? 'Sadece resim dosyaları yüklenebilir' : 'Only image files are allowed')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPalmImage(file)
      setPalmPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setError('')
  }

  const uploadImage = async (file: File): Promise<string> => {
    const presignedRes = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
    })
    if (!presignedRes.ok) throw new Error('Failed to get upload URL')
    const { uploadUrl, cloud_storage_path } = await presignedRes.json()
    const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!uploadRes.ok) throw new Error('Failed to upload image')
    return cloud_storage_path
  }

  const handleSubmit = async () => {
    if (!palmImage) {
      setError(language === 'tr' ? 'Lütfen el fotoğrafı yükleyin' : 'Please upload palm photo')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      setUploadProgress(language === 'tr' ? 'Fotoğraf yükleniyor...' : 'Uploading photo...')
      const palmPath = await uploadImage(palmImage)
      setUploadProgress(language === 'tr' ? 'El falınız hazırlanıyor...' : 'Preparing your palm reading...')

      const res = await fetch('/api/fortunes/palm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palmImagePath: palmPath, hand, language }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get palm reading')
      }

      setUploadProgress('')
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = (await reader?.read()) ?? { done: true, value: undefined }
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const content = parsed?.choices?.[0]?.delta?.content || ''
              if (content) setResponse(prev => prev + content)
            } catch (e) {}
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Hand className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'El Falı' : 'Palm Reading'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'Elinizin çizgileri kaderinizi açığa çıkarır' : 'The lines of your palm reveal your destiny'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />8 {language === 'tr' ? 'kredi' : 'credits'}
          </p>
        </motion.div>

        {!response && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-mystical-card border border-mystical rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-deep-purple-200 mb-3 font-medium">
                  {language === 'tr' ? 'Hangi Eliniz?' : 'Which Hand?'}
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setHand('right')}
                    className={`flex-1 py-3 rounded-lg border transition-all ${hand === 'right' ? 'bg-gold-500/20 border-gold-500 text-gold-500' : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-300'}`}
                  >
                    {language === 'tr' ? 'Sağ El' : 'Right Hand'}
                  </button>
                  <button
                    onClick={() => setHand('left')}
                    className={`flex-1 py-3 rounded-lg border transition-all ${hand === 'left' ? 'bg-gold-500/20 border-gold-500 text-gold-500' : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-300'}`}
                  >
                    {language === 'tr' ? 'Sol El' : 'Left Hand'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-deep-purple-200 mb-3 font-medium">
                  {language === 'tr' ? 'El Fotoğrafınız *' : 'Your Palm Photo *'}
                </label>
                
                {/* Camera View */}
                {showCamera && (
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                      <button
                        onClick={capturePhoto}
                        className="p-4 bg-gold-500 rounded-full text-deep-purple-950 hover:bg-gold-400 transition-all shadow-lg"
                      >
                        <Camera className="w-8 h-8" />
                      </button>
                      <button
                        onClick={stopCamera}
                        className="p-4 bg-red-500 rounded-full text-white hover:bg-red-400 transition-all shadow-lg"
                      >
                        <X className="w-8 h-8" />
                      </button>
                    </div>
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {hand === 'right' 
                        ? (language === 'tr' ? 'Sağ elinizi gösterin' : 'Show your right hand')
                        : (language === 'tr' ? 'Sol elinizi gösterin' : 'Show your left hand')
                      }
                    </div>
                  </div>
                )}

                {!showCamera && (
                  <>
                    <div
                      onClick={() => inputRef.current?.click()}
                      className={`relative aspect-video rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${palmPreview ? 'border-gold-500' : 'border-deep-purple-600 hover:border-gold-500/50'}`}
                    >
                      {palmPreview ? (
                        <>
                          <Image src={palmPreview} alt="Palm" fill className="object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); setPalmImage(null); setPalmPreview(''); }} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-deep-purple-400">
                          <Upload className="w-12 h-12 mb-2" />
                          <p className="text-sm text-center px-4">{language === 'tr' ? 'El içi fotoğrafınızı yükleyin' : 'Upload your palm photo'}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Camera Button */}
                    {!palmPreview && (
                      <button
                        onClick={startCamera}
                        className="mt-3 w-full py-3 flex items-center justify-center gap-2 bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-600/50 transition-all"
                      >
                        <Camera className="w-5 h-5" />
                        {language === 'tr' ? 'Kamera ile Çek' : 'Take Photo'}
                      </button>
                    )}
                  </>
                )}
                
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
              </div>

              {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={isLoading || !palmImage}
                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <LoadingSpinner message={uploadProgress} /> : <><Hand className="w-5 h-5" />{language === 'tr' ? 'El Falıma Bak' : 'Read My Palm'}</>}
              </button>
            </div>
          </motion.div>
        )}

        {response && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-mystical-card border border-gold-500/30 rounded-xl p-8 mystical-shadow">
            <div className="flex items-center gap-3 mb-6">
              {palmPreview && <div className="relative w-20 h-20 rounded-lg overflow-hidden"><Image src={palmPreview} alt="Palm" fill className="object-cover" /></div>}
              <div>
                <h2 className="font-serif text-2xl text-gold-500">{language === 'tr' ? 'El Falınız' : 'Your Palm Reading'}</h2>
                <p className="text-deep-purple-300 text-sm">{hand === 'right' ? (language === 'tr' ? 'Sağ El' : 'Right Hand') : (language === 'tr' ? 'Sol El' : 'Left Hand')}</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none"><p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">{response}</p></div>
            
            {/* Text to Speech */}
            <div className="mt-6 mb-4">
              <TextToSpeech text={response} />
            </div>
            
            <SocialShare title={language === 'tr' ? 'El Falım' : 'My Palm Reading'} text={response} />
            <button onClick={() => { setResponse(''); setPalmImage(null); setPalmPreview(''); }} className="mt-6 w-full py-3 border border-gold-500/50 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all">
              {language === 'tr' ? 'Yeni Fal Bak' : 'Get New Reading'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
