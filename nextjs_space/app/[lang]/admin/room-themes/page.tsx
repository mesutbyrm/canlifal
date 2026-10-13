'use client'

import CosmeticCatalogAdmin from '@/components/admin/cosmetic-catalog-admin'

const ASSET_TYPES = [
  { value: 'image', labelTr: 'Görsel', labelEn: 'Image' },
  { value: 'lottie', labelTr: 'Lottie (JSON)', labelEn: 'Lottie (JSON)' },
  { value: 'video', labelTr: 'Video (MP4)', labelEn: 'Video (MP4)' },
]

const ROOM_TIERS = [
  { value: 'free', labelTr: 'Ücretsiz (Herkes)', labelEn: 'Free (Everyone)' },
  { value: 'gold', labelTr: 'Gold Üyelik', labelEn: 'Gold Membership' },
]

export default function AdminRoomThemesPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/room-themes',
        emoji: '🌌',
        titleTr: 'Oda Temaları',
        titleEn: 'Room Themes',
        descTr: 'Sesli oda arka plan temalarını yönetin (uzay, galaksi, mevsimsel...)',
        descEn: 'Manage voice-room background themes (space, galaxy, seasonal...)',
        previewField: 'backgroundUrl',
        fields: [
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Galaksi' },
          { name: 'backgroundUrl', labelTr: 'Arka Plan Dosyası', labelEn: 'Background Asset', type: 'asset', accept: '.json,image/*,video/*' },
          { name: 'assetType', labelTr: 'Dosya Türü', labelEn: 'Asset Type', type: 'select', options: ASSET_TYPES },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: ROOM_TIERS },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
          { name: 'activeFrom', labelTr: 'Başlangıç (mevsimsel, ops.)', labelEn: 'Active From (seasonal, opt.)', type: 'datetime' },
          { name: 'activeTo', labelTr: 'Bitiş (mevsimsel, ops.)', labelEn: 'Active To (seasonal, opt.)', type: 'datetime' },
        ],
      }}
    />
  )
}
