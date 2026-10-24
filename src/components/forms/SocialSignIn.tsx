import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FormNotice } from './FormField';

export function SocialSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in with Google.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <Button variant="outline" className="w-full" disabled={busy} onClick={signInWithGoogle}>
        Continue with Google
      </Button>
      {error && <FormNotice tone="error">{error}</FormNotice>}
    </div>
  );
}
