import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function WorkspaceFooter({
  userName,
  roleName,
}: {
  userName?: string;
  roleName?: string;
}) {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-ivory/60 py-6 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <Shield className="h-3.5 w-3.5 text-forest" />
          <span className="font-semibold text-foreground">NAGRIKX Civic Workspace</span>
          <span>·</span>
          <span>Verified Session</span>
          {userName && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                Signed in as <strong className="text-foreground font-medium">{userName}</strong> ({roleName?.replaceAll("_", " ")})
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/explore" className="hover:text-foreground transition-colors">
            Public Issues Map
          </Link>
          <Link to="/profile" className="hover:text-foreground transition-colors">
            Profile Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
