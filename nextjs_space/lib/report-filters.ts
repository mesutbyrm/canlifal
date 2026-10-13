/** Date-only report boundaries use Turkey local days, never the server timezone. */
export function parseReportDates(params: URLSearchParams) {
  const parse = (key: 'from' | 'to') => {
    const value = params.get(key)
    if (!value) return undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Tarih YYYY-AA-GG biçiminde olmalıdır')
    const date = new Date(`${value}T00:00:00.000+03:00`)
    if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 10800000).toISOString().slice(0, 10) !== value) throw new Error('Geçersiz tarih')
    return date
  }
  const from = parse('from'), to = parse('to')
  if (from && to && from > to) throw new Error('Başlangıç tarihi bitişten sonra olamaz')
  return from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(to.getTime() + 86400000) } : {}) } : undefined
}
