export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiValidation } from '@/lib/api-response'
import { resolveDeepLink, buildDeepLink, DeepLinkType } from '@/lib/deeplink'

/**
 * GET /api/v1/deeplink/resolve
 *
 * İki kullanım:
 *   1) ?url=canlifal://teller/abc  veya  ?url=https://canlifal.com/tr/fal/xyz
 *      → verilen bağlantıyı hedef tipe/yola çözümler.
 *   2) ?type=teller&value=abc
 *      → belirtilen varlık için web yolu + uygulama URI'si üretir.
 *
 * Salt gözlem/yardımcı uç; hiçbir veri yazmaz. Kimlik gerektirmez.
 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const linkParam = url.searchParams.get('url')
    const typeParam = url.searchParams.get('type')
    const valueParam = url.searchParams.get('value') || ''

    if (linkParam) {
      const resolved = resolveDeepLink(linkParam)
      if (!resolved) {
        return apiError('NOT_FOUND', 'Bağlantı çözümlenemedi', 404)
      }
      return apiSuccess({ resolved })
    }

    if (typeParam) {
      const built = buildDeepLink(typeParam as DeepLinkType, {
        id: valueParam,
        slug: valueParam,
        username: valueParam,
        userId: valueParam,
      })
      return apiSuccess({ resolved: built })
    }

    return apiValidation('`url` veya `type` parametresi gerekli')
  } catch (e) {
    console.error('[Deeplink] resolve error:', e)
    return apiError('INTERNAL_ERROR', 'Bağlantı çözümlenemedi', 500)
  }
}
