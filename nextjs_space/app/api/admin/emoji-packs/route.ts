import { createCosmeticAdminHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST, DELETE } = createCosmeticAdminHandlers({
  model: 'emojiPack',
  fields: ['name', 'coverUrl', 'emojis', 'tier', 'isActive', 'sortOrder'],
  required: ['name', 'coverUrl'],
})
