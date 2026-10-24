import { supabase } from '@/integrations/supabase/client';
import { registerSchema, signInSchema, REPORT_LIMITS } from './validation';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ADMIN_ID,
  createDevToken,
  storeDevToken,
  clearDevToken,
  savePendingOfficer,
} from './dev-auth';

export const isBackendConfigured = true;

/**
 * Sign in — uses real Supabase Auth first, with graceful fallback for admin account.
 */
export async function signIn(values: unknown) {
  const v = signInSchema.parse(values);

  // Normalise admin variants
  const email = v.email.trim().toLowerCase()
    .replace(/^admin@narikx$/i, DEV_ADMIN_EMAIL)
    .replace(/^admin@narikx\.com$/i, DEV_ADMIN_EMAIL);

  // 1. Try real Supabase Auth first
  try {
    const r = await supabase.auth.signInWithPassword({ email, password: v.password });
    if (!r.error && r.data.session) {
      clearDevToken();
      return r.data;
    }
  } catch {
    // If Supabase Auth fails (e.g. user not created yet in Supabase), continue to admin fallback
  }

  // 2. Admin fallback if not yet created directly in Supabase
  if (email === DEV_ADMIN_EMAIL && v.password === DEV_ADMIN_PASSWORD) {
    const token = createDevToken('admin', DEV_ADMIN_ID);
    storeDevToken(token);
    return {
      session: { access_token: token, token_type: 'bearer', expires_in: 86400 },
      user: { id: DEV_ADMIN_ID, email: DEV_ADMIN_EMAIL, role: 'admin' },
    };
  }

  // 3. Re-run standard Supabase login to return the official Supabase error message
  const r = await supabase.auth.signInWithPassword({ email, password: v.password });
  if (r.error) throw new Error(r.error.message);
  clearDevToken();
  return r.data;
}

/**
 * Register — creates citizen accounts directly, or records department officer
 * applications that await admin approval.
 */
export async function register(values: unknown) {
  const v = registerSchema.parse(values);

  // ── Department officer application ────────────────────────────────────
  if (v.accountType === 'department_officer') {
    // First create the Supabase Auth user as a citizen (no elevated role yet)
    const r = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        data: {
          full_name: v.fullName,
          account_type: 'department_officer',
          department_id: v.departmentId,
          designation: v.designation || '',
          employee_id: v.employeeId || '',
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (r.error) throw new Error(r.error.message);

    // Save pending application for admin review
    savePendingOfficer({
      id: r.data.user?.id || crypto.randomUUID(),
      fullName: v.fullName,
      email: v.email,
      departmentId: v.departmentId || '',
      designation: v.designation || '',
      employeeId: v.employeeId || '',
    });

    return {
      session: r.data.session,
      user: r.data.user,
      pendingOfficer: true,
    };
  }

  // ── Standard citizen registration ─────────────────────────────────────
  const r = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      data: { full_name: v.fullName },
      emailRedirectTo: `${window.location.origin}/auth`,
    },
  });
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export async function signOut() {
  clearDevToken();
  await supabase.auth.signOut();
}

export async function uploadReportPhotos(id: string, files: File[]) {
  if (!files.length) return [];
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in to attach photos.');
  const paths: string[] = [];
  try {
    for (const file of files) {
      const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      const extension = extensions[file.type];
      if (!extension || file.size > REPORT_LIMITS.maxImageMB * 1024 * 1024) throw new Error('Use JPG, PNG or WebP photos up to 5 MB.');
      const path = `${data.user.id}/${id}/${crypto.randomUUID()}.${extension}`;
      const r = await supabase.storage.from('report-photos').upload(path, file, { contentType: file.type, upsert: false });
      if (r.error) {
        if (r.error.message.toLowerCase().includes('bucket not found')) {
          throw new Error("Supabase Storage bucket 'report-photos' was not found. Please create the 'report-photos' private bucket in your Supabase Storage dashboard.");
        }
        throw new Error(r.error.message);
      }
      paths.push(path);
    }
    return paths;
  } catch (e) {
    if (paths.length) await supabase.storage.from('report-photos').remove(paths);
    throw e;
  }
}

export async function removeUnusedPhotos(paths: string[]) {
  if (paths.length) await supabase.storage.from('report-photos').remove(paths);
}
