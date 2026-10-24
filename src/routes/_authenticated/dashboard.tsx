import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/page-head';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { ReportList } from '@/components/workspace/ReportList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
export const Route=createFileRoute('/_authenticated/dashboard')({head:()=>pageHead('Your reports','Your civic reports, department queue and resolution progress.'),loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Dashboard});
function Dashboard(){const {data,refetch,isFetching}=useSuspenseQuery(workspaceQuery);const [search,setSearch]=useState('');const [status,setStatus]=useState('all');const [mine,setMine]=useState(false);
 const reports=data.reports.filter(r=>(status==='all'||r.status===status)&&(!mine||r.assigned_officer===data.userId)&&`${r.title} ${r.city} NX-${r.reference}`.toLowerCase().includes(search.toLowerCase()));
 return <WorkspaceShell title={data.role.role==='citizen'?'Your city. Your reports.':'The department queue.'}><div className="mb-8 grid grid-cols-3 divide-x border-b border-border pb-6">{[['Reports',data.reports.length],['Open',data.reports.filter(r=>!['resolved','rejected'].includes(r.status)).length],['Resolved',data.reports.filter(r=>r.status==='resolved').length]].map(([label,value])=><div key={label} className="px-3 first:pl-0"><p className="text-3xl font-display text-forest">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>)}</div><div className="mb-5 flex flex-wrap items-center gap-3"><Input aria-label="Search your reports" placeholder="Search title, city or reference" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 basis-52"/><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent>{['all','reported','in_review','in_progress','resolved','rejected'].map(s=><SelectItem key={s} value={s}>{s.replaceAll('_',' ')}</SelectItem>)}</SelectContent></Select>{data.role.role==='department_officer'&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/> Assigned to me</label>}<Button variant="outline" size="icon" aria-label="Refresh reports" disabled={isFetching} onClick={()=>refetch()}><RefreshCw/></Button>{data.role.role==='citizen'&&<Button asChild variant="forest"><Link to="/report"><Plus/> New report</Link></Button>}</div><ReportList reports={reports}/><p className="mt-4 text-xs text-muted-foreground">Showing the latest {data.reports.length} accessible reports.</p></WorkspaceShell>;
}
