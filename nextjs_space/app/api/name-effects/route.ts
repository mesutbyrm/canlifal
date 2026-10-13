import { createCosmeticPublicHandlers } from '@/lib/cosmetics'

export const dynamic = 'force-dynamic'

export const { GET, POST } = createCosmeticPublicHandlers({
  model: 'nameEffect',
  userField: 'nameEffect',
  selectValueField: 'key',
})
