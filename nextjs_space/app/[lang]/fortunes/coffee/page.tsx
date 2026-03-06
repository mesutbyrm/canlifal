'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { Coffee, Sparkles, AlertCircle, Upload, Camera, FileText, X, ImageIcon } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import Image from 'next/image'

type InputMode = 'text' | 'image'
type ImageSource = 'gallery' | 'camera'

export default function CoffeeFortunePage() {
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()
  const router = useRouter()
  
  const [inputMode, setInputMode] = useState<InputMode>('image')
  const [description, setDescription] = useState('')
  const [fortune, setFortune] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
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
      setError(language === 'tr' ? 'Sadece resim dosyaları yüklenebilir' : 'Only image files are allowed')
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
    // Get presigned URL
    const presignedRes = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        isPublic: false,
      }),
    })

    if (!presignedRes.ok) {
      throw new Error('Failed to get upload URL')
    }

    const { uploadUrl, cloud_storage_path } = await presignedRes.json()

    // Upload to S3
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!uploadRes.ok) {
      throw new Error('Failed to upload image')
    }

    return cloud_storage_path
  }

  const handleImageSubmit = async () => {
    if (!cupImage) {
      setError(language === 'tr' ? 'Lütfen fincan içi fotoğrafı yükleyin' : 'Please upload cup interior photo')
      return
    }

    setIsLoading(true)
    setError('')
    setFortune('')

    try {
      setUploadProgress(language === 'tr' ? 'Fincan fotoğrafı yükleniyor...' : 'Uploading cup photo...')
      const cupPath = await uploadImage(cupImage)
      
      let saucerPath = ''
      if (saucerImage) {
        setUploadProgress(language === 'tr' ? 'Tabak fotoğrafı yükleniyor...' : 'Uploading saucer photo...')
        saucerPath = await uploadImage(saucerImage)
      }

      setUploadProgress(language === 'tr' ? 'Falınız hazırlanıyor...' : 'Preparing your fortune...')

      const response = await fetch('/api/fortunes/coffee-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cupImagePath: cupPath,
          saucerImagePath: saucerPath || null,
          language,
        }),
      })

      if (!response?.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error || 'Failed to generate fortune')
      }

      setUploadProgress('')
      
      // Handle streaming response
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
      const response = await fetch('/api/fortunes/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, language }),
      })

      if (!response?.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error || 'Failed to generate fortune')
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
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-deep-purple-975 to-[#0a0118]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <Coffee className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'Kahve Falı' : 'Coffee Fortune'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'Fincanınızın sırlarını keşfedin' : 'Discover the secrets of your cup'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />
            5 {language === 'tr' ? 'kredi' : 'credits'}
          </p>
        </motion.div>

        {/* Mode Switcher */}
        {!fortune && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center gap-4 mb-8"
          >
            <button
              onClick={() => setInputMode('image')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-all ${
                inputMode === 'image'
                  ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                  : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-300 hover:border-gold-500/50'
              }`}
            >
              <Camera className="w-5 h-5" />
              {language === 'tr' ? 'Fotoğraf Yükle' : 'Upload Photo'}
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-all ${
                inputMode === 'text'
                  ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                  : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-300 hover:border-gold-500/50'
              }`}
            >
              <FileText className="w-5 h-5" />
              {language === 'tr' ? 'Metin Yaz' : 'Write Text'}
            </button>
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-mystical-card border border-mystical rounded-xl p-8 mystical-shadow"
        >
          {!fortune ? (
            <>
              {/* Image Source Selection Modal */}
              {showImageSourceModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowImageSourceModal(null)}>
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-deep-purple-900 border border-gold-500/30 rounded-xl p-6 max-w-sm w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-gold-500 font-serif text-xl mb-4 text-center">
                      {language === 'tr' ? 'Fotoğraf Kaynağı Seçin' : 'Select Photo Source'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          if (showImageSourceModal === 'cup') {
                            cupCameraRef.current?.click()
                          } else {
                            saucerCameraRef.current?.click()
                          }
                          setShowImageSourceModal(null)
                        }}
                        className="flex flex-col items-center gap-3 p-4 bg-deep-purple-800 hover:bg-deep-purple-700 rounded-lg border border-deep-purple-600 hover:border-gold-500/50 transition-all"
                      >
                        <Camera className="w-10 h-10 text-gold-500" />
                        <span className="text-deep-purple-100 font-medium">
                          {language === 'tr' ? 'Kamera' : 'Camera'}
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
                        className="flex flex-col items-center gap-3 p-4 bg-deep-purple-800 hover:bg-deep-purple-700 rounded-lg border border-deep-purple-600 hover:border-gold-500/50 transition-all"
                      >
                        <ImageIcon className="w-10 h-10 text-gold-500" />
                        <span className="text-deep-purple-100 font-medium">
                          {language === 'tr' ? 'Galeri' : 'Gallery'}
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={() => setShowImageSourceModal(null)}
                      className="w-full mt-4 py-2 text-deep-purple-400 hover:text-deep-purple-200 transition-colors"
                    >
                      {language === 'tr' ? 'İptal' : 'Cancel'}
                    </button>
                  </motion.div>
                </div>
              )}

              {/* Image Upload Mode */}
              {inputMode === 'image' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Cup Image Upload */}
                    <div>
                      <label className="block text-deep-purple-200 mb-3 font-medium">
                        {language === 'tr' ? 'Fincan İçi *' : 'Cup Interior *'}
                      </label>
                      <div
                        onClick={() => setShowImageSourceModal('cup')}
                        className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                          cupPreview
                            ? 'border-gold-500'
                            : 'border-deep-purple-600 hover:border-gold-500/50'
                        }`}
                      >
                        {cupPreview ? (
                          <>
                            <Image src={cupPreview} alt="Cup" fill className="object-cover" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setCupImage(null)
                                setCupPreview('')
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-deep-purple-400">
                            <div className="flex gap-2 mb-2">
                              <Camera className="w-8 h-8" />
                              <ImageIcon className="w-8 h-8" />
                            </div>
                            <p className="text-sm text-center px-4">
                              {language === 'tr' ? 'Fotoğraf çek veya galeriden seç' : 'Take photo or select from gallery'}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Hidden file inputs for gallery */}
                      <input
                        ref={cupInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'cup')}
                      />
                      {/* Hidden camera input */}
                      <input
                        ref={cupCameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'cup')}
                      />
                    </div>

                    {/* Saucer Image Upload */}
                    <div>
                      <label className="block text-deep-purple-200 mb-3 font-medium">
                        {language === 'tr' ? 'Tabak (İsteğe Bağlı)' : 'Saucer (Optional)'}
                      </label>
                      <div
                        onClick={() => setShowImageSourceModal('saucer')}
                        className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                          saucerPreview
                            ? 'border-gold-500'
                            : 'border-deep-purple-600 hover:border-gold-500/50'
                        }`}
                      >
                        {saucerPreview ? (
                          <>
                            <Image src={saucerPreview} alt="Saucer" fill className="object-cover" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSaucerImage(null)
                                setSaucerPreview('')
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-deep-purple-400">
                            <div className="flex gap-2 mb-2">
                              <Camera className="w-8 h-8" />
                              <ImageIcon className="w-8 h-8" />
                            </div>
                            <p className="text-sm text-center px-4">
                              {language === 'tr' ? 'Fotoğraf çek veya galeriden seç' : 'Take photo or select from gallery'}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Hidden file inputs for gallery */}
                      <input
                        ref={saucerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'saucer')}
                      />
                      {/* Hidden camera input */}
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

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleImageSubmit}
                    disabled={isLoading || !cupImage}
                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <LoadingSpinner message={uploadProgress || (language === 'tr' ? 'Falınız hazırlanıyor...' : 'Preparing your fortune...')} />
                    ) : (
                      <>
                        <Coffee className="w-5 h-5" />
                        {language === 'tr' ? 'Falıma Baktır' : 'Read My Fortune'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Text Mode */}
              {inputMode === 'text' && (
                <form onSubmit={handleTextSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-deep-purple-200 text-sm font-medium">
                      {language === 'tr' ? 'Fincanda ne görüyorsunuz?' : 'What do you see in the cup?'}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e?.target?.value ?? '')}
                      className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors min-h-[150px]"
                      placeholder={language === 'tr' ? 'Fincanınızdaki şekilleri, desenleri ve gördüklerinizi detaylıca anlatın...' : 'Describe the shapes, patterns, and what you see in your cup in detail...'}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !description.trim()}
                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <LoadingSpinner message={language === 'tr' ? 'Falınız hazırlanıyor...' : 'Preparing your fortune...'} />
                    ) : (
                      <>
                        <Coffee className="w-5 h-5" />
                        {language === 'tr' ? 'Falımı Gör' : 'Read My Fortune'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-gold-500 mb-4">
                <Sparkles className="w-5 h-5" />
                <h2 className="font-serif text-2xl">
                  {language === 'tr' ? 'Falınız Hazır' : 'Your Fortune is Ready'}
                </h2>
              </div>
              
              {/* Show uploaded images if available */}
              {(cupPreview || saucerPreview) && (
                <div className="flex gap-4 mb-6">
                  {cupPreview && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                      <Image src={cupPreview} alt="Cup" fill className="object-cover" />
                    </div>
                  )}
                  {saucerPreview && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                      <Image src={saucerPreview} alt="Saucer" fill className="object-cover" />
                    </div>
                  )}
                </div>
              )}
              
              <div className="prose prose-invert max-w-none">
                <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">
                  {fortune}
                </p>
              </div>
              
              <SocialShare 
                title={language === 'tr' ? 'Kahve Falı Sonucum' : 'My Coffee Fortune'} 
                text={fortune} 
              />
              
              <button
                onClick={resetForm}
                className="w-full py-3 bg-deep-purple-800 text-gold-400 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium"
              >
                {language === 'tr' ? 'Yeni Fal Baktır' : 'Get Another Reading'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
