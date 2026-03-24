// lib/admin-utils.ts - Admin role checking utilities
export const ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans'] as const;
export const FULL_ADMIN_ROLES = ['admin', 'yonetici'] as const;

export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role as any);
}

export function isFullAdmin(role: string | undefined | null): boolean {
  return FULL_ADMIN_ROLES.includes(role as any);
}

export function isYonetici(role: string | undefined | null): boolean {
  return role === 'yonetici';
}

export const ROLE_LABELS: Record<string, string> = {
  user: 'Kullanıcı',
  moderator: 'Moderatör',
  finans: 'Finans',
  admin: 'Admin',
  yonetici: 'Yönetici',
};

export const MEMBERSHIP_ORDER = ['basic', 'premium', 'gold', 'diamond'] as const;

export const MEMBERSHIP_LABELS: Record<string, string> = {
  basic: 'Basic',
  premium: 'Premium',
  gold: 'Gold',
  diamond: 'Diamond',
};
