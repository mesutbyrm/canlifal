import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db';
import { invalidateCache, invalidateCachePrefix } from '@/lib/cache';
import { staffCan } from '@/lib/permissions'
import { isFullAdmin } from '@/lib/admin-utils'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic';

// Get all platform settings
export async function GET() {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'system.config.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const settings = await prisma.platformSettings.findMany();
    
    // Convert to object for easier access
    const settingsObj: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      settingsObj[s.key] = s.value;
    });

    // Set defaults if not exists
    const defaults: Record<string, string> = {
      'commission_rate': '20',
      'stream_gift_commission': '30',
      'direct_gift_commission': '0',
      'jeton_transfer_commission': '0',
      'cfc_transfer_commission': '0',
      'jeton_transfer_min': '100',
      'cfc_transfer_min': '100',
      'default_agency_commission': '5',
      'agency_purchase_bonus_pct': '0',
      'vr_platform_percent': '50',
      'vr_owner_share_guest_gift': '30',
      'min_withdrawal': '100',
      'referral_bonus': '50',
      'welcome_credits': '10'
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (!settingsObj[key]) {
        settingsObj[key] = value;
      }
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 });
  }
}

// Para akışını etkileyen ayarlar (komisyon, fiyat, ödül, bakiye, ödeme
// iletişimi). Moderatör bunları değiştiremez; yalnızca tam yönetici ve finans.
const FINANCE_SETTING_PATTERN =
  /(commission|transfer|withdraw|bonus|credit|jeton|cfc|price|(^|_)rate($|_)|percent|pct|share|reward|amount|cost|fee|payment|iban|bank|papara|whatsapp|referral)/i

function isFinanceSettingKey(key: string): boolean {
  return FINANCE_SETTING_PATTERN.test(key)
}

// Update platform settings
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'system.config.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, description } = body;

    if (typeof key !== 'string' || !key.trim() || key.length > 100 || value === undefined || value === null) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 });
    }
    if (String(value).length > 20000) {
      return NextResponse.json({ error: 'Değer çok uzun' }, { status: 400 });
    }

    const role = (session.user as any).role as string | undefined
    const actorId = (session.user as any).id as string
    if (isFinanceSettingKey(key) && !isFullAdmin(role) &&
        !(await staffCan(role, actorId, 'finance.payment.manage', ['finans']))) {
      return NextResponse.json({ error: 'Bu ayarı değiştirme yetkiniz yok' }, { status: 403 });
    }

    const before = await prisma.platformSettings.findUnique({ where: { key } });

    const setting = await prisma.platformSettings.upsert({
      where: { key },
      update: { value: String(value), description },
      create: { key, value: String(value), description }
    });

    // Invalidate cache for this specific setting and the "all settings" cache
    invalidateCache(`platform:${key}`);
    invalidateCache('platform:__all__');

    if (before?.value !== setting.value) {
      await recordAudit({
        actorId,
        actorRole: role,
        action: 'platform_setting_update',
        targetType: 'platform_setting',
        targetId: key,
        before: before ? { value: before.value } : null,
        after: { value: setting.value },
        ip: getAuditIp(request),
      })
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Update setting error:', error);
    return NextResponse.json({ error: 'Ayar güncellenemedi' }, { status: 500 });
  }
}
