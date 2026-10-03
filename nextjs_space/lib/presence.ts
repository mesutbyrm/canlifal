/**
 * Ortak varlık (presence) penceresi.
 *
 * Daha önce 12 ayrı uçta `now - 300000` elle yazılıydı; kalp atışı temizliği ise
 * 60 saniyede bir çalışıyordu. Bu uyumsuzluk, ayrılan kullanıcıların 5 dakikaya
 * kadar "hayalet" olarak sayılmasına yol açıyordu. Tüm sayımlar artık tek bir
 * sabiti kullanır.
 */
export const PRESENCE_TTL_MS = 60_000

/** Bu andan itibaren "çevrimiçi" sayılacak en eski `lastSeen` / `lastPing` zamanı. */
export function presenceCutoff(now: number = Date.now()): Date {
  return new Date(now - PRESENCE_TTL_MS)
}
