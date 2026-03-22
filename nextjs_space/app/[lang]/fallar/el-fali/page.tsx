'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Hand, Sparkles, Upload, X, Camera, RotateCcw, CheckCircle, AlertCircle, ImageIcon } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import ShareToSocial from '@/components/share-to-social'
import TextToSpeech from '@/components/text-to-speech'
import FortunePageLayout from '@/components/fortune-page-layout'
import FortuneAccessGate from '@/components/fortune-access-gate'
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
  const [adWatched, setAdWatched] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [showSourceModal, setShowSourceModal] = useState(false)
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
      setShowSourceModal(false)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      setError('Kamera erişimi reddedildi')
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
      setError('Sadece resim dosyaları yüklenebilir')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPalmImage(file)
      setPalmPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setError('')
    setShowSourceModal(false)
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
      setError('Lütfen el fotoğrafı yükleyin')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      setUploadProgress('Fotoğraf yükleniyor...')
      const palmPath = await uploadImage(palmImage)
      setUploadProgress('El falınız hazırlanıyor...')

      const res = await fetch('/api/fortunes/el-fali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palmImagePath: palmPath, hand, language, adWatched }),
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

  const resetForm = () => {
    setResponse('')
    setPalmImage(null)
    setPalmPreview('')
  }

  return (
    <FortunePageLayout
      title="El Falı"
      titleEn="Palm Reading"
      subtitle="Elinizin çizgileri kaderinizi açığa çıkarır"
      subtitleEn="The lines of your palm reveal your destiny"
      icon={Hand}
      cost={8}
    >
      {/* Source Selection Modal */}
      <AnimatePresence>
        {showSourceModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
            onClick={() => setShowSourceModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-deep-purple-900 border border-gold-500/30 rounded-2xl p-5 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-gold-500 font-serif text-lg mb-4 text-center">
                {'Fotoğraf Kaynağı'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-2 p-4 bg-deep-purple-800 hover:bg-deep-purple-700 rounded-xl border border-deep-purple-600 hover:border-gold-500/50 transition-all"
                >
                  <Camera className="w-8 h-8 text-gold-500" />
                  <span className="text-deep-purple-100 text-sm font-medium">
                    {'Kamera'}
                  </span>
                </button>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-deep-purple-800 hover:bg-deep-purple-700 rounded-xl border border-deep-purple-600 hover:border-gold-500/50 transition-all"
                >
                  <ImageIcon className="w-8 h-8 text-gold-500" />
                  <span className="text-deep-purple-100 text-sm font-medium">
                    {'Galeri'}
                  </span>
                </button>
              </div>
              <button
                onClick={() => setShowSourceModal(false)}
                className="w-full mt-4 py-2 text-deep-purple-400 hover:text-deep-purple-200 transition-colors text-sm"
              >
                {'İptal'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera View */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="flex-1 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-2 rounded-full text-sm">
                {hand === 'right' 
                  ? ('🤚 Sağ elinizi gösterin')
                  : ('🤛 Sol elinizi gösterin')
                }
              </div>
            </div>
            <div className="bg-black/90 py-6 flex justify-center gap-6">
              <button
                onClick={stopCamera}
                className="p-4 bg-red-500 rounded-full text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={capturePhoto}
                className="p-5 bg-gold-500 rounded-full text-deep-purple-950"
              >
                <Camera className="w-8 h-8" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        ref={inputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} 
      />

      {!response ? (
        <div className="space-y-5">
          {/* Hand Selection */}
          <div>
            <label className="block text-deep-purple-200 mb-3 text-sm font-medium">
              {'Hangi Eliniz?'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setHand('right')}
                className={`py-3 sm:py-4 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  hand === 'right'
                    ? 'bg-gold-500 text-deep-purple-950'
                    : 'bg-deep-purple-900/50 border border-deep-purple-700 text-deep-purple-300 hover:border-gold-500/50'
                }`}
              >
                <span className="text-lg">🤚</span>
                <span className="text-sm">{'Sağ El'}</span>
              </button>
              <button
                onClick={() => setHand('left')}
                className={`py-3 sm:py-4 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  hand === 'left'
                    ? 'bg-gold-500 text-deep-purple-950'
                    : 'bg-deep-purple-900/50 border border-deep-purple-700 text-deep-purple-300 hover:border-gold-500/50'
                }`}
              >
                <span className="text-lg">🤛</span>
                <span className="text-sm">{'Sol El'}</span>
              </button>
            </div>
          </div>

          {/* Palm Photo Upload */}
          <div>
            <label className="block text-deep-purple-200 mb-2 text-sm font-medium">
              {'El Fotoğrafınız'}
              <span className="text-gold-500 ml-1">*</span>
            </label>
            <div
              onClick={() => !palmPreview && setShowSourceModal(true)}
              className={`relative aspect-[4/3] rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                palmPreview
                  ? 'border-gold-500 bg-gold-500/5'
                  : 'border-deep-purple-600 hover:border-gold-500/50 bg-deep-purple-900/30'
              }`}
            >
              {palmPreview ? (
                <>
                  <Image src={palmPreview} alt="Palm" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPalmImage(null)
                      setPalmPreview('')
                    }}
                    className="absolute top-3 right-3 p-2 bg-red-500 rounded-full text-white shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-green-500/90 text-white text-sm py-2 px-3 rounded-full flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{'Fotoğraf Yüklendi'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-deep-purple-400 p-4">
                  <div className="flex gap-3 mb-3">
                    <Camera className="w-8 h-8" />
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-center">
                    {'Fotoğraf çek veya galeriden seç'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Tips */}
          <div className="bg-deep-purple-900/30 border border-deep-purple-700/50 rounded-xl p-3 sm:p-4">
            <p className="text-deep-purple-300 text-xs sm:text-sm">
              ✋ {'Avucıçinizi açık tutun ve iyi aydınlatılmış bir ortamda net bir fotoğraf çekin.'}
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !palmImage}
            className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isLoading ? (
              <LoadingSpinner message={uploadProgress || ('El falınız hazırlanıyor...')} />
            ) : (
              <>
                <Hand className="w-5 h-5" />
                {'El Falıma Bak'}
              </>
            )}
          </button>
        </div>
      ) : (
        /* Fortune Result */
        <div className="space-y-5">
          {/* Success Header */}
          <div className="flex items-center gap-3">
            {palmPreview && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gold-500/30 flex-shrink-0">
                <Image src={palmPreview} alt="Palm" fill className="object-cover" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-gold-500">
                <Sparkles className="w-5 h-5" />
                <h2 className="font-serif text-xl sm:text-2xl">
                  {'El Falınız'}
                </h2>
              </div>
              <p className="text-deep-purple-300 text-sm mt-1">
                {hand === 'right' ? ('🤚 Sağ El') : ('🤛 Sol El')}
              </p>
            </div>
          </div>
          
          {/* Fortune Content */}
          <div className="bg-deep-purple-900/30 rounded-xl p-4 sm:p-5 border border-deep-purple-700/30">
            <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {response}
            </p>
          </div>
          
          {/* Text to Speech */}
          <TextToSpeech text={response} />
          
          {/* Share Buttons */}
          <div className="flex flex-wrap gap-2">
            <ShareToSocial fortuneType="palm" content={response} />
            <SocialShare 
              title={'El Falım'} 
              text={response} 
            />
          </div>
          
          {/* New Fortune Button */}
          <button
            onClick={resetForm}
            className="w-full py-3 sm:py-4 bg-deep-purple-800 hover:bg-deep-purple-700 text-gold-400 rounded-xl transition-all font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RotateCcw className="w-4 h-4" />
            {'Yeni El Falı Baktır'}
          </button>
        </div>
      )}
    </FortunePageLayout>
  )
}
