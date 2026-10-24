<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Built on TanStack Start (not Next.js); pages live in `src/routes`, shared UI in `src/components/{site,landing,forms,report}` — keeps sections reusable across pages.
- Demo/sample data lives only in `src/lib/demo-data.ts` and is always labelled as illustrative in the UI — so it can be swapped for real queries later.
- Auth and browser photo transfers go through `src/lib/backend.ts`; protected data operations use `src/lib/civic.functions.ts` with authenticated RLS and the existing database RPCs — never fake success.
- Form validation schemas live in `src/lib/validation.ts` (zod) — one source of truth for client and future server checks.
- Public registration only ever creates citizen accounts; elevated roles are granted by admins.
- Shared motion uses Motion with reduced-motion guards and global CSS fallbacks; decorative movement must never prevent navigation or reading content.
- Home, illustrative map and auth scenes reuse a shared bundled city illustration; the opening scene scrubs generated living-city frames from CDN WebP atlases with bounded decoded-image caching and time-based damping, with a static image for reduced motion — scene action replaces artificial zoom while limiting memory usage.
- Issue discovery filters and sorting live in a pure shared helper; illustrative issue overlays and lists derive from central demo data to avoid competing sample records.

- Signed-in workspaces live under `_authenticated`; public discovery exposes only moderated summaries, never addresses or private photos.
