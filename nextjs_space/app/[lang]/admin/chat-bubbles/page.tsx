'use client'

import CosmeticCatalogAdmin, { TIER_OPTIONS } from '@/components/admin/cosmetic-catalog-admin'

export default function AdminChatBubblesPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/chat-bubbles',
        emoji: '💬',
        titleTr: 'Sohbet Balonu Skinleri',
        titleEn: 'Chat Bubble Skins',
        descTr: 'Mesaj balonu arka plan skinlerini yönetin',
        descEn: 'Manage chat message bubble skins',
        previewField: 'assetUrl',
        fields: [
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Altın Balon' },
          { name: 'assetUrl', labelTr: 'Balon Görseli (PNG)', labelEn: 'Bubble Image (PNG)', type: 'asset', accept: 'image/*' },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: TIER_OPTIONS },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
        ],
      }}
    />
  )
}
