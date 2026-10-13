import { createCosmeticAdminHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST, DELETE } = createCosmeticAdminHandlers({
  model: 'roomTheme',
  fields: ['name', 'backgroundUrl', 'assetType', 'tier', 'isActive', 'sortOrder', 'activeFrom', 'activeTo'],
  required: ['name', 'backgroundUrl'],
})
