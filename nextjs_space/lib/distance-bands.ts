/**
 * §26-§28 — Yaklaşık Mesafe Sistemi
 * Kesin koordinat ASLA istemciye gönderilmez.
 * Sadece bant bilgisi döner.
 */

export type DistanceBand = '0-1' | '1-5' | '5-10' | '10-25' | '25-50' | '50+'

const BANDS: { max: number; label: DistanceBand }[] = [
  { max: 1, label: '0-1' },
  { max: 5, label: '1-5' },
  { max: 10, label: '5-10' },
  { max: 25, label: '10-25' },
  { max: 50, label: '25-50' },
]

/** Haversine mesafe (km) */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Mesafeyi bant etiketine dönüştür */
export function distanceToBand(km: number): DistanceBand {
  for (const b of BANDS) {
    if (km <= b.max) return b.label
  }
  return '50+'
}

/** Bant etiketini görüntüleme metnine dönüştür */
export function bandToText(band: DistanceBand): string {
  if (band === '0-1') return 'Yaklaşık 1 km içinde'
  if (band === '1-5') return 'Yaklaşık 1–5 km'
  if (band === '5-10') return 'Yaklaşık 5–10 km'
  if (band === '10-25') return 'Yaklaşık 10–25 km'
  if (band === '25-50') return 'Yaklaşık 25–50 km'
  return '50+ km'
}

/** İki kullanıcı arasında bant hesapla (her ikisi de konum paylaşıyorsa) */
export function computeDistanceBand(
  lat1: number | null, lon1: number | null, enabled1: boolean, showDist1: boolean,
  lat2: number | null, lon2: number | null, enabled2: boolean, showDist2: boolean,
): { band: DistanceBand; text: string } | null {
  if (!enabled1 || !enabled2 || !showDist1 || !showDist2) return null
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const km = haversineKm(lat1, lon1, lat2, lon2)
  const band = distanceToBand(km)
  return { band, text: bandToText(band) }
}
