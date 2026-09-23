'use client'

import { useState } from 'react'

/**
 * Shared gift preview renderer used by every gift picker (voice room, live
 * broadcast, video watch). It renders the correct visual for each gift format
 * so video (mp4/webm) gifts NEVER appear as a broken little square:
 *   - previewUrl / thumbnail present -> <img> poster
 *   - video without a poster         -> muted autoplay looping <video>
 *   - static image path (/...)       -> <img>
 *   - otherwise                      -> emoji glyph
 */
export interface GiftThumbData {
  id?: string
  name?: string
  icon?: string | null
  mediaType?: string | null
  previewUrl?: string | null
  thumbnailUrl?: string | null
  fileUrl?: string | null
  assetUrl?: string | null
  /** Optional static fallback map lookup (legacy GIFT_IMAGES). */
  fallbackImg?: string | null
}

export function GiftThumb({
  gift,
  className = 'w-10 h-10 object-contain',
}: {
  gift: GiftThumbData
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  const mediaType = (gift.mediaType || '').toLowerCase()
  const poster = gift.previewUrl || gift.thumbnailUrl || null
  const videoSrc = gift.fileUrl || gift.assetUrl || null
  const iconPath = gift.icon && gift.icon.startsWith('/') ? gift.icon : null
  const staticImg = poster || iconPath || gift.fallbackImg || null

  // 1) Any usable static image (poster / icon path / legacy fallback).
  if (staticImg && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        loading="lazy"
        src={staticImg}
        alt={gift.name || 'Hediye'}
        className={className}
        onError={() => setFailed(true)}
      />
    )
  }

  // 2) Video gift without a poster -> inline muted looping preview.
  if (mediaType === 'video' && videoSrc) {
    return (
      <video
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={className}
        style={{ objectFit: 'contain' }}
      />
    )
  }

  // 3) Emoji glyph fallback.
  return <span className="text-2xl">{gift.icon || '🎁'}</span>
}
