import { useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { SiGithub } from "react-icons/si";

export function isLikelyGitHubPat(token: string): boolean {
  const trimmed = token.trim();
  return (
    /^(ghp_|github_pat_|gho_)[A-Za-z0-9_]+$/.test(trimmed) &&
    trimmed.length >= 20
  );
}

interface TeamLeadGithubPatStepProps {
  teamName: string;
  githubUsername: string;
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
}

export default function TeamLeadGithubPatStep({
  teamName,
  githubUsername,
  value,
  onChange,
  onContinue,
  onBack,
  submitting = false,
  error = null,
}: TeamLeadGithubPatStepProps) {
  const [showPat, setShowPat] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleContinue() {
    if (!value.trim()) {
      setLocalError("Please paste your GitHub Personal Access Token.");
      return;
    }
    if (!isLikelyGitHubPat(value)) {
      setLocalError(
        "That doesn't look like a valid GitHub token. It should start with ghp_, github_pat_, or gho_."
      );
      return;
    }
    setLocalError(null);
    onContinue();
  }

  const displayError = error || localError;

  return (
    <div className="bg-muted border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-secondary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-heading text-base text-foreground tracking-wider uppercase">
            Connect GitHub for {teamName}
          </h2>
          <p className="text-foreground/60 text-sm">
            As team lead, your token creates a private repo under your GitHub account.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 mt-4 mb-6 rounded-xl bg-accent/5 border border-accent/20 px-4 py-3 text-sm text-foreground/80">
        <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Your token is sent once to create the team repository and is{" "}
          <strong className="text-foreground">never stored</strong> on our servers.
          You can revoke it in GitHub settings after registration.
        </p>
      </div>

      {/* Instructions */}
      <details className="mb-6 group rounded-xl border border-border bg-background/50 open:bg-background">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <SiGithub className="w-4 h-4" aria-hidden="true" />
            How to create a GitHub Personal Access Token
          </span>
          <ChevronRight
            className="w-4 h-4 text-foreground/40 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
        </summary>

        <div className="px-4 pb-4 space-y-5 text-sm text-foreground/70 border-t border-border/40 pt-4">
          <div>
            <p className="font-medium text-foreground mb-2">
              Option A — Fine-grained token (recommended)
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li>
                Open{" "}
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  GitHub → Settings → Developer settings → Fine-grained tokens
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </li>
              <li>Click <strong className="text-foreground">Generate new token</strong>.</li>
              <li>
                Set <strong className="text-foreground">Repository access</strong> to{" "}
                <strong className="text-foreground">All repositories</strong> (or only repositories
                you own).
              </li>
              <li>
                Under <strong className="text-foreground">Permissions → Repository permissions</strong>,
                set <strong className="text-foreground">Administration</strong> and{" "}
                <strong className="text-foreground">Contents</strong> to{" "}
                <strong className="text-foreground">Read and write</strong>.
              </li>
              <li>
                Set expiration (e.g. 7 or 30 days), generate, and copy the token — it starts with{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">github_pat_</code>.
              </li>
            </ol>
          </div>

          <div>
            <p className="font-medium text-foreground mb-2">
              Option B — Classic token
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li>
                Open{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  GitHub → Settings → Developer settings → Personal access tokens (classic)
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </li>
              <li>Click <strong className="text-foreground">Generate new token (classic)</strong>.</li>
              <li>
                Enable the <strong className="text-foreground">repo</strong> scope (full control of
                private repositories).
              </li>
              <li>
                Generate and copy the token — it starts with{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">ghp_</code>.
              </li>
            </ol>
          </div>

          <p className="text-xs text-foreground/50">
            Signed in as{" "}
            <span className="font-mono text-foreground/70">
              {githubUsername || "your GitHub username"}
            </span>
            . The repository will be created under this account.
          </p>
        </div>
      </details>

      {displayError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {displayError}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="team-lead-github-pat" className="text-xs text-foreground/50 uppercase tracking-wider">
          GitHub Personal Access Token
        </label>
        <div className="relative">
          <SiGithub
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30"
            aria-hidden="true"
          />
          <input
            id="team-lead-github-pat"
            type={showPat ? "text" : "password"}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setLocalError(null);
            }}
            placeholder="ghp_… or github_pat_…"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-10 pr-12 py-3 bg-background border border-border rounded-xl text-foreground font-mono text-sm placeholder:text-foreground/30 placeholder:font-sans focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-150"
          />
          <button
            type="button"
            onClick={() => setShowPat((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer"
            aria-label={showPat ? "Hide token" : "Show token"}
          >
            {showPat ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-foreground/70 hover:bg-muted transition-all duration-150 disabled:opacity-50 cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting || !value.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          )}
          Continue
        </button>
      </div>
    </div>
  );
}
