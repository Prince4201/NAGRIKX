import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { workspaceQuery } from '@/lib/workspace-query';
import { markNotifications } from '@/lib/civic.functions';
import { pageHead } from '@/lib/page-head';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
export const Route=createFileRoute('/_authenticated/notifications')({head:()=>pageHead('Your updates','Department messages and changes to your civic reports.'),loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Notifications});
function Notifications(){const {data}=useSuspenseQuery(workspaceQuery);const mark=useServerFn(markNotifications);const qc=useQueryClient();return <WorkspaceShell title="Your updates."><Button variant="outline" disabled={!data.notifications.some(n=>!n.read_at)} onClick={async()=>{try{await mark();await qc.invalidateQueries({queryKey:['workspace']});}catch(e){toast.error(e instanceof Error?e.message:'Could not mark updates.');}}}>Mark all as read</Button><div className="mt-5 divide-y">{data.notifications.length===0?<p className="py-10 text-muted-foreground">No updates yet.</p>:data.notifications.map(n=><article key={n.id} className={`py-5 ${n.read_at?'':'font-semibold'}`}><p>{n.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('en-IN')}</p>{n.report_id&&<Button asChild variant="link"><Link to="/reports/$id" params={{id:n.report_id}}>Open report</Link></Button>}</article>)}</div></WorkspaceShell>;}
