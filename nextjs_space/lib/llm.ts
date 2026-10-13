/**
 * LLM API helper with retry logic and timeout handling
 */

const LLM_API_URL = 'https://routellm.abacus.ai/v1/chat/completions'
const MAX_RETRIES = 2
const TIMEOUT_MS = 30000 // 30 seconds

interface LLMMessage {
  role: string
  content: any
}

interface LLMOptions {
  model?: string
  messages: LLMMessage[]
  stream?: boolean
  max_tokens?: number
  temperature?: number
}

export async function callLLM(options: LLMOptions): Promise<Response> {
  const { model = 'gpt-4.1-nano', messages, stream = true, max_tokens = 500, temperature } = options
  
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const body: any = { model, messages, stream, max_tokens }
      if (temperature !== undefined) body.temperature = temperature

      const response = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return response
      }

      lastError = new Error(`LLM API returned ${response.status}`)
      console.error(`LLM API attempt ${attempt + 1} failed with status ${response.status}`)
    } catch (err: any) {
      lastError = err
      console.error(`LLM API attempt ${attempt + 1} error:`, err?.message || err)
    }

    // Wait before retry (exponential backoff)
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw new Error(`Yapay zeka servisi yanıt vermedi: ${lastError?.message || 'Bilinmeyen hata'}`)
}
