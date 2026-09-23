/**
 * ATOMİK BAKİYE DÜŞÜMÜ (yarış koşulu / negatif bakiye koruması)
 *
 * PROBLEM: Mevcut akışlar "önce oku-kontrol et, sonra decrement" deseni kullanıyordu.
 * READ COMMITTED altında iki eşzamanlı istek (örn. Flutter + web aynı anda hediye
 * gönderirse) aynı bakiyeyi okuyup ikisi de kontrolü geçebilir ve bakiye NEGATİF olur.
 *
 * ÇÖZÜM: Düşüm işlemini tek bir koşullu SQL UPDATE'e indirdik. Satır yalnızca
 * bakiye yeterliyse güncellenir; güncellenmezse sorgu hata fırlatır ve Prisma
 * transaction'ın TAMAMI geri alınır (hediye/kayıt/ledger hiç oluşmaz).
 *
 * Hata fırlatma yöntemi: 0 satır güncellendiğinde 'INSUFFICIENT_BALANCE' metni
 * integer'a cast edilir → Postgres 22P02 hatası; mesaj içinde kod görünür.
 *
 * DİKKAT: cast ifadesi SABİT olmamalıdır. `CAST('INSUFFICIENT_BALANCE' AS int)`
 * şeklinde yazılırsa Postgres planlayıcısı sabit katlama (constant folding) yapar ve
 * CASE koşulu ne olursa olsun sorgu HER ZAMAN hata verir. Bu yüzden ifade,
 * çalışma zamanında hesaplanan bir toplama fonksiyonuna (max("id")) bağlanmıştır:
 * satır güncellendiyse ELSE dalı hiç değerlendirilmez.
 *
 * GERİYE DÖNÜK UYUMLU: başarılı yolda davranış birebir aynıdır (aynı alan,
 * aynı miktar, aynı transaction). Yalnızca yetersiz bakiye durumunda, daha önce
 * sessizce negatife düşen işlem artık tamamen iptal edilir.
 */

export type BalanceField = 'jetonBalance' | 'credits'

function buildSql(field: BalanceField) {
  return `WITH upd AS (
    UPDATE "users" SET "${field}" = "${field}" - $1::int
    WHERE "id" = $2 AND "${field}" >= $1::int
    RETURNING "id"
  )
  SELECT CASE WHEN count(*) = 1
              THEN 1
              ELSE CAST(coalesce(max("id"), 'INSUFFICIENT_BALANCE') AS int) END
  FROM upd`
}

/**
 * Prisma `$transaction([...])` dizisine ya da interaktif transaction'a
 * eklenebilecek atomik düşüm işlemi üretir.
 *
 * @param client prisma ya da transaction client (tx)
 */
export function atomicDebitOp(
  client: any,
  field: BalanceField,
  userId: string,
  amount: number,
) {
  const amt = Math.trunc(Number(amount))
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error('INVALID_DEBIT_AMOUNT')
  }
  return client.$executeRawUnsafe(buildSql(field), amt, userId)
}

export function atomicDebitJeton(client: any, userId: string, amount: number) {
  return atomicDebitOp(client, 'jetonBalance', userId, amount)
}

export function atomicDebitCredits(client: any, userId: string, amount: number) {
  return atomicDebitOp(client, 'credits', userId, amount)
}

/**
 * Yakalanan hatanın "yetersiz bakiye" olup olmadığını söyler.
 *
 * İki kaynağı tanır:
 *  1) atomicDebitOp'un fırlattığı INSUFFICIENT_BALANCE cast hatası,
 *  2) veritabanı seviyesindeki CHECK kısıtı (users_jetonBalance_nonneg /
 *     users_credits_nonneg) — bu kısıt, henüz atomik düşüme çevrilmemiş
 *     tüm eski akışlarda son emniyet ağıdır ve bakiyenin negatife
 *     düşmesini veritabanı düzeyinde imkânsız kılar.
 */
export function isInsufficientBalanceError(e: unknown): boolean {
  const msg =
    (e as any)?.message ||
    (e as any)?.meta?.message ||
    String(e ?? '')
  if (typeof msg !== 'string') return false
  return (
    msg.includes('INSUFFICIENT_BALANCE') ||
    msg.includes('users_jetonBalance_nonneg') ||
    msg.includes('users_credits_nonneg')
  )
}
