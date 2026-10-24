import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PageShell } from '@/components/site/PageShell';
import { Button } from '@/components/ui/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { workspaceQuery } from '@/lib/workspace-query';
import { LayoutDashboard, Bell, UserRound, ShieldCheck } from 'lucide-react';
export function WorkspaceShell({title,children}:{title:string;children:ReactNode}){
 const {data}=useSuspenseQuery(workspaceQuery);const unread=data.notifications.filter(n=>!n.read_at).length;
 return <PageShell><section className="mx-auto max-w-6xl px-4 py-10"><div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6"><div><p className="eyebrow text-forest">{data.role.role.replaceAll('_',' ')} workspace</p><h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1></div><nav aria-label="Workspace" className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/dashboard"><LayoutDashboard/> Reports</Link></Button><Button asChild variant="outline"><Link to="/notifications"><Bell/> {unread || 'Updates'}</Link></Button><Button asChild variant="outline"><Link to="/profile"><UserRound/> Profile</Link></Button>{data.role.role==='admin'&&<Button asChild variant="forest"><Link to="/admin"><ShieldCheck/> Manage</Link></Button>}</nav></div><div className="mt-8">{children}</div></section></PageShell>;
}
