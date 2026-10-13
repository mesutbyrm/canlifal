'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { Coffee, Sparkles, AlertCircle, Camera, FileText, X, ImageIcon, CheckCircle, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import ShareToSocial from '@/components/share-to-social'
import InstagramShare from '@/components/instagram-share'
import TextToSpeech from '@/components/text-to-speech'
import VoiceInput from '@/components/voice-input'
import FortunePageLayout from '@/components/fortune-page-layout'
import FortuneAccessGate from '@/components/fortune-access-gate'
import Image from 'next/image'
import RelatedContentLinks from '@/components/related-content-links'

type InputMode = 'text' | 'image'

export default function CoffeeFortunePage() {
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()
  const router = useRouter()
  
  const [inputMode, setInputMode] = useState<InputMode>('image')
  const [description, setDescription] = useState('')
  const [fortune, setFortune] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [adWatched, setAdWatched] = useState(false)
  
  // Image upload states
  const [cupImage, setCupImage] = useState<File | null>(null)
  const [saucerImage, setSaucerImage] = useState<File | null>(null)
  const [cupPreview, setCupPreview] = useState<string>('')
  const [saucerPreview, setSaucerPreview] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [showImageSourceModal, setShowImageSourceModal] = useState<'cup' | 'saucer' | null>(null)
  
  const cupInputRef = useRef<HTMLInputElement>(null)
  const saucerInputRef = useRef<HTMLInputElement>(null)
  const cupCameraRef = useRef<HTMLInputElement>(null)
  const saucerCameraRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (file: File, type: 'cup' | 'saucer') => {
    if (!file.type.startsWith('image/')) {
      setError('Sadece resim dosyaları yüklenebilir')
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === 'cup') {
        setCupImage(file)
        setCupPreview(reader.result as string)
      } else {
        setSaucerImage(file)
        setSaucerPreview(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
    setError('')
  }

  const uploadImage = async (file: File): Promise<string> => {
    const presignedRes = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        isPublic: false,
        folder: 'fortune',
      }),
    })

    if (!presignedRes.ok) {
      throw new Error('Yükleme bağlantısı alınamadı')
    }

    const { uploadUrl, cloud_storage_path } = await presignedRes.json()

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!uploadRes.ok) {
      throw new Error('Fotoğraf yüklenemedi')
    }

    return cloud_storage_path
  }

  const handleImageSubmit = async () => {
    if (!cupImage) {
      setError('Lütfen fincan içi fotoğrafı yükleyin')
      return
    }

    setIsLoading(true)
    setError('')
    setFortune('')

    try {
      setUploadProgress('Fincan fotoğrafı yükleniyor...')
      const cupPath = await uploadImage(cupImage)
      
      let saucerPath = ''
      if (saucerImage) {
        setUploadProgress('Tabak fotoğrafı yükleniyor...')
        saucerPath = await uploadImage(saucerImage)
      }

      setUploadProgress('Falınız hazırlanıyor...')

      const response = await fetch('/api/fortunes/kahve-fali-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cupImagePath: cupPath,
          saucerImagePath: saucerPath || null,
          language, adWatched }),
      })

      if (!response?.ok) {
        let errorMsg = 'Fal yorumu oluşturulamadı'
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            const errorData = await response.json()
            errorMsg = errorData?.error || errorMsg
          }
        } catch (_) {}
        throw new Error(errorMsg)
      }

      setUploadProgress('')
      
      const reader = response?.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = (await reader?.read()) ?? { done: true, value: undefined }
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed?.choices?.[0]?.delta?.content || ''
              if (content) {
                fullText += content
                setFortune(fullText)
              }
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

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFortune('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/fortunes/kahve-fali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, language }),
      })

      if (!response?.ok) {
        let errorMsg = 'Fal yorumu oluşturulamadı'
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            const errorData = await response.json()
            errorMsg = errorData?.error || errorMsg
          }
        } catch (_) {}
        throw new Error(errorMsg)
      }

      const reader = response?.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = (await reader?.read()) ?? { done: true, value: undefined }
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed?.choices?.[0]?.delta?.content || ''
              if (content) {
                fullText += content
                setFortune(fullText)
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('message.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFortune('')
    setDescription('')
    setCupImage(null)
    setSaucerImage(null)
    setCupPreview('')
    setSaucerPreview('')
    router.refresh()
  }

  return (
    <FortunePageLayout
      title="Kahve Falı"
      titleEn="Coffee Fortune"
      subtitle="Fincanınızın sırlarını keşfedin"
      subtitleEn="Discover the secrets of your cup"
      icon={Coffee}
      cost={5}
    >
      {/* Image Source Selection Modal */}
      <AnimatePresence>
        {showImageSourceModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
            onClick={() => setShowImageSourceModal(null)}
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
                  onClick={() => {
                    if (showImageSourceModal === 'cup') {
                      cupCameraRef.current?.click()
                    } else {
                      saucerCameraRef.current?.click()
                    }
                    setShowImageSourceModal(null)
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-deep-purple-800 hover:bg-deep-purple-700 rounded-xl border border-deep-purple-600 hover:border-gold-500/50 transition-all"
                >
                  <Camera className="w-8 h-8 text-gold-500" />
                  <span className="text-deep-purple-100 text-sm font-medium">
                    {'Kamera'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (showImageSourceModal === 'cup') {
                      cupInputRef.current?.click()
                    } else {
                      saucerInputRef.current?.click()
                    }
                    setShowImageSourceModal(null)
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-deep-purple-800 hover:bg-deep-purple-700 rounded-xl border border-deep-purple-600 hover:border-gold-500/50 transition-all"
                >
                  <ImageIcon className="w-8 h-8 text-gold-500" />
                  <span className="text-deep-purple-100 text-sm font-medium">
                    {'Galeri'}
                  </span>
                </button>
              </div>
              <button
                onClick={() => setShowImageSourceModal(null)}
                className="w-full mt-4 py-2 text-deep-purple-400 hover:text-deep-purple-200 transition-colors text-sm"
              >
                {'İptal'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!fortune ? (
        <div className="space-y-5">
          {/* Mode Switcher */}
          <div className="flex gap-2 p-1 bg-deep-purple-900/50 rounded-xl">
            <button
              onClick={() => setInputMode('image')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                inputMode === 'image'
                  ? 'bg-gold-400 text-black'
                  : 'text-deep-purple-200 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{'Fotoğraf'}</span>
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-gold-400 text-black'
                  : 'text-deep-purple-200 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{'Metin'}</span>
            </button>
          </div>

          {/* Error Message */}
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

          {/* Image Upload Mode */}
          {inputMode === 'image' && (
            <div className="space-y-4">
              {/* Image Upload Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Cup Image */}
                <div>
                  <label className="block text-deep-purple-200 mb-2 text-sm font-medium">
                    {'Fincan İçi'}
                    <span className="text-gold-500 ml-1">*</span>
                  </label>
                  <div
                    onClick={() => setShowImageSourceModal('cup')}
                    className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                      cupPreview
                        ? 'border-gold-500 bg-gold-500/5'
                        : 'border-deep-purple-600 hover:border-gold-500/50 bg-deep-purple-900/30'
                    }`}
                  >
                    {cupPreview ? (
                      <>
                        <Image src={cupPreview} alt="Cup" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/20" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCupImage(null)
                            setCupPreview('')
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-green-500/90 text-white text-xs py-1 px-2 rounded-full flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>{'Yüklendi'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-deep-purple-400 p-3">
                        <Camera className="w-8 h-8 mb-2" />
                        <p className="text-xs text-center">
                          {'Dokunun'}
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={cupInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'cup')}
                  />
                  <input
                    ref={cupCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'cup')}
                  />
                </div>

                {/* Saucer Image */}
                <div>
                  <label className="block text-deep-purple-200 mb-2 text-sm font-medium">
                    {'Tabak'}
                    <span className="text-deep-purple-500 ml-1 text-xs">({'opsiyonel'})</span>
                  </label>
                  <div
                    onClick={() => setShowImageSourceModal('saucer')}
                    className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                      saucerPreview
                        ? 'border-gold-500 bg-gold-500/5'
                        : 'border-deep-purple-600 hover:border-gold-500/50 bg-deep-purple-900/30'
                    }`}
                  >
                    {saucerPreview ? (
                      <>
                        <Image src={saucerPreview} alt="Saucer" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/20" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSaucerImage(null)
                            setSaucerPreview('')
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-green-500/90 text-white text-xs py-1 px-2 rounded-full flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>{'Yüklendi'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-deep-purple-400 p-3">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <p className="text-xs text-center">
                          {'Dokunun'}
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={saucerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'saucer')}
                  />
                  <input
                    ref={saucerCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'saucer')}
                  />
                </div>
              </div>

              {/* Tips */}
              <div className="bg-deep-purple-900/30 border border-deep-purple-700/50 rounded-xl p-3 sm:p-4">
                <p className="text-deep-purple-300 text-xs sm:text-sm">
                  💡 {'En iyi sonuç için fincanı iyi aydınlatılmış bir ortamda ve net bir şekilde çekin.'}
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleImageSubmit}
                disabled={isLoading || !cupImage}
                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoading ? (
                  <LoadingSpinner message={uploadProgress || ('Falınız hazırlanıyor...')} />
                ) : (
                  <>
                    <Coffee className="w-5 h-5" />
                    {'Falıma Baktır'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Text Mode */}
          {inputMode === 'text' && (
            <FortuneAccessGate fortuneType="coffee" cost={5} onAccessGranted={() => setAdWatched(true)}>

            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <label className="text-deep-purple-200 text-sm font-medium flex items-center justify-between mb-2">
                  <span>{'Fincanda ne görüyorsunuz?'}</span>
                  <VoiceInput 
                    onTranscript={(text) => setDescription(prev => prev + ' ' + text)}
                    disabled={isLoading}
                  />
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e?.target?.value ?? '')}
                  className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-500/50 transition-colors min-h-[120px] sm:min-h-[150px] text-sm sm:text-base resize-none"
                  placeholder={'Fincanınızdaki şekilleri, desenleri ve gördüklerinizi detaylıca anlatın...'}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !description.trim()}
                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoading ? (
                  <LoadingSpinner message={'Falınız hazırlanıyor...'} />
                ) : (
                  <>
                    <Coffee className="w-5 h-5" />
                    {'Falımı Gör'}
                  </>
                )}
              </button>
            </form>
            </FortuneAccessGate>
          )}
        </div>
      ) : (
        /* Fortune Result */
        <div className="space-y-5">
          {/* Success Header */}
          <div className="flex items-center gap-2 text-gold-500">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-serif text-xl sm:text-2xl">
              {'Falınız Hazır'}
            </h2>
          </div>
          
          {/* Uploaded Images Preview */}
          {(cupPreview || saucerPreview) && (
            <div className="flex gap-3 pb-4 border-b border-deep-purple-700/50">
              {cupPreview && (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gold-500/30">
                  <Image src={cupPreview} alt="Cup" fill className="object-cover" />
                </div>
              )}
              {saucerPreview && (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gold-500/30">
                  <Image src={saucerPreview} alt="Saucer" fill className="object-cover" />
                </div>
              )}
            </div>
          )}
          
          {/* Fortune Content */}
          <div className="bg-deep-purple-900/30 rounded-xl p-4 sm:p-5 border border-deep-purple-700/30">
            <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {fortune}
            </p>
          </div>
          
          {/* Text to Speech */}
          <TextToSpeech text={fortune} />
          
          {/* Share Buttons */}
          <div className="flex flex-wrap gap-2">
            <InstagramShare sharerName={(session as any)?.user?.name || 'Misafir'} resultMessage={fortune} fortuneType="coffee" />
            <ShareToSocial fortuneType="coffee" content={fortune} />
            <SocialShare 
              title={'Kahve Falı Sonucum'} 
              text={fortune} 
            />
          </div>
          
          {/* New Fortune Button */}
          <button
            onClick={resetForm}
            className="w-full py-3 sm:py-4 bg-deep-purple-800 hover:bg-deep-purple-700 text-gold-400 rounded-xl transition-all font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RotateCcw className="w-4 h-4" />
            {'Yeni Fal Baktır'}
          </button>
        </div>
      )}

        <RelatedContentLinks
          currentSlug="kahve-fali"
          relatedSlugs={['tarot-fali', 'katina', 'el-fali', 'ruya-yorumu', 'ruya-sozlugu']}
          introText="Kahve falı yorumları hakkında daha fazla bilgi almak ve diğer fal türlerini keşfetmek için aşağıdaki bağlantıları inceleyebilirsiniz."
        />
    </FortunePageLayout>
  )
}
