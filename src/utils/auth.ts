import { base44 } from '@/api/base44Client';

export type Base44User = Awaited<ReturnType<typeof base44.auth.me>>;

export async function ensureAuthed(): Promise<Base44User | null> {
  try {
    const user = await base44.auth.me();
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Auth check failed:', error);
    base44.auth.redirectToLogin(window.location.href);
    return null;
  }
}
