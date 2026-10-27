import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  Shield, Building2, MapPin, AlertTriangle, CheckCircle2, Clock, XCircle,
  Plus, RefreshCw, Send, MessageSquare, ArrowUpRight, ChevronDown, ChevronUp,
  FileCheck2, Check
} from 'lucide-react';
import { workspaceQuery } from '@/lib/workspace-query';
import { updateWorkflow, adminReplyReport, getAdminReportEvents } from '@/lib/civic.functions';
import { pageHead } from '@/lib/page-head';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { ReportList } from '@/components/workspace/ReportList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FormNotice, inputClass } from '@/components/forms/FormField';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => pageHead('Your reports', 'Civic grievance management, department queue and resolution tracking.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data, refetch, isFetching } = useSuspenseQuery(workspaceQuery);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [officerTab, setOfficerTab] = useState<'mine' | 'all'>('mine');

  const role = data.role.role;
  const isOfficer = role === 'department_officer';
  const isCitizen = role === 'citizen';
  const isAdmin = role === 'admin';

  // Find officer department
  const officerDept = isOfficer
    ? data.departments.find((d) => d.id === data.role.department_id)
    : null;
  const deptName = officerDept?.name || 'Department';
  const officerCity = data.profile.city || officerDept?.city || 'Jurisdiction Wide';

  // Department reports for officers
  const deptReports = isOfficer
    ? data.reports.filter((r) => !r.department_id || r.department_id === data.role.department_id || r.assigned_officer === data.userId)
    : data.reports;

  const myAssignedCount = deptReports.filter((r) => r.assigned_officer === data.userId).length;
  const inProgressCount = deptReports.filter((r) => r.status === 'in_progress').length;
  const resolvedCount = deptReports.filter((r) => r.status === 'resolved').length;
  const newCount = deptReports.filter((r) => r.status === 'reported').length;

  // Filtered reports for officer view
  const officerFilteredReports = deptReports.filter((r) => {
    if (officerTab === 'mine' && r.assigned_officer !== data.userId) return false;
    if (status !== 'all' && r.status !== status) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = `${r.title} ${r.city} ${r.category} NX-${r.reference}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  // Citizen filtered reports
  const citizenFilteredReports = data.reports.filter(
    (r) => (status === 'all' || r.status === status) && `${r.title} ${r.city} NX-${r.reference}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <WorkspaceShell
      title={
        isOfficer
          ? `${deptName} Queue`
          : isCitizen
          ? 'Your city. Your reports.'
          : 'Operations Dashboard'
      }
    >
      {/* ══════════════════════════════════════════════════════════════════
          1. DEPARTMENT OFFICER VIEW
         ══════════════════════════════════════════════════════════════════ */}
      {isOfficer && (
        <section className="space-y-6">
          {/* Officer Identity Card */}
          <div className="rounded-2xl border border-forest/20 bg-forest/5 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest text-white shadow-md">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-forest/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-forest">
                      {deptName} Officer
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Active Duty
                    </span>
                  </div>
                  <h2 className="mt-1 text-2xl font-bold text-foreground">
                    {data.profile.full_name || 'Department Officer'}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-forest" />
                      <strong>Department:</strong> {deptName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-forest" />
                      <strong>Jurisdiction:</strong> {officerCity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Categories managed by this officer's department */}
              <div className="flex flex-wrap gap-1.5 self-center">
                {officerDept?.categories?.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-lg border border-forest/20 bg-paper px-2.5 py-1 text-xs font-medium capitalize text-forest shadow-2xs"
                  >
                    {cat.replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-paper p-4 shadow-2xs">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned to You</p>
              <p className="mt-1 text-3xl font-bold text-forest">{myAssignedCount}</p>
            </div>
            <div className="rounded-xl border bg-paper p-4 shadow-2xs">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Department Total</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{deptReports.length}</p>
            </div>
            <div className="rounded-xl border bg-paper p-4 shadow-2xs">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">In Progress</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{inProgressCount}</p>
            </div>
            <div className="rounded-xl border bg-paper p-4 shadow-2xs">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved with Proof</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">{resolvedCount}</p>
            </div>
          </div>

          {/* Filter and Tab Controls */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-lg border bg-muted/40 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setOfficerTab('mine')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    officerTab === 'mine' ? 'bg-paper text-forest shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Assigned to Me ({myAssignedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOfficerTab('all')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    officerTab === 'all' ? 'bg-paper text-forest shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Department Queue ({deptReports.length})
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => refetch()}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                aria-label="Search grievances"
                placeholder="Search title, city, citizen or NX-ref"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-paper"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-paper">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="reported">New ({newCount})</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="in_progress">In Progress ({inProgressCount})</SelectItem>
                  <SelectItem value="resolved">Resolved ({resolvedCount})</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Officer Reports List */}
          <div className="space-y-4">
            {officerFilteredReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium">No grievances found</p>
                <p className="text-xs mt-1">
                  {officerTab === 'mine'
                    ? 'You have no assigned reports matching this filter.'
                    : 'The department queue is clear for the selected criteria.'}
                </p>
              </div>
            ) : (
              officerFilteredReports.map((r) => (
                <OfficerReportCard
                  key={r.id}
                  report={r}
                  officerId={data.userId}
                  departmentId={data.role.department_id}
                  departments={data.departments}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. CITIZEN VIEW
         ══════════════════════════════════════════════════════════════════ */}
      {isCitizen && (
        <section className="space-y-6">
          <div className="grid grid-cols-3 divide-x border-b border-border pb-6">
            {[
              ['Total Reports', data.reports.length],
              ['Open & Under Action', data.reports.filter((r) => !['resolved', 'rejected'].includes(r.status)).length],
              ['Resolved', data.reports.filter((r) => r.status === 'resolved').length],
            ].map(([label, value]) => (
              <div key={label as string} className="px-3 first:pl-0">
                <p className="font-display text-3xl text-forest">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input
              aria-label="Search your reports"
              placeholder="Search title, city or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 basis-52 bg-paper"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44 bg-paper">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['all', 'reported', 'in_review', 'in_progress', 'resolved', 'rejected'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh reports"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw className={isFetching ? 'animate-spin' : ''} />
            </Button>
            <Button asChild variant="forest">
              <Link to="/report">
                <Plus /> New report
              </Link>
            </Button>
          </div>

          <ReportList reports={citizenFilteredReports} />
          <p className="text-xs text-muted-foreground">Showing {citizenFilteredReports.length} reports.</p>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          3. ADMIN SUMMARY
         ══════════════════════════════════════════════════════════════════ */}
      {isAdmin && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-forest/20 bg-forest/5 p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest text-white shadow-md">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-display">System Administration</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              You are signed in as System Administrator. Access complete grievance oversight,
              department routing, broadcast notifications, and account privilege controls.
            </p>
            <div className="pt-2">
              <Button asChild variant="forest" size="lg">
                <Link to="/admin">
                  Open Administration Center <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Officer Report Card — Detailed Problem View, Progression & Proof of Work
   ═══════════════════════════════════════════════════════════════════════ */
function OfficerReportCard({
  report: r,
  officerId,
  departmentId,
  departments,
}: {
  report: Tables<'reports'>;
  officerId: string;
  departmentId: string | null;
  departments: Tables<'departments'>[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Enums<'report_status'>>(r.status);
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>(r.priority as 'normal' | 'high' | 'urgent');
  const [assigned, setAssigned] = useState(r.assigned_officer === officerId);
  const [note, setNote] = useState(r.resolution_note || '');
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = useServerFn(updateWorkflow);
  const sendOfficerReply = useServerFn(adminReplyReport);
  const getEvents = useServerFn(getAdminReportEvents);
  const qc = useQueryClient();

  // Load conversation thread when expanded
  const eventsQuery = useQuery({
    queryKey: ['admin-report-events', r.id],
    queryFn: () => getEvents({ data: { reportId: r.id } }),
    enabled: expanded,
  });

  const isAssignedToMe = r.assigned_officer === officerId;

  const statusColors: Record<string, string> = {
    reported: 'bg-amber-100 text-amber-800 border-amber-200',
    in_review: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };

  const STAGES = [
    { id: 'reported', label: '1. Received' },
    { id: 'in_review', label: '2. In Review' },
    { id: 'in_progress', label: '3. In Progress' },
    { id: 'resolved', label: '4. Resolved with Proof' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.id === r.status);

  async function handleSaveWorkflow(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    // Require resolution note when resolving
    if (status === 'resolved' && note.trim().length < 10) {
      setError('Proof of resolution requires an explanation of at least 10 characters detailing the work completed.');
      setBusy(false);
      return;
    }

    if (note.trim().length < 5) {
      setError('Please add an update note of at least 5 characters.');
      setBusy(false);
      return;
    }

    try {
      await update({
        data: {
          id: r.id,
          status,
          priority,
          department: r.department_id,
          officer: assigned ? officerId : r.assigned_officer,
          visible: r.public_visible,
          note: note.trim(),
        },
      });

      toast.success(
        status === 'resolved'
          ? 'Grievance marked as resolved with proof documentation!'
          : 'Workflow progress saved.'
      );

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['workspace'] }),
        qc.invalidateQueries({ queryKey: ['admin-report-events', r.id] }),
        qc.invalidateQueries({ queryKey: ['report', r.id] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save workflow update.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendReply() {
    if (replyText.trim().length < 2) return;
    setBusy(true);
    try {
      await sendOfficerReply({ data: { reportId: r.id, message: replyText } });
      setReplyText('');
      toast.success('Message sent to citizen.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-report-events', r.id] }),
        qc.invalidateQueries({ queryKey: ['workspace'] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-paper p-5 shadow-sm transition-all hover:border-forest/30">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono font-bold text-muted-foreground">NX-{r.reference}</span>
          <span className={`rounded-full border px-2.5 py-0.5 font-medium ${statusColors[r.status] ?? 'bg-muted'}`}>
            {r.status.replaceAll('_', ' ')}
          </span>
          {r.priority !== 'normal' && (
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {r.priority}
            </span>
          )}
          <span className="capitalize text-muted-foreground">{r.category.replaceAll('_', ' ')}</span>
          {isAssignedToMe ? (
            <span className="rounded-md bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">
              Assigned to You
            </span>
          ) : r.assigned_officer ? (
            <span className="text-[11px] text-muted-foreground">Assigned to another officer</span>
          ) : (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Unassigned
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/reports/$id" params={{ id: r.id }}>
              <ArrowUpRight className="h-4 w-4" /> Full File
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1 text-forest"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Hide Console' : 'Manage & Resolve'}
          </Button>
        </div>
      </div>

      {/* Problem Summary */}
      <div className="pt-3">
        <h3 className="text-xl font-bold leading-snug">{r.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {r.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-forest" />
            {r.address}, {r.city}
          </span>
          <span>
            {r.photo_paths?.length ?? 0} citizen photograph{(r.photo_paths?.length ?? 0) !== 1 ? 's' : ''}
          </span>
          <span>Reported: {new Date(r.created_at).toLocaleDateString('en-IN')}</span>
          <span>Updated: {new Date(r.updated_at).toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      {/* Expanded Workflow & Resolution Console */}
      {expanded && (
        <div className="mt-5 space-y-6 rounded-xl border border-border/70 bg-muted/20 p-5">
          {/* Visual Lifecycle Stepper */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolution Pipeline Progress
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map((stg, i) => {
                const isPassed = currentStageIndex >= i;
                const isCurrent = r.status === stg.id;
                return (
                  <div
                    key={stg.id}
                    className={`rounded-lg border p-2.5 text-xs transition-all ${
                      isCurrent
                        ? 'border-forest bg-forest text-white shadow-xs font-semibold'
                        : isPassed
                        ? 'border-forest/40 bg-forest/10 text-forest font-medium'
                        : 'border-border bg-paper text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isPassed ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      <span>{stg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Problem Details */}
          <div className="rounded-lg border bg-paper p-4 text-sm space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Citizen Grievance Submission
            </h4>
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">{r.description}</p>
            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t text-xs text-muted-foreground">
              <p><strong>Exact Location:</strong> {r.address}, {r.city}</p>
              {r.latitude && r.longitude && (
                <p><strong>GPS Coordinates:</strong> {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</p>
              )}
              {r.resolution_note && (
                <div className="sm:col-span-2 rounded bg-emerald-50 p-2.5 text-emerald-900 border border-emerald-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-emerald-700" /> Resolution Proof & Work Summary:
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs">{r.resolution_note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Officer Workflow Progression Form */}
          <form onSubmit={handleSaveWorkflow} className="space-y-4 rounded-lg border bg-paper p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <FileCheck2 className="h-4 w-4 text-forest" />
              Update Grievance Status & Resolution Proof
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status Progression</label>
                <Select value={status} onValueChange={(v) => setStatus(v as Enums<'report_status'>)}>
                  <SelectTrigger className="bg-paper">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Reported (Received)</SelectItem>
                    <SelectItem value="in_review">In Review (Verified & Assessed)</SelectItem>
                    <SelectItem value="in_progress">In Progress (Field Work Active)</SelectItem>
                    <SelectItem value="resolved">Resolved with Proof</SelectItem>
                    <SelectItem value="rejected">Rejected (Non-actionable / Out of Scope)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Urgency Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger className="bg-paper">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={assigned}
                  onChange={(e) => setAssigned(e.target.checked)}
                  className="rounded border-border text-forest focus:ring-forest"
                />
                Assign this grievance directly to me ({isAssignedToMe ? 'Currently Assigned' : 'Unassigned'})
              </label>
            </div>

            <div>
              <label htmlFor={`workflow-note-${r.id}`} className="block text-xs font-medium text-muted-foreground mb-1">
                {status === 'resolved'
                  ? 'Proof of Resolution & Completion Summary (Mandatory)'
                  : status === 'rejected'
                  ? 'Rejection Justification (Mandatory)'
                  : 'Progress / Field Work Note (Required)'}
              </label>
              <textarea
                id={`workflow-note-${r.id}`}
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  status === 'resolved'
                    ? 'State exactly what was done to fix the issue (materials used, team dispatched, resolution verified)...'
                    : status === 'rejected'
                    ? 'Explain why this cannot be completed by this municipal department...'
                    : 'Detail the current stage of review or field work...'
                }
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This note will be logged in the public timeline and notified to the citizen.
              </p>
            </div>

            {error && <FormNotice tone="error">{error}</FormNotice>}

            <Button
              type="submit"
              variant={status === 'resolved' ? 'forest' : 'outline'}
              disabled={busy}
              className="gap-1.5"
            >
              {status === 'resolved' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Resolution with Proof
                </>
              ) : (
                'Save Workflow Progress'
              )}
            </Button>
          </form>

          {/* Citizen Messages & Real-Time Communication */}
          <div className="rounded-lg border bg-paper p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-forest" />
                Citizen Communication & Updates ({eventsQuery.data?.length ?? 0})
              </h4>
            </div>

            {eventsQuery.isPending ? (
              <p className="py-2 text-xs text-muted-foreground">Loading messages…</p>
            ) : (eventsQuery.data?.length ?? 0) === 0 ? (
              <p className="py-2 text-xs italic text-muted-foreground">No citizen messages recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {eventsQuery.data?.map((e) => {
                  const isOfficerOrAdmin = e.event_type === 'admin_reply' || e.actor_role === 'department_officer' || e.actor_role === 'admin';
                  return (
                    <div
                      key={e.id}
                      className={`rounded-lg border p-3 text-xs space-y-1 ${
                        isOfficerOrAdmin
                          ? 'border-forest/30 bg-forest/5 ml-4'
                          : 'border-border bg-paper mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {e.actor_name || (isOfficerOrAdmin ? 'Department Officer' : 'Citizen')}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-mono ${
                              isOfficerOrAdmin ? 'bg-forest/15 text-forest' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {e.actor_role || (isOfficerOrAdmin ? 'Officer' : 'Citizen')}
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

            {/* Officer Direct Reply Form */}
            <div className="pt-2 border-t">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Reply directly to citizen
              </label>
              <div className="flex gap-2">
                <textarea
                  placeholder="Answer citizen inquiry or request specific location details…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="min-w-0 flex-1 rounded-lg border bg-paper px-3 py-2 text-sm"
                />
                <Button
                  variant="forest"
                  size="sm"
                  disabled={busy || replyText.trim().length < 2}
                  onClick={handleSendReply}
                  className="self-end gap-1"
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
