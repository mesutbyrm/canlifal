import { createCosmeticAdminHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST, DELETE } = createCosmeticAdminHandlers({
  model: 'nameEffect',
  fields: ['key', 'name', 'tier', 'cssPreset', 'isActive', 'sortOrder'],
  required: ['key', 'name'],
})
