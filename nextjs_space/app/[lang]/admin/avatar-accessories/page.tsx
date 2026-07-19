'use client'

import CosmeticCatalogAdmin, { TIER_OPTIONS } from '@/components/admin/cosmetic-catalog-admin'

const SLOTS = [
  { value: 'hat', labelTr: 'Şapka', labelEn: 'Hat' },
  { value: 'crown', labelTr: 'Taç', labelEn: 'Crown' },
  { value: 'glasses', labelTr: 'Gözlük', labelEn: 'Glasses' },
  { value: 'wings', labelTr: 'Kanat', labelEn: 'Wings' },
  { value: 'mask', labelTr: 'Maske', labelEn: 'Mask' },
  { value: 'other', labelTr: 'Diğer', labelEn: 'Other' },
]

export default function AdminAvatarAccessoriesPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/avatar-accessories',
        emoji: '👑',
        titleTr: 'Avatar Aksesuarları',
        titleEn: 'Avatar Accessories',
        descTr: 'Avatar üstü aksesuarları yönetin (şapka, taç, gözlük, kanat...)',
        descEn: 'Manage avatar overlays (hat, crown, glasses, wings...)',
        previewField: 'assetUrl',
        fields: [
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Altın Taç' },
          { name: 'slot', labelTr: 'Slot', labelEn: 'Slot', type: 'select', options: SLOTS },
          { name: 'assetUrl', labelTr: 'Aksesuar Görseli (PNG)', labelEn: 'Accessory Image (PNG)', type: 'asset', accept: 'image/*' },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: TIER_OPTIONS },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
        ],
      }}
    />
  )
}
