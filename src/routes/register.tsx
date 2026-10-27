import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Loader2, User, Briefcase, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/forms/AuthShell";
import { TextField, FormNotice } from "@/components/forms/FormField";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { registerSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { isBackendConfigured, register } from "@/lib/backend";
import { supabase } from "@/integrations/supabase/client";
import { isDevSignedIn, getStoredDevToken, parseDevToken } from "@/lib/dev-auth";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      if (isDevSignedIn()) {
        const token = getStoredDevToken();
        const parsed = token ? parseDevToken(token) : null;
        const target = parsed?.role === "admin" ? "/admin" : "/dashboard";
        throw redirect({ to: target, replace: true });
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        const role = roles?.[0]?.role;
        const target = role === "admin" ? "/admin" : "/dashboard";
        throw redirect({ to: target, replace: true });
      }
    }
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Create account — NAGRIKX" },
      {
        name: "description",
        content: "Create a free NAGRIKX citizen account to report and track civic issues.",
      },
      { property: "og:title", content: "Create account — NAGRIKX" },
      { property: "og:description", content: "Join NAGRIKX and help your city improve." },
    ],
  }),
  component: RegisterPage,
});

// Default fallback departments if database query is pending or empty
const FALLBACK_DEPARTMENTS = [
  { id: '00000000-0001-0000-0000-000000000001', name: 'Roads & Municipal Transport' },
  { id: '00000000-0001-0000-0000-000000000002', name: 'Solid Waste & Sanitation' },
  { id: '00000000-0001-0000-0000-000000000003', name: 'Street Lighting & Public Works' },
  { id: '00000000-0001-0000-0000-000000000004', name: 'Water Resources & Sewage' },
];

type AccountType = 'citizen' | 'department_officer';

function RegisterPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [accountType, setAccountType] = useState<AccountType>('citizen');
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS);

  useEffect(() => {
    let active = true;
    async function checkAuthAndDepartments() {
      if (isDevSignedIn()) {
        const token = getStoredDevToken();
        const parsed = token ? parseDevToken(token) : null;
        const target = parsed?.role === "admin" ? "/admin" : "/dashboard";
        await navigate({ to: target, replace: true });
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      if (authData.user) {
        await navigate({ to: "/dashboard", replace: true });
        return;
      }

      try {
        const { data } = await supabase
          .from('departments')
          .select('id, name')
          .eq('active', true)
          .order('name');
        if (active && data && data.length > 0) {
          setDepartments(data);
        }
      } catch (err) {
        console.warn('Could not load departments from database, using fallback:', err);
      }
    }
    void checkAuthAndDepartments();
    return () => {
      active = false;
    };
  }, [navigate]);
  const [v, setV] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    consent: false,
    departmentId: "",
    designation: "",
    employeeId: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice("");
    const payload = {
      ...v,
      accountType,
      departmentId: accountType === 'department_officer' ? v.departmentId : undefined,
      designation: accountType === 'department_officer' ? v.designation : undefined,
      employeeId: accountType === 'department_officer' ? v.employeeId : undefined,
    };
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      const result = await register(parsed.data);
      if ('pendingOfficer' in result && result.pendingOfficer) {
        setNotice(
          "Your department officer application has been submitted! An administrator will review and approve your account. You'll receive an email once approved."
        );
      } else if (result.session) {
        await navigate({ to: "/dashboard", replace: true });
      } else {
        setNotice("Check your email to confirm your account before signing in.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Join your city"
      subtitle="Create an account to report issues and follow them to resolution."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-forest underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {!isBackendConfigured && (
        <div className="mb-6">
          <FormNotice>
            Accounts aren't switched on in this preview yet, so no account will be created.
          </FormNotice>
        </div>
      )}

      {/* ── Account type selector ─────────────────────────────────────── */}
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-foreground">I want to register as</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('citizen')}
            className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all ${
              accountType === 'citizen'
                ? 'border-forest bg-forest/5 shadow-sm'
                : 'border-border hover:border-forest/40 hover:bg-sage/30'
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              accountType === 'citizen' ? 'bg-forest text-white' : 'bg-muted text-muted-foreground'
            }`}>
              <User className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">Citizen</span>
            <span className="text-xs text-muted-foreground">Report civic issues</span>
            {accountType === 'citizen' && (
              <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-forest" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setAccountType('department_officer')}
            className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all ${
              accountType === 'department_officer'
                ? 'border-ember bg-ember/5 shadow-sm'
                : 'border-border hover:border-ember/40 hover:bg-peach/30'
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              accountType === 'department_officer' ? 'bg-ember text-white' : 'bg-muted text-muted-foreground'
            }`}>
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold">Department Officer</span>
            <span className="text-xs text-muted-foreground">Requires approval</span>
            {accountType === 'department_officer' && (
              <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-ember" />
            )}
          </button>
        </div>
      </div>

      {/* ── Officer approval notice ───────────────────────────────────── */}
      {accountType === 'department_officer' && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-ember/20 bg-ember/5 p-3 text-sm text-ember">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Department officer accounts require administrator approval. After registering, your
            application will be reviewed and you'll be notified once approved.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label="Full name"
          autoComplete="name"
          value={v.fullName}
          error={errors["fullName"]}
          onChange={(e) => setV({ ...v, fullName: e.target.value })}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={v.email}
          error={errors["email"]}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="8+ chars, a letter & number"
          value={v.password}
          error={errors["password"]}
          onChange={(e) => setV({ ...v, password: e.target.value })}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={v.confirmPassword}
          error={errors["confirmPassword"]}
          onChange={(e) => setV({ ...v, confirmPassword: e.target.value })}
        />

        {/* ── Officer-specific fields ───────────────────────────────── */}
        {accountType === 'department_officer' && (
          <div className="space-y-4 rounded-lg border border-ember/10 bg-paper p-4">
            <p className="text-sm font-semibold text-foreground">Department details</p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Department</label>
              <Select value={v.departmentId} onValueChange={(val) => setV({ ...v, departmentId: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["departmentId"] && (
                <p role="alert" className="mt-1 text-sm text-destructive">{errors["departmentId"]}</p>
              )}
            </div>
            <TextField
              label="Designation / Title"
              placeholder="e.g. Junior Engineer, Ward Officer"
              value={v.designation}
              error={errors["designation"]}
              onChange={(e) => setV({ ...v, designation: e.target.value })}
            />
            <TextField
              label="Employee ID (optional)"
              placeholder="Your government employee ID"
              value={v.employeeId}
              error={errors["employeeId"]}
              onChange={(e) => setV({ ...v, employeeId: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={v.consent}
              onChange={(e) => setV({ ...v, consent: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[var(--forest)]"
              aria-invalid={Boolean(errors["consent"])}
            />
            <span>
              I agree that my reports, photos and approximate locations may be shown publicly to
              help resolve issues. My email stays private.
            </span>
          </label>
          {errors["consent"] && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {errors["consent"]}
            </p>
          )}
        </div>
        {notice && (
          <div className="flex items-start gap-2 rounded-lg border border-forest/20 bg-forest/5 p-3 text-sm text-forest">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {formError && <FormNotice tone="error">{formError}</FormNotice>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Creating account…
            </>
          ) : accountType === 'department_officer' ? (
            "Submit officer application"
          ) : (
            "Create citizen account"
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {accountType === 'citizen'
            ? 'Officer and administrator access is granted by your municipality, not through this form.'
            : 'Your application will be reviewed by an administrator. You will be notified once approved.'}
        </p>
      </form>
    </AuthShell>
  );
}
