'use client'

import CosmeticCatalogAdmin, { TIER_OPTIONS } from '@/components/admin/cosmetic-catalog-admin'

export default function AdminNameEffectsPage() {
  return (
    <CosmeticCatalogAdmin
      config={{
        endpoint: '/api/admin/name-effects',
        emoji: '✨',
        titleTr: 'İsim Yazısı Efektleri',
        titleEn: 'Name Text Effects',
        descTr: 'Kullanıcı isim yazısı efektlerini yönetin (altın, neon, rainbow, hologram...)',
        descEn: 'Manage username text effects (gold, neon, rainbow, hologram...)',
        previewField: undefined,
        fields: [
          { name: 'key', labelTr: 'Anahtar (benzersiz)', labelEn: 'Key (unique)', type: 'text', placeholder: 'gold' },
          { name: 'name', labelTr: 'İsim', labelEn: 'Name', type: 'text', placeholder: 'Altın Yazı' },
          { name: 'tier', labelTr: 'Seviye', labelEn: 'Tier', type: 'select', options: TIER_OPTIONS },
          { name: 'sortOrder', labelTr: 'Sıralama', labelEn: 'Sort Order', type: 'number' },
          { name: 'cssPreset', labelTr: 'Stil Parametreleri (JSON)', labelEn: 'Style Params (JSON)', type: 'textarea', full: true, placeholder: '{"gradient":["#FFD700","#FFA500"],"animation":"shine"}' },
        ],
      }}
    />
  )
}
