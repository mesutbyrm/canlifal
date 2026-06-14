'use client'

import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Video, X, Loader2, CheckCircle, AlertCircle,
  ChevronLeft, Film, FileVideo
} from 'lucide-react'
import Link from 'next/link'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_DURATION_SEC = 15

export default function VideoYuklePage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') router.push('/giris')
    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    setSuccess(false)

    if (!file.type.includes('mp4') && !file.type.includes('video/mp4')) {
      setError('Sadece MP4 formatı kabul edilir')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Dosya boyutu en fazla 10MB olabilir')
      return
    }

    // Create preview and check duration
    const url = URL.createObjectURL(file)
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    videoEl.onloadedmetadata = () => {
      setVideoDuration(Math.round(videoEl.duration))
      if (videoEl.duration > MAX_DURATION_SEC) {
        setError(`Video süresi en fazla ${MAX_DURATION_SEC} saniye olabilir (${Math.round(videoEl.duration)}s)`)
        URL.revokeObjectURL(url)
        return
      }
      setSelectedFile(file)
      setPreviewUrl(url)
    }
    videoEl.onerror = () => {
      setSelectedFile(file)
      setPreviewUrl(url)
    }
    videoEl.src = url
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('video', selectedFile)
      if (description.trim()) formData.append('description', description.trim())

      setProgress(30)

      const res = await fetch('/api/short-videos/upload', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Video yüklenemedi')
      }

      setProgress(100)
      setSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Video yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setVideoDuration(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#120020] to-[#0a0015] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#120020] to-[#0a0015] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0015]/90 backdrop-blur-xl border-b border-purple-500/10">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-purple-800/30 transition">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-fuchsia-400" />
            Video Yükle
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Success state */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center"
            >
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Video Yüklendi! 🎉</h3>
              <p className="text-emerald-300/80 text-sm">Videonuz başarıyla yüklendi ve yayında.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!success && (
          <>
            {/* Drop zone / File selector */}
            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-500/30 rounded-2xl p-12 text-center cursor-pointer hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all group"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-fuchsia-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Video Seçin veya Sürükleyin</h3>
                <p className="text-purple-300/60 text-sm mb-3">
                  MP4 formatı • Maksimum 10MB • En fazla {MAX_DURATION_SEC} saniye
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-medium">
                  <FileVideo className="w-4 h-4" />
                  Dosya Seç
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative rounded-2xl overflow-hidden bg-black">
                  {previewUrl && (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full max-h-[400px] object-contain mx-auto"
                      playsInline
                    />
                  )}
                  <button
                    onClick={clearFile}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {/* File info */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    {videoDuration && (
                      <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                        {videoDuration}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Açıklama (opsiyonel)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    placeholder="Videonuz hakkında bir şeyler yazın..."
                    rows={3}
                    className="w-full bg-purple-900/20 border border-purple-500/20 rounded-xl px-4 py-3 text-white placeholder-purple-400/40 focus:border-fuchsia-500/50 focus:outline-none resize-none text-sm"
                  />
                  <p className="text-right text-[11px] text-purple-400/50 mt-1">{description.length}/500</p>
                </div>

                {/* Upload button */}
                <motion.button
                  onClick={handleUpload}
                  disabled={uploading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-500/25"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Yükleniyor... %{progress}
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Videoyu Yükle
                    </>
                  )}
                </motion.button>

                {/* Progress bar */}
                {uploading && (
                  <div className="w-full h-1.5 bg-purple-900/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Info */}
            <div className="bg-purple-900/20 border border-purple-500/10 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-purple-200 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-fuchsia-400" /> Video Kuralları
              </h4>
              <ul className="space-y-1.5 text-xs text-purple-300/70">
                <li>• Sadece MP4 formatı kabul edilir</li>
                <li>• Maksimum dosya boyutu: 10MB</li>
                <li>• Maksimum video süresi: {MAX_DURATION_SEC} saniye</li>
                <li>• Uygunsuz içerik yüklemek yasaktır</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
