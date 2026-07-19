import { createCosmeticAdminHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST, DELETE } = createCosmeticAdminHandlers({
  model: 'chatBubbleSkin',
  fields: ['name', 'assetUrl', 'tier', 'isActive', 'sortOrder'],
  required: ['name', 'assetUrl'],
  userNullFields: ['chatBubbleId'],
})
