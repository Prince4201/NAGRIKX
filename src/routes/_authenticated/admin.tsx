import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { workspaceQuery } from '@/lib/workspace-query';
import { getAdminUsers, setRole, saveDepartment } from '@/lib/civic.functions';
import { pageHead } from '@/lib/page-head';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/button';
import { TextField, FormNotice } from '@/components/forms/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ISSUE_CATEGORIES } from '@/lib/demo-data';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { getPendingOfficers, updatePendingOfficerStatus, type PendingOfficer } from '@/lib/dev-auth';
import { CheckCircle2, XCircle, Clock, Users, Building2, Shield } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => pageHead('Administration', 'Manage civic departments and authorized account roles.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery),
  component: Admin,
});

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const users = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => getAdminUsers({ data: { search, page } }),
  });

  return (
    <div className="space-y-12">
      {/* ── Admin dashboard stats ─────────────────────────────────────── */}
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

      {/* ── Pending officer approvals ────────────────────────────────── */}
      <PendingOfficerApprovals departments={departments} />

      {/* ── People & access ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-3xl">People & access</h2>
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

      {/* ── Departments ──────────────────────────────────────────────── */}
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
    </div>
  );
}

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
