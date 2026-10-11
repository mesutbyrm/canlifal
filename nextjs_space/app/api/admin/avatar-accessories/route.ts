import { createCosmeticAdminHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST, DELETE } = createCosmeticAdminHandlers({
  model: 'avatarAccessory',
  fields: ['name', 'slot', 'assetUrl', 'tier', 'isActive', 'sortOrder'],
  required: ['name', 'assetUrl'],
})
