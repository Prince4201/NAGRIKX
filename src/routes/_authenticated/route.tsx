import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { isDevSignedIn } from '@/lib/dev-auth';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    // Allow access if signed in via dev token (admin/officer/citizen)
    if (isDevSignedIn()) return;
    // Otherwise require a real Supabase session
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: '/login', replace: true });
  },
  component: Outlet,
});
