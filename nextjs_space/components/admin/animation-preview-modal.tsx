'use client'

import { X } from 'lucide-react'
import { motion } from 'framer-motion'

export interface PreviewAnimation {
  id?: string
  name?: string
  category?: string
  type?: string
  assetUrl?: string | null
  previewUrl?: string | null
  thumbnailUrl?: string | null
  soundUrl?: string | null
  durationMs?: number
  position?: string
  scale?: string
  anchor?: string
  membershipLevel?: string | null
  priority?: number
}

const POSITION_CLASS: Record<string, string> = {
  top_left: 'top-3 left-3 items-start justify-start',
  top_center: 'top-3 left-1/2 -translate-x-1/2 items-start justify-center',
  top_right: 'top-3 right-3 items-start justify-end',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
  bottom_left: 'bottom-3 left-3 items-end justify-start',
  bottom_right: 'bottom-3 right-3 items-end justify-end',
  seat: 'top-[38%] left-[22%] items-center justify-center',
}

const SCALE_SIZE: Record<string, string> = {
  small: 'w-24 h-24',
  medium: 'w-40 h-40',
  large: 'w-64 h-64',
}

/** Sesli oda maketi üzerinde animasyon önizlemesi (spec: ÖNİZLEME) */
export default function AnimationPreviewModal({
  animation,
  onClose,
  isTr = true,
}: {
  animation: PreviewAnimation | null
  onClose: () => void
  isTr?: boolean
}) {
  if (!animation) return null

  const src = animation.previewUrl || animation.assetUrl || animation.thumbnailUrl || ''
  const type = (animation.type || '').toLowerCase()
  const posClass = POSITION_CLASS[animation.position || 'center'] || POSITION_CLASS.center
  const sizeClass = SCALE_SIZE[animation.scale || 'medium'] || SCALE_SIZE.medium
  const seats = Array.from({ length: 15 })

  const renderAsset = () => {
    if (!src) {
      return (
        <div className={`${sizeClass} rounded-2xl bg-purple-500/30 border border-purple-300/40 flex items-center justify-center text-white text-xs text-center p-2`}>
          {isTr ? 'Dosya yok' : 'No asset'}
        </div>
      )
    }
    if (type === 'video') {
      return <video src={src} autoPlay loop muted playsInline className={`${sizeClass} object-contain drop-shadow-2xl`} />
    }
    if (type === 'lottie' || type === 'svga') {
      const fallback = animation.previewUrl || animation.thumbnailUrl
      if (fallback) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={fallback} alt={animation.name || 'animasyon'} className={`${sizeClass} object-contain drop-shadow-2xl`} />
      }
      return (
        <div className={`${sizeClass} rounded-2xl bg-purple-600/40 border border-purple-300/40 flex items-center justify-center text-white text-[11px] text-center p-2`}>
          {isTr ? `${type.toUpperCase()} dosyası — önizleme görseli yükleyin` : `${type.toUpperCase()} asset — upload a preview image`}
        </div>
      )
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={animation.name || 'animasyon'} className={`${sizeClass} object-contain drop-shadow-2xl`} />
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl rounded-2xl border border-purple-700/40 bg-[#150a24] p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{animation.name || (isTr ? 'Animasyon önizleme' : 'Animation preview')}</h3>
            <p className="text-xs text-purple-300 mt-1">
              {animation.category} · {animation.type} · {animation.durationMs ?? 3000}ms · {isTr ? 'öncelik' : 'priority'} {animation.priority ?? 10}
              {animation.membershipLevel ? ` · ${animation.membershipLevel}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sesli oda maketi */}
        <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-purple-800/50 bg-gradient-to-b from-[#2a1150] via-[#1b0b33] to-[#120722]">
          <div className="absolute inset-x-0 top-0 h-10 bg-black/30 flex items-center justify-between px-3">
            <span className="text-[11px] text-purple-200 font-semibold">CanlIFal · {isTr ? 'Sesli Oda' : 'Voice Room'}</span>
            <span className="text-[11px] text-purple-300">15 {isTr ? 'koltuk' : 'seats'}</span>
          </div>

          <div className="absolute inset-x-0 top-12 px-4">
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {seats.map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border ${
                      i === 0 ? 'border-yellow-400/70 bg-yellow-500/15' : i >= 11 ? 'border-pink-400/50 bg-pink-500/10' : 'border-purple-400/30 bg-white/5'
                    }`}
                  />
                  <span className="text-[9px] text-purple-300/70">{i === 0 ? (isTr ? 'Sahip' : 'Owner') : i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-12 bg-black/40 flex items-center px-3 gap-2">
            <div className="h-6 flex-1 rounded-full bg-white/5 border border-white/10" />
            <div className="w-8 h-8 rounded-full bg-purple-600/60" />
          </div>

          {/* Animasyon katmanı */}
          <div className={`absolute flex ${posClass} pointer-events-none`}>{renderAsset()}</div>
        </div>

        <p className="text-[11px] text-purple-300/70 mt-3">
          {isTr
            ? 'Bu maket, animasyonun sesli oda ekranındaki konum / ölçek ayarını göstermek içindir. Gerçek oynatma istemci tarafinda yapilir.'
            : 'This mockup shows the position / scale of the animation on the voice room screen. Actual playback happens on the client.'}
        </p>
        {animation.soundUrl ? (
          <audio src={animation.soundUrl} controls className="w-full mt-3 h-9" />
        ) : null}
      </motion.div>
    </div>
  )
}
