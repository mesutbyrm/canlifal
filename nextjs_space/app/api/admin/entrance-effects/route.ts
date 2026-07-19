import { createCosmeticAdminHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST, DELETE } = createCosmeticAdminHandlers({
  model: 'entranceEffect',
  fields: ['name', 'assetUrl', 'assetType', 'tier', 'durationMs', 'isActive', 'sortOrder', 'activeFrom', 'activeTo'],
  required: ['name', 'assetUrl'],
  userNullFields: ['entranceEffectId'],
})
