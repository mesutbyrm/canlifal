import { createCosmeticPublicHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

// List-only catalog (no per-user selection)
export const { GET } = createCosmeticPublicHandlers({
  model: 'emojiPack',
})
