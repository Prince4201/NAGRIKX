import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { Menu, X, Plus, LayoutDashboard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isDevSignedIn, clearDevToken, getStoredDevToken, parseDevToken } from "@/lib/dev-auth";
import { Logo } from "./Logo";

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/explore", label: "Explore Issues" },
  { to: "/impact", label: "Our Impact" },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check both Supabase session AND dev token
    const checkAuth = async () => {
      if (isDevSignedIn()) {
        const token = getStoredDevToken();
        const parsed = parseDevToken(token || '');
        setSignedIn(true);
        setUserRole(parsed?.role || null);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setSignedIn(true);
        const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).single();
        setUserRole(roleRow?.role || 'citizen');
      } else {
        setSignedIn(false);
        setUserRole(null);
      }
    };
    void checkAuth();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSignedIn(true);
        void checkAuth();
      } else if (isDevSignedIn()) {
        setSignedIn(true);
        const token = getStoredDevToken();
        const parsed = parseDevToken(token || '');
        setUserRole(parsed?.role || null);
      } else {
        setSignedIn(false);
        setUserRole(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    clearDevToken();
    await supabase.auth.signOut();
    setSignedIn(false);
    setUserRole(null);
    await navigate({ to: '/', replace: true });
  };

  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });

  const isStaff = userRole === 'department_officer' || userRole === 'admin';
  const workspaceHref = userRole === 'admin' ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 px-4 backdrop-blur-xl">
      <motion.div className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ember" style={{ scaleX: reduce ? scrollYProgress : progress }} />
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 sm:flex sm:justify-between">
        <Logo className="min-w-0 shrink-0" />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-ink/5 data-[status=active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {signedIn ? (
            <>
              <Button asChild variant="forest" size="sm" className="hidden sm:inline-flex shadow-xs gap-1.5">
                <Link to={workspaceHref}>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Go to Workspace</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign In</Link>
            </Button>
          )}

          {!isStaff && (
            <Button asChild variant={signedIn ? "outline" : "forest"} size="sm" className="hidden sm:inline-flex">
              <Link to="/report">
                <Plus /> Report an Issue
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mb-3 max-w-6xl rounded-lg border border-ink/10 bg-paper p-3 shadow-lift lg:hidden"
          >
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 font-display text-lg data-[status=active]:bg-sage"
                activeOptions={{ exact: true }}
              >
                {l.label}
              </Link>
            ))}
            <div className={`mt-2 grid ${signedIn || !isStaff ? 'grid-cols-2' : 'grid-cols-1'} gap-2 border-t pt-3`}>
              {signedIn ? (
                <>
                  <Button asChild variant="forest">
                    <Link to={workspaceHref} onClick={() => setOpen(false)}>
                      Go to Workspace
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={() => { setOpen(false); void handleSignOut(); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link to="/login" onClick={() => setOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  {!isStaff && (
                    <Button asChild>
                      <Link to="/report" onClick={() => setOpen(false)}>
                        Report an Issue
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
