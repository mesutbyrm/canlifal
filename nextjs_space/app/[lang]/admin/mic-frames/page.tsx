'use client'

import CosmeticCatalogAdmin, { TIER_OPTIONS } from '@/components/admin/cosmetic-catalog-admin'

export default function AdminMicFramesPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/mic-frames',
        emoji: '🎤',
        titleTr: 'Mikrofon Çerçeveleri',
        titleEn: 'Microphone Frames',
        descTr: 'Sesli oda koltuğu mikrofon çerçevelerini yönetin',
        descEn: 'Manage voice-room mic seat frames',
        previewField: 'assetUrl',
        fields: [
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Neon Mikrofon' },
          { name: 'assetUrl', labelTr: 'Çerçeve Görseli (PNG/Lottie)', labelEn: 'Frame Asset (PNG/Lottie)', type: 'asset', accept: '.json,image/*' },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: TIER_OPTIONS },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
        ],
      }}
    />
  )
}
