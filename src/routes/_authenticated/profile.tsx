import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { workspaceQuery } from '@/lib/workspace-query';
import { saveProfile } from '@/lib/civic.functions';
import { pageHead } from '@/lib/page-head';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { TextField, FormNotice } from '@/components/forms/FormField';
import { Button } from '@/components/ui/button';
export const Route=createFileRoute('/_authenticated/profile')({head:()=>pageHead('Your profile','Manage your civic profile and notification preferences.'),loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Profile});
function Profile(){const {data}=useSuspenseQuery(workspaceQuery);const [v,setV]=useState({full_name:data.profile.full_name,city:data.profile.city,notifications_enabled:data.profile.notifications_enabled});const [notice,setNotice]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const save=useServerFn(saveProfile);const qc=useQueryClient();return <WorkspaceShell title="Your profile."><form className="max-w-xl space-y-5" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setNotice('');try{await save({data:v});await qc.invalidateQueries({queryKey:['workspace']});setNotice('Profile saved.');}catch(e){setError(e instanceof Error?e.message:'Could not save profile.');}finally{setBusy(false);}}}><TextField label="Full name" value={v.full_name} required minLength={2} maxLength={80} onChange={e=>setV({...v,full_name:e.target.value})}/><TextField label="City" value={v.city} maxLength={80} onChange={e=>setV({...v,city:e.target.value})}/><label className="flex gap-3"><input type="checkbox" checked={v.notifications_enabled} onChange={e=>setV({...v,notifications_enabled:e.target.checked})}/> Receive report updates</label>{error&&<FormNotice tone="error">{error}</FormNotice>}{notice&&<FormNotice>{notice}</FormNotice>}<Button variant="forest" disabled={busy}>{busy?'Saving…':'Save profile'}</Button></form></WorkspaceShell>;}
