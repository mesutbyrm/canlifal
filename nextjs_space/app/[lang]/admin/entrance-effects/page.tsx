'use client'

import CosmeticCatalogAdmin, { TIER_OPTIONS } from '@/components/admin/cosmetic-catalog-admin'

const ASSET_TYPES = [
  { value: 'lottie', labelTr: 'Lottie (JSON)', labelEn: 'Lottie (JSON)' },
  { value: 'svga', labelTr: 'SVGA', labelEn: 'SVGA' },
  { value: 'gif', labelTr: 'GIF', labelEn: 'GIF' },
  { value: 'video', labelTr: 'Video (MP4)', labelEn: 'Video (MP4)' },
  { value: 'image', labelTr: 'Görsel (PNG)', labelEn: 'Image (PNG)' },
]

export default function AdminEntranceEffectsPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/entrance-effects',
        emoji: '🐉',
        titleTr: 'Giriş Efektleri',
        titleEn: 'Entrance Effects',
        descTr: 'Odaya giriş animasyonlarını yönetin (ejderha, meteor, kanat, taç...)',
        descEn: 'Manage room-entrance animations (dragon, meteor, wings, crown...)',
        previewField: 'assetUrl',
        fields: [
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Ejderha Girişi' },
          { name: 'assetUrl', labelTr: 'Animasyon Dosyası', labelEn: 'Animation Asset', type: 'asset', accept: '.json,.svga,.gif,.mp4,image/*,video/*' },
          { name: 'assetType', labelTr: 'Dosya Türü', labelEn: 'Asset Type', type: 'select', options: ASSET_TYPES },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: TIER_OPTIONS },
          { name: 'durationMs', labelTr: 'Süre (ms)', labelEn: 'Duration (ms)', type: 'number' },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
          { name: 'activeFrom', labelTr: 'Başlangıç (opsiyonel)', labelEn: 'Active From (optional)', type: 'datetime' },
          { name: 'activeTo', labelTr: 'Bitiş (opsiyonel)', labelEn: 'Active To (optional)', type: 'datetime' },
        ],
      }}
    />
  )
}
