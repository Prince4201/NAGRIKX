import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/forms/AuthShell";
import { TextField, FormNotice } from "@/components/forms/FormField";
import { signInSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { isBackendConfigured, signIn } from "@/lib/backend";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — NAGRIKX" },
      {
        name: "description",
        content: "Sign in to NAGRIKX to report civic issues and track their resolution.",
      },
      { property: "og:title", content: "Sign in — NAGRIKX" },
      {
        property: "og:description",
        content: "Sign in to report civic issues and track their resolution.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      await signIn(parsed.data);
      await navigate({to:"/dashboard"});
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to follow your reports and their progress."
      footer={
        <>
          New to NAGRIKX?{" "}
          <Link
            to="/register"
            className="font-medium text-forest underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {!isBackendConfigured && (
        <div className="mb-6">
          <FormNotice>
            Accounts aren't switched on in this preview yet. You can try the form, but no one can
            sign in until the backend is connected.
          </FormNotice>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          error={errors["email"]}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors["password"]}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
        />
        <Button asChild variant="link"><Link to="/recovery">Forgot password?</Link></Button>
        {formError && <FormNotice tone="error">{formError}</FormNotice>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
