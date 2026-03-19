export const DREAM_CATEGORIES = [
  { value: 'tumu', label: 'Tümü', icon: '🌙', color: 'indigo' },
  { value: 'genel', label: 'Genel', icon: '💭', color: 'gray' },
  { value: 'hayvanlar', label: 'Hayvanlar', icon: '🐾', color: 'amber' },
  { value: 'doga', label: 'Doğa & Hava', icon: '🌿', color: 'emerald' },
  { value: 'insanlar', label: 'İnsanlar & Aile', icon: '👨\u200D👩\u200D👧', color: 'blue' },
  { value: 'nesneler', label: 'Nesneler & Eşyalar', icon: '💎', color: 'purple' },
  { value: 'duygusal', label: 'Duygusal', icon: '❤️', color: 'pink' },
  { value: 'korkulu', label: 'Korkulu & Kabus', icon: '😨', color: 'red' },
  { value: 'dini', label: 'Dini & Manevi', icon: '🕌', color: 'teal' },
  { value: 'gizemli', label: 'Gizemli & Mistik', icon: '🔮', color: 'violet' },
  { value: 'yolculuk', label: 'Yolculuk & Hareket', icon: '✈️', color: 'sky' },
  { value: 'yiyecek', label: 'Yiyecek & İçecek', icon: '🍞', color: 'orange' },
  { value: 'saglik', label: 'Sağlık & Beden', icon: '🏥', color: 'lime' },
  { value: 'para', label: 'Para & İş', icon: '💰', color: 'yellow' },
] as const

export type DreamCategory = typeof DREAM_CATEGORIES[number]['value']

export function getCategoryLabel(value: string): string {
  return DREAM_CATEGORIES.find(c => c.value === value)?.label || 'Genel'
}

export function getCategoryIcon(value: string): string {
  return DREAM_CATEGORIES.find(c => c.value === value)?.icon || '💭'
}
