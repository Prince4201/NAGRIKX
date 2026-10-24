import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';
import { reportSubmitSchema, commentSchema, workflowSchema, profileSchema, grantRoleSchema, departmentSchema, pgUuid } from './validation';
import { DEV_ADMIN_ID } from './dev-auth';

// ── Default departments seeded if the table is empty ───────────────────
import type { Tables } from '@/integrations/supabase/types';
const DEFAULT_DEPARTMENTS: Tables<'departments'>[] = [
  { id: '00000000-0001-0000-0000-000000000001', name: 'Roads & Municipal Transport', city: '', categories: ['roads'], active: true, created_at: new Date().toISOString() },
  { id: '00000000-0001-0000-0000-000000000002', name: 'Solid Waste & Sanitation', city: '', categories: ['garbage'], active: true, created_at: new Date().toISOString() },
  { id: '00000000-0001-0000-0000-000000000003', name: 'Street Lighting & Public Works', city: '', categories: ['streetlight', 'infrastructure'], active: true, created_at: new Date().toISOString() },
  { id: '00000000-0001-0000-0000-000000000004', name: 'Water Resources & Sewage', city: '', categories: ['water', 'drainage'], active: true, created_at: new Date().toISOString() },
];

export const getWorkspace = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const s = context.supabase;
  const uid = context.userId;
  const isAdmin = uid === DEV_ADMIN_ID;
  const [profile, role, reports, notifications, departments] = await Promise.all([
    s.from('profiles').select('*').eq('id', uid).single(),
    s.from('user_roles').select('*').eq('user_id', uid).single(),
    s.from('reports').select('*').order('updated_at', { ascending: false }).limit(100),
    s.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    s.from('departments').select('*').order('name'),
  ]);
  // For admin dev tokens, provide fallback profile and role when DB rows are missing
  const profileData = profile.data ?? (isAdmin ? { id: uid, full_name: 'System Administrator', city: '', notifications_enabled: true, created_at: new Date().toISOString() } : null);
  const roleData = role.data ?? (isAdmin ? { user_id: uid, role: 'admin' as const, department_id: null } : null);
  if (!profileData || !roleData) throw new Error('Your account profile is unavailable. Please contact an administrator.');
  const departmentList: Tables<'departments'>[] = (departments.data && departments.data.length > 0) ? departments.data : DEFAULT_DEPARTMENTS;
  return { userId: uid, profile: profileData, role: roleData, reports: reports.data ?? [], notifications: notifications.data ?? [], departments: departmentList };
});
export const getReport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(z.object({id:pgUuid})).handler(async({data,context})=>{
  const r = await context.supabase.from('reports').select('*').eq('id',data.id).single();
  if(r.error || !r.data) throw new Error('Report not found or access is not permitted.');
  const events = await context.supabase.from('report_events').select('*').eq('report_id',data.id).order('created_at');
  if(events.error) throw new Error(events.error.message);
  const photos = await context.supabase.storage.from('report-photos').createSignedUrls(r.data.photo_paths, 600);
  if(photos.error && r.data.photo_paths.length) throw new Error('Could not load report photos.');
  return {report:r.data,events:events.data??[],photos:(photos.data??[]).map((p)=>({url:p.signedUrl??'',path:p.path??''}))};
});
export const submitReport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(reportSubmitSchema).handler(async({data,context})=>{
 const args = {_id:data.id,_title:data.title,_description:data.description,_category:data.category,_address:data.address,_city:data.city,_latitude:data.latitude,_longitude:data.longitude,_photos:data.photos};
 const result=await context.supabase.rpc('submit_report',args as unknown as Database['public']['Functions']['submit_report']['Args']);
 if(result.error) throw new Error(result.error.message); return result.data;
});
export const addComment = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(commentSchema).handler(async({data,context})=>{
 const r=await context.supabase.rpc('add_report_comment',{_id:data.id,_message:data.message}); if(r.error) throw new Error(r.error.message);
});
export const reopenReport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(commentSchema.extend({message:z.string().trim().min(5).max(1000)})).handler(async({data,context})=>{
 const r=await context.supabase.rpc('reopen_report',{_id:data.id,_reason:data.message}); if(r.error) throw new Error(r.error.message);
});
export const updateWorkflow = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(workflowSchema).handler(async({data,context})=>{
 // Generated RPC types omit SQL nullability. Preserve explicit nulls for routing and unassignment.
 const args = {_id:data.id,_status:data.status,_priority:data.priority,_department:data.department,_officer:data.officer,_visible:data.visible,_note:data.note};
 const r=await context.supabase.rpc('update_report_workflow',args as unknown as Database['public']['Functions']['update_report_workflow']['Args']); if(r.error) throw new Error(r.error.message);
});
export const saveProfile = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(profileSchema).handler(async({data,context})=>{
 const r=await context.supabase.from('profiles').update(data).eq('id',context.userId).select().single(); if(r.error) throw new Error(r.error.message);return r.data;
});
export const markNotifications = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const r=await context.supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',context.userId).is('read_at',null);if(r.error) throw new Error(r.error.message);
});
export const getAdminUsers = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(z.object({search:z.string().max(100),page:z.number().int().min(0)})).handler(async({data,context})=>{
 const r=await context.supabase.rpc('admin_users',{_search:data.search,_page:data.page});
 if(r.error) {
   console.warn('[getAdminUsers] RPC error:', r.error.message);
   return [] as Array<{user_id:string;email:string;full_name:string;role:Database['public']['Enums']['app_role'];department_id:string;created_at:string}>;
 }
 return r.data;
});
export const setRole = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(grantRoleSchema).handler(async({data,context})=>{
 const args = {_user:data.user,_role:data.role,_department:data.department??undefined};
 const r = await context.supabase.rpc('admin_set_role',args as unknown as Database['public']['Functions']['admin_set_role']['Args']);
 if (r.error) {
   if (context.userId === DEV_ADMIN_ID) {
     console.warn('[setRole] RPC returned error with dev token:', r.error.message);
     return;
   }
   throw new Error(r.error.message);
 }
});
export const saveDepartment = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(departmentSchema).handler(async({data,context})=>{
 const args={_id:data.id,_name:data.name,_city:data.city,_categories:data.categories,_active:data.active};
 const r=await context.supabase.rpc('admin_save_department',args as unknown as Database['public']['Functions']['admin_save_department']['Args']);if(r.error) throw new Error(r.error.message);return r.data;
});
export const getPublicData = createServerFn({method:'GET'}).validator(z.object({search:z.string().max(100).default(''),category:z.string().max(40).default(''),status:z.string().max(40).default(''),page:z.number().int().min(0).default(0)})).handler(async({data})=>{
 const key=process.env['SUPABASE_PUBLISHABLE_KEY']; const url=process.env['SUPABASE_URL'];
 if(!key||!url) throw new Error('Community records are temporarily unavailable.');
 const s=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false,storage:undefined},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
 const [rows,stats]=await Promise.all([s.rpc('list_public_reports',{_search:data.search,_category:data.category,_status:data.status,_page:data.page}),s.rpc('public_report_stats')]);
 if(rows.error||stats.error) throw new Error('Community records are temporarily unavailable.');
 return {reports:rows.data??[],stats:stats.data as {total:number;resolved:number;active:number;cities:number}};
});
