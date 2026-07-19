'use client'

import CosmeticCatalogAdmin, { TIER_OPTIONS } from '@/components/admin/cosmetic-catalog-admin'

export default function AdminEmojiPacksPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/emoji-packs',
        emoji: '😄',
        titleTr: 'Emoji Paketleri',
        titleEn: 'Emoji Packs',
        descTr: 'Sohbet emoji paketlerini yönetin (JSON emoji listesi)',
        descEn: 'Manage chat emoji packs (JSON emoji list)',
        previewField: 'coverUrl',
        fields: [
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Sevimli Paket' },
          { name: 'coverUrl', labelTr: 'Kapak Görseli', labelEn: 'Cover Image', type: 'asset', accept: 'image/*' },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: TIER_OPTIONS },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
          { name: 'emojis', labelTr: 'Emojiler (JSON dizi)', labelEn: 'Emojis (JSON array)', type: 'textarea', full: true, placeholder: '[{"key":":kalp:","imageUrl":"https://images.emojiterra.com/google/noto-emoji/animated-emoji/1f60d.gif"}]' },
        ],
      }}
    />
  )
}
