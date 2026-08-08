import { NextRequest } from 'next/server'
import { POST as tencentWebhookPOST } from '@/app/api/tencent/webhook/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trtc/webhook — kanonik TRTC olay geri-çağırma ucu.
 *
 * Aynı uygulamayı /api/tencent/webhook ile paylaşır. Sağlayıcı panelinde
 * kayıtlı eski URL (/api/tencent/webhook) çalışmaya devam eder; kesinti
 * olmaması için iki yol da açık tutulur.
 */
export async function POST(request: NextRequest) {
  return tencentWebhookPOST(request)
}
