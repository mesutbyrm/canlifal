import { NextResponse } from 'next/server';
import {
  getJetonUnitPrice,
  getCfcUnitPrice,
  getDiscountSettings,
  computeJetonPrice,
  DEFAULT_JETON_UNIT_PRICE,
  DEFAULT_CFC_UNIT_PRICE,
} from '@/lib/jeton-pricing';

export const dynamic = 'force-dynamic';

/**
 * Tek yetkili fiyat kaynağının herkese açık okunur hali.
 * İstemci bu değerle hesap yapar ama sunucu her zaman yeniden hesaplar.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qty = parseInt(searchParams.get('jeton') || '0', 10);

    const [unitPrice, cfcUnitPrice, discount] = await Promise.all([
      getJetonUnitPrice(),
      getCfcUnitPrice(),
      getDiscountSettings(),
    ]);

    const quote = qty > 0 ? await computeJetonPrice(qty) : null;

    return NextResponse.json({
      unitPrice,
      cfcUnitPrice,
      currency: 'TRY',
      discountEnabled: discount.enabled,
      discountPercent: discount.enabled ? discount.percent : 0,
      quote,
    });
  } catch {
    return NextResponse.json({
      unitPrice: DEFAULT_JETON_UNIT_PRICE,
      cfcUnitPrice: DEFAULT_CFC_UNIT_PRICE,
      currency: 'TRY',
      discountEnabled: false,
      discountPercent: 0,
      quote: null,
    });
  }
}
