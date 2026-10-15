/** Fal akışları — LLM SSE satırlarını mobil+web uyumlu hale getirir (saf, test edilebilir). */

/**
 * LLM'den gelen SSE satırlarını istemci dostu hale getirir: her
 * `data: {choices:[{delta:{content}}]}` satırına üst düzey `content` eklenir.
 * Web istemcisi `choices`, mobil istemci `content` okur — her ikisi de çalışır.
 */
export function normalizeLlmSseChunk(chunk: string): string {
  if (!chunk.includes('data:')) return chunk
  return chunk
    .split('\n')
    .map((line) => {
      if (!line.startsWith('data:')) return line
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]' || !payload.startsWith('{')) return line
      try {
        const parsed = JSON.parse(payload)
        if (parsed && typeof parsed === 'object' && parsed.content === undefined) {
          const content = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content
          if (typeof content === 'string') {
            return `data: ${JSON.stringify({ ...parsed, content })}`
          }
        }
      } catch {
        // Satır parçalı geldiyse olduğu gibi bırak.
      }
      return line
    })
    .join('\n')
}

/**
 * Akış için tamponlu normalleştirici: TCP parçaları satır ortasında
 * bölünebilir; tamamlanmamış son satır bir sonraki parçaya bekletilir.
 */
export function createSseNormalizer() {
  let carry = ''
  return {
    push(chunk: string): string {
      const text = carry + chunk
      const lastNl = text.lastIndexOf('\n')
      if (lastNl < 0) {
        carry = text
        return ''
      }
      carry = text.slice(lastNl + 1)
      return normalizeLlmSseChunk(text.slice(0, lastNl + 1))
    },
    flush(): string {
      const rest = carry
      carry = ''
      return rest ? normalizeLlmSseChunk(rest) : ''
    },
  }
}
