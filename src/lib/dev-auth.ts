/**
 * DEV AUTH — Application-level token system for local development.
 *
 * This exists because Supabase Auth requires email verification and the
 * admin@nagrikx.com domain has no MX records, so emails bounce. This module
 * creates non-JWT tokens that the auth-middleware can recognise and map to
 * known test identities without hitting Supabase Auth.
 *
 * ⚠ NEVER use this mechanism in production. Remove or gate behind NODE_ENV.
 */

// ── Fixed admin identity ───────────────────────────────────────────────
export const DEV_ADMIN_ID = 'a5be6cca-c29c-4b2b-85ce-fe99fcfad6b1';
export const DEV_ADMIN_EMAIL = 'admin@nagrikx.com';
export const DEV_ADMIN_PASSWORD = 'admin123';

// ── Token format: "nagrikx-dev-{role}.{userId}.{timestamp}" ────────────
export function createDevToken(role: string, userId: string): string {
  return `nagrikx-dev-${role}.${userId}.${Date.now()}`;
}

export function parseDevToken(token: string): { role: string; userId: string } | null {
  if (!token.startsWith('nagrikx-dev-')) return null;
  const parts = token.slice('nagrikx-dev-'.length).split('.');
  if (parts.length < 2) return null;
  return { role: parts[0]!, userId: parts[1]! };
}

export function isDevToken(token: string): boolean {
  return token.startsWith('nagrikx-dev-');
}

// ── Client-side helpers ────────────────────────────────────────────────
const STORAGE_KEY = 'nagrikx_dev_token';
const PENDING_OFFICERS_KEY = 'nagrikx_pending_officers';

export function storeDevToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, token);
}

export function getStoredDevToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function clearDevToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

export function isDevSignedIn(): boolean {
  return Boolean(getStoredDevToken());
}

// ── Pending officer applications (client-side until admin approves) ────
export interface PendingOfficer {
  id: string;
  fullName: string;
  email: string;
  departmentId: string;
  designation: string;
  employeeId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function savePendingOfficer(officer: Omit<PendingOfficer, 'requestedAt' | 'status'>): void {
  if (typeof window === 'undefined') return;
  const existing = getPendingOfficers();
  existing.push({ ...officer, requestedAt: new Date().toISOString(), status: 'pending' });
  localStorage.setItem(PENDING_OFFICERS_KEY, JSON.stringify(existing));
}

export function getPendingOfficers(): PendingOfficer[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_OFFICERS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function updatePendingOfficerStatus(id: string, status: 'approved' | 'rejected'): void {
  if (typeof window === 'undefined') return;
  const officers = getPendingOfficers();
  const updated = officers.map(o => o.id === id ? { ...o, status } : o);
  localStorage.setItem(PENDING_OFFICERS_KEY, JSON.stringify(updated));
}
