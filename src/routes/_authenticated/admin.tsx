import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { workspaceQuery } from '@/lib/workspace-query';
import { getAdminUsers, setRole, saveDepartment, getAdminAllReports, adminSendNotification, adminReplyReport, getAdminReportEvents } from '@/lib/civic.functions';
import { pageHead } from '@/lib/page-head';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/button';
import { TextField, FormNotice } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ISSUE_CATEGORIES } from '@/lib/demo-data';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { getPendingOfficers, updatePendingOfficerStatus, type PendingOfficer } from '@/lib/dev-auth';
import {
  CheckCircle2, XCircle, Clock, Users, Building2, Shield,
  FileText, Bell, Send, ArrowUpRight, MapPin, Eye, EyeOff,
  MessageSquare, Filter, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => pageHead('Administration', 'Manage civic departments and authorized account roles.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery),
  component: Admin,
});

/* ═══════════════════════════════════════════════════════════════════════════
   Tab constants
   ═══════════════════════════════════════════════════════════════════════ */
type AdminTab = 'reports' | 'people' | 'departments' | 'notifications';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'reports', label: 'All Reports', icon: <FileText className="h-4 w-4" /> },
  { id: 'people', label: 'People & Access', icon: <Users className="h-4 w-4" /> },
  { id: 'departments', label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Root
   ═══════════════════════════════════════════════════════════════════════ */
function Admin() {
  const { data } = useSuspenseQuery(workspaceQuery);
  return (
    <WorkspaceShell title="Service administration.">
      {data.role.role !== 'admin' ? (
        <FormNotice tone="error">Administrator access is required.</FormNotice>
      ) : (
        <AdminPanel departments={data.departments} />
      )}
    </WorkspaceShell>
  );
}

function AdminPanel({ departments }: { departments: Tables<'departments'>[] }) {
  const [tab, setTab] = useState<AdminTab>('reports');

  return (
    <div className="space-y-8">
      {/* ── Tab navigation ─────────────────────────────────────────── */}
      <nav className="flex flex-wrap gap-1 rounded-xl border bg-muted/40 p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-paper text-forest shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Pending officer approvals (always visible at top) ─────── */}
      <PendingOfficerApprovals departments={departments} />

      {/* ── Tab content ────────────────────────────────────────────── */}
      {tab === 'reports' && <AdminReportsTab departments={departments} />}
      {tab === 'people' && <PeopleTab departments={departments} />}
      {tab === 'departments' && <DepartmentsTab departments={departments} />}
      {tab === 'notifications' && <NotificationsTab departments={departments} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. REPORTS TAB — All platform reports with officer, progress, details
   ═══════════════════════════════════════════════════════════════════════ */
function AdminReportsTab({ departments }: { departments: Tables<'departments'>[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(0);
  const qc = useQueryClient();

  const reports = useQuery({
    queryKey: ['admin-all-reports', search, status, category, deptFilter, page],
    queryFn: () =>
      getAdminAllReports({
        data: {
          search,
          status,
          category,
          departmentId: deptFilter || null,
          page,
        },
      }),
  });

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl">All Platform Reports</h2>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['admin-all-reports'] })}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label="Search reports"
          placeholder="Search title, city, citizen, or NX-reference"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {['reported', 'in_review', 'in_progress', 'resolved', 'rejected'].map((s) => (
              <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ISSUE_CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report list */}
      {reports.error && <FormNotice tone="error">{reports.error.message}</FormNotice>}
      {reports.isPending ? (
        <p className="py-8 text-muted-foreground">Loading reports…</p>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-6 rounded-xl border bg-forest/5 px-5 py-3 text-sm">
            <span><strong className="text-forest">{reports.data?.length ?? 0}</strong> reports shown</span>
            <span><strong className="text-ember">{reports.data?.filter((r) => r.status === 'reported').length ?? 0}</strong> new</span>
            <span><strong className="text-forest">{reports.data?.filter((r) => r.status === 'in_progress').length ?? 0}</strong> in progress</span>
            <span><strong className="text-forest">{reports.data?.filter((r) => r.status === 'resolved').length ?? 0}</strong> resolved</span>
          </div>

          <div className="divide-y border-y border-border">
            {(reports.data?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No reports match the current filters.
              </p>
            ) : (
              reports.data?.map((r) => <AdminReportRow key={r.id} report={r} />)
            )}
          </div>

          {/* Pagination */}
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={(reports.data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/* ── Single report row with expandable details & admin reply ─────────── */
type AdminReport = Awaited<ReturnType<typeof getAdminAllReports>>[number];

function AdminReportRow({ report: r }: { report: AdminReport }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const reply = useServerFn(adminReplyReport);
  const getEvents = useServerFn(getAdminReportEvents);
  const qc = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['admin-report-events', r.id],
    queryFn: () => getEvents({ data: { reportId: r.id } }),
    enabled: expanded,
  });

  const statusColors: Record<string, string> = {
    reported: 'bg-amber-100 text-amber-800',
    in_review: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const priorityColors: Record<string, string> = {
    normal: '',
    high: 'text-amber-600 font-semibold',
    urgent: 'text-red-600 font-bold',
  };

  async function sendReply() {
    setBusy(true);
    try {
      await reply({ data: { reportId: r.id, message: replyText } });
      setReplyText('');
      toast.success('Reply sent to citizen.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-report-events', r.id] }),
        qc.invalidateQueries({ queryKey: ['admin-all-reports'] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send reply.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="py-4">
      {/* Summary row */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">NX-{r.reference}</span>
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${statusColors[r.status] ?? 'bg-sage text-forest'}`}>
              {r.status.replaceAll('_', ' ')}
            </span>
            {r.priority !== 'normal' && (
              <span className={priorityColors[r.priority] ?? ''}>
                <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                {r.priority}
              </span>
            )}
            <span className="text-muted-foreground">{r.category}</span>
            {r.public_visible ? (
              <span className="flex items-center gap-1 text-forest"><Eye className="h-3 w-3" /> Public</span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground"><EyeOff className="h-3 w-3" /> Private</span>
            )}
          </div>

          <h3 className="mt-1.5 text-lg font-semibold leading-snug">{r.title}</h3>

          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</span>
            <span>Citizen: <strong className="text-foreground">{r.citizen_name || 'Unknown'}</strong></span>
            <span>Dept: <strong className="text-foreground">{r.department_name || '—'}</strong></span>
            <span>Officer: <strong className="text-foreground">{r.officer_name || 'Unassigned'}</strong></span>
            <span>{r.photo_count} photo{r.photo_count !== 1 ? 's' : ''}</span>
            <span>{new Date(r.updated_at).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 self-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/reports/$id" params={{ id: r.id }}>
              <ArrowUpRight className="h-4 w-4" /> View
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Less' : 'More'}
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">Description</h4>
              <p className="whitespace-pre-wrap text-sm">{r.description}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Address:</span> {r.address}, {r.city}</p>
              <p><span className="text-muted-foreground">Citizen email:</span> {r.citizen_email}</p>
              <p><span className="text-muted-foreground">Created:</span> {new Date(r.created_at).toLocaleString('en-IN')}</p>
              <p><span className="text-muted-foreground">Last updated:</span> {new Date(r.updated_at).toLocaleString('en-IN')}</p>
              {r.resolution_note && (
                <p><span className="text-muted-foreground">Resolution:</span> {r.resolution_note}</p>
              )}
            </div>
          </div>

          {/* Citizen Messages & Updates Thread */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-forest" /> Messages & Conversation
              </h4>
              {eventsQuery.data && (
                <span className="text-[11px] text-muted-foreground">
                  {eventsQuery.data.filter((e) => e.event_type === 'comment' || e.event_type === 'admin_reply').length} message(s)
                </span>
              )}
            </div>

            {eventsQuery.isPending ? (
              <p className="py-2 text-xs text-muted-foreground">Loading conversation…</p>
            ) : eventsQuery.error ? (
              <p className="py-2 text-xs text-red-500">Could not load messages.</p>
            ) : (eventsQuery.data?.length ?? 0) === 0 ? (
              <p className="py-2 text-xs italic text-muted-foreground">No citizen messages or updates on this report yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {eventsQuery.data?.map((e) => {
                  const isCitizen = e.event_type === 'comment' || e.actor_role === 'citizen';
                  const isAdmin = e.event_type === 'admin_reply' || e.actor_role === 'admin';
                  return (
                    <div
                      key={e.id}
                      className={`rounded-lg border p-3 text-xs space-y-1 ${
                        isAdmin
                          ? 'border-forest/30 bg-forest/5 ml-4'
                          : 'border-border bg-paper mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {e.actor_name || (isAdmin ? 'Administrator' : r.citizen_name || 'Citizen')}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-mono ${
                            isAdmin ? 'bg-forest/15 text-forest' : 'bg-muted text-muted-foreground'
                          }`}>
                            {e.actor_role || (isAdmin ? 'Admin' : 'Citizen')}
                          </span>
                        </span>
                        <span className="text-[11px]">{new Date(e.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground pt-0.5">{e.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin reply form */}
          <div className="border-t pt-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-forest" /> Reply to citizen
            </label>
            <div className="flex gap-2">
              <textarea
                placeholder="Write a reply to the citizen about this report…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="min-w-0 flex-1 rounded-lg border bg-paper px-3 py-2 text-sm"
              />
              <Button
                variant="forest"
                size="sm"
                disabled={busy || replyText.trim().length < 2}
                onClick={sendReply}
                className="self-end"
              >
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. PEOPLE TAB
   ═══════════════════════════════════════════════════════════════════════ */
function PeopleTab({ departments }: { departments: Tables<'departments'>[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const users = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => getAdminUsers({ data: { search, page } }),
  });

  return (
    <section className="space-y-5">
      <h2 className="text-3xl">People & access</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-forest/5 p-5">
          <div className="flex items-center gap-2 text-forest">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Total Accounts</span>
          </div>
          <p className="mt-2 text-3xl font-display text-forest">{users.data?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-ember/5 p-5">
          <div className="flex items-center gap-2 text-ember">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">Departments</span>
          </div>
          <p className="mt-2 text-3xl font-display text-ember">{departments.length}</p>
        </div>
        <div className="rounded-xl border bg-sage p-5">
          <div className="flex items-center gap-2 text-forest">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">Admin Role</span>
          </div>
          <p className="mt-2 text-sm font-medium text-forest">Active</p>
        </div>
      </div>

      <TextField
        label="Find an account"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
      />
      {users.error && <FormNotice tone="error">{users.error.message}</FormNotice>}
      {users.isPending ? (
        <p className="py-6">Loading accounts…</p>
      ) : (
        <div className="mt-4 divide-y">
          {users.data?.map((u) => (
            <RoleEditor key={`${u.user_id}-${u.role}-${u.department_id}`} user={u} departments={departments} />
          ))}
          {users.data?.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">
              No accounts found. Users will appear here after they register.
            </p>
          )}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button variant="outline" disabled={(users.data?.length ?? 0) < 25} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. DEPARTMENTS TAB
   ═══════════════════════════════════════════════════════════════════════ */
function DepartmentsTab({ departments }: { departments: Tables<'departments'>[] }) {
  return (
    <section>
      <h2 className="mb-5 text-3xl">Departments</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <DepartmentEditor departments={departments} />
        <div className="divide-y">
          {departments.map((d) => (
            <DepartmentEditor key={d.id} department={d} departments={departments} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. NOTIFICATIONS TAB — Global/filtered broadcast + reply messaging
   ═══════════════════════════════════════════════════════════════════════ */
function NotificationsTab({ departments }: { departments: Tables<'departments'>[] }) {
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetDept, setTargetDept] = useState('');
  const [busy, setBusy] = useState(false);
  const send = useServerFn(adminSendNotification);

  async function broadcast() {
    if (message.trim().length < 2) return;
    const roleLabel = targetRole || 'all users';
    const confirmed = window.confirm(
      `Send this notification to ${roleLabel}?\n\n"${message.slice(0, 120)}${message.length > 120 ? '…' : ''}"`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const count = await send({
        data: {
          message,
          targetRole,
          targetDepartment: targetDept || null,
          targetUser: null,
          reportId: null,
        },
      });
      toast.success(`Notification sent to ${count} user${count !== 1 ? 's' : ''}.`);
      setMessage('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send notification.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-3xl">
        <Bell className="h-7 w-7 text-forest" /> Broadcast Notifications
      </h2>

      <div className="rounded-xl border bg-paper p-6 space-y-5 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Send announcements to all users or filter by role and department. Citizens, officers, and admins with notifications enabled will receive the message.
        </p>

        {/* Targeting filters */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Target audience</label>
            <Select value={targetRole} onValueChange={(v) => setTargetRole(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="citizen">Citizens only</SelectItem>
                <SelectItem value="department_officer">Officers only</SelectItem>
                <SelectItem value="admin">Admins only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Department filter</label>
            <Select value={targetDept} onValueChange={(v) => setTargetDept(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Message composer */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Notification message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement or notification message here…"
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border bg-paper px-4 py-3 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">{message.length} / 2000 characters</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="forest"
            disabled={busy || message.trim().length < 2}
            onClick={broadcast}
          >
            <Send className="h-4 w-4" />
            {busy ? 'Sending…' : 'Send notification'}
          </Button>
          {targetRole && (
            <span className="flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-medium text-forest">
              <Filter className="h-3 w-3" /> Filtered: {targetRole.replaceAll('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Quick tips */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <h3 className="mb-2 text-lg font-semibold">Quick tips</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• <strong>Global broadcast:</strong> Leave target as "All users" to notify everyone.</li>
          <li>• <strong>Role filter:</strong> Select "Citizens only" to send only to citizens.</li>
          <li>• <strong>Department filter:</strong> Combine with "Officers only" to message a specific department's team.</li>
          <li>• <strong>Reply to reports:</strong> Go to the Reports tab, expand a report, and use the reply form.</li>
        </ul>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared sub-components
   ═══════════════════════════════════════════════════════════════════════ */

function PendingOfficerApprovals({ departments }: { departments: Tables<'departments'>[] }) {
  const [pending, setPending] = useState<PendingOfficer[]>(() => getPendingOfficers().filter(o => o.status === 'pending'));
  const save = useServerFn(setRole);
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown department';

  async function approve(officer: PendingOfficer) {
    setBusyId(officer.id);
    try {
      await save({
        data: {
          user: officer.id,
          role: 'department_officer',
          department: officer.departmentId || null,
        },
      });
      updatePendingOfficerStatus(officer.id, 'approved');
      setPending(prev => prev.filter(o => o.id !== officer.id));
      await qc.invalidateQueries();
      toast.success(`${officer.fullName} approved as department officer.`);
    } catch (e) {
      let msg = 'Could not approve officer.';
      if (e instanceof Error) {
        try {
          const parsed = JSON.parse(e.message);
          if (Array.isArray(parsed) && parsed[0]?.message) {
            msg = parsed.map((item: { message: string }) => item.message).join(', ');
          } else {
            msg = e.message;
          }
        } catch {
          msg = e.message;
        }
      }
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  function reject(officer: PendingOfficer) {
    updatePendingOfficerStatus(officer.id, 'rejected');
    setPending(prev => prev.filter(o => o.id !== officer.id));
    toast.success(`${officer.fullName}'s application rejected.`);
  }

  return (
    <section>
      <h2 className="mb-5 flex items-center gap-2 text-3xl">
        <Clock className="h-7 w-7 text-ember" />
        Pending officer approvals
        <span className="rounded-full bg-ember px-2.5 py-0.5 text-sm font-bold text-white">{pending.length}</span>
      </h2>
      <div className="space-y-3">
        {pending.map((officer) => (
          <div
            key={officer.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-ember/15 bg-paper p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1 basis-52">
              <p className="font-semibold">{officer.fullName}</p>
              <p className="text-sm text-muted-foreground">{officer.email}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-sage px-2 py-0.5 font-medium text-forest">
                  {getDeptName(officer.departmentId)}
                </span>
                {officer.designation && (
                  <span className="rounded-full bg-muted px-2 py-0.5">{officer.designation}</span>
                )}
                {officer.employeeId && (
                  <span className="rounded-full bg-muted px-2 py-0.5">ID: {officer.employeeId}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Applied {new Date(officer.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="forest"
                size="sm"
                disabled={busyId === officer.id}
                onClick={() => approve(officer)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === officer.id}
                onClick={() => reject(officer)}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoleEditor({ user: u, departments }: { user: Awaited<ReturnType<typeof getAdminUsers>>[number]; departments: Tables<'departments'>[] }) {
  const [role, setRoleValue] = useState<Enums<'app_role'>>(u.role);
  const [department, setDepartment] = useState(u.department_id || 'none');
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setRole);
  const qc = useQueryClient();

  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1 basis-52">
        <p className="font-semibold">{u.full_name || 'Unnamed account'}</p>
        <p className="break-all text-sm text-muted-foreground">{u.email}</p>
      </div>
      <Select value={role} onValueChange={(v) => setRoleValue(v as Enums<'app_role'>)}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['citizen', 'department_officer', 'admin'].map((r) => (
            <SelectItem key={r} value={r}>{r.replaceAll('_', ' ')}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {role === 'department_officer' && (
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select department</SelectItem>
            {departments.filter((d) => d.active).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        variant="outline"
        disabled={busy || (role === 'department_officer' && department === 'none')}
        onClick={async () => {
          if (!window.confirm(`Change this account to ${role.replaceAll('_', ' ')}?`)) return;
          setBusy(true);
          try {
            await save({ data: { user: u.user_id, role, department: role === 'department_officer' ? department : null } });
            await qc.invalidateQueries();
            toast.success('Account access updated.');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not change access.');
          } finally {
            setBusy(false);
          }
        }}
      >Save role</Button>
    </div>
  );
}

function DepartmentEditor({ department: d, departments }: { department?: Tables<'departments'>; departments: Tables<'departments'>[] }) {
  const [name, setName] = useState(d?.name ?? '');
  const [city, setCity] = useState(d?.city ?? '');
  const [categories, setCategories] = useState<string[]>(d?.categories ?? []);
  const [active, setActive] = useState(d?.active ?? true);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveDepartment);
  const qc = useQueryClient();

  return (
    <form
      className="space-y-3 border-b py-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await save({
            data: {
              id: d?.id ?? null,
              name,
              city,
              categories: categories as ('roads' | 'garbage' | 'streetlight' | 'water' | 'drainage' | 'infrastructure' | 'other')[],
              active,
            },
          });
          await qc.invalidateQueries({ queryKey: ['workspace'] });
          if (!d) { setName(''); setCity(''); setCategories([]); }
          toast.success('Department saved.');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Could not save department.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-xl">{d ? 'Edit department' : 'New department'}</h3>
      <TextField label="Department name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="City (empty for all cities)" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        {ISSUE_CATEGORIES.map((c) => (
          <label key={c.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={categories.includes(c.id)}
              onChange={(e) => setCategories(e.target.checked ? [...categories, c.id] : categories.filter((v) => v !== c.id))}
            />
            {c.label}
          </label>
        ))}
      </div>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
      </label>
      <Button variant="forest" disabled={busy || !categories.length}>Save department</Button>
    </form>
  );
}
