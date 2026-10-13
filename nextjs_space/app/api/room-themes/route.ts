import { createCosmeticPublicHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

// List-only catalog (room owner picks per-room; seasonal window respected)
export const { GET } = createCosmeticPublicHandlers({
  model: 'roomTheme',
  seasonal: true,
})
