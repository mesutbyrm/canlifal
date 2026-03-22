'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FramedAvatarProps {
  src: string | null | undefined
  alt?: string
  size?: number // pixel size
  frameUrl?: string | null
  className?: string
  onClick?: () => void
}

export default function FramedAvatar({ src, alt = 'Avatar', size = 48, frameUrl, className = '', onClick }: FramedAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const avatarSrc = imgError || !src ? '/default-avatar.png' : src
  
  // Frame is slightly larger than avatar to create border effect
  const frameSize = size + Math.round(size * 0.35)
  const frameOffset = Math.round((frameSize - size) / 2)

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: frameUrl ? frameSize : size, height: frameUrl ? frameSize : size }}
      onClick={onClick}
    >
      {/* Avatar */}
      <div
        className="rounded-full overflow-hidden bg-purple-900/50"
        style={{
          width: size,
          height: size,
          position: frameUrl ? 'absolute' : 'relative',
          top: frameUrl ? frameOffset : undefined,
          left: frameUrl ? frameOffset : undefined,
        }}
      >
        <Image
          src={avatarSrc}
          alt={alt}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>

      {/* Frame overlay */}
      {frameUrl && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ width: frameSize, height: frameSize }}
        >
          <Image
            src={frameUrl}
            alt="Profil çerçevesi"
            width={frameSize}
            height={frameSize}
            className="object-contain w-full h-full"
            unoptimized
          />
        </div>
      )}
    </div>
  )
}
