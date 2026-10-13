'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FramedAvatarProps {
  src: string | null | undefined
  alt?: string
  size?: number // pixel size of the avatar
  frameUrl?: string | null
  className?: string
  onClick?: () => void
  fallbackInitial?: string
  borderColor?: string // optional border color class like 'border-purple-500'
}

export default function FramedAvatar({
  src,
  alt = 'Avatar',
  size = 48,
  frameUrl,
  className = '',
  onClick,
  fallbackInitial,
  borderColor,
}: FramedAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const hasImage = !imgError && !!src
  const initial = fallbackInitial || alt?.charAt(0)?.toUpperCase() || 'U'

  if (frameUrl) {
    // With frame: frame is 35% larger than the avatar
    const frameSize = Math.round(size * 1.35)
    const avatarInset = Math.round((frameSize - size) / 2)

    return (
      <div
        className={`relative inline-flex items-center justify-center flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ width: frameSize, height: frameSize }}
        onClick={onClick}
      >
        {/* Avatar (behind the frame) */}
        <div
          className="absolute rounded-full overflow-hidden bg-purple-900/50"
          style={{
            width: size,
            height: size,
            top: avatarInset,
            left: avatarInset,
          }}
        >
          {hasImage ? (
            <Image
              src={src!}
              alt={alt}
              width={size}
              height={size}
              className="object-cover w-full h-full"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
                {initial}
              </span>
            </div>
          )}
        </div>

        {/* Frame overlay (on top, transparent center lets avatar show through) */}
        <Image
          src={frameUrl}
          alt="Çerçeve"
          width={frameSize}
          height={frameSize}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
          unoptimized
        />
      </div>
    )
  }

  // Without frame: simple circular avatar
  const borderCls = borderColor || 'border-purple-500/50'
  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden border-2 ${borderCls} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {hasImage ? (
        <Image
          src={src!}
          alt={alt}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
          unoptimized
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  )
}