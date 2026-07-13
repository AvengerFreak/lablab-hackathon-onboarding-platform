import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { APP_NAME, APP_TAGLINE } from "../lib/config";
import { Loader2, Users, ShieldCheck, Check } from "lucide-react";
import { SiGithub, SiDiscord } from "react-icons/si";

type AuthView = "signin" | "signup" | "link_accounts";
type AuthRole = "participant" | "organizer";
type LinkStep = "none" | "github" | "discord" | "both";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<AuthView>("signin");
  const [role, setRole] = useState<AuthRole>("participant");
  const [loading, setLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [linkStep, setLinkStep] = useState<LinkStep>("none");
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    setMessage(null);
  }, [view, role]);

  useEffect(() => {
    if (hasCheckedSession) return;

    async function checkSession() {
      try {
        const sessionResult = await supabase.auth.getSession();
        if (!sessionResult?.data?.session?.user) {
          setHasCheckedSession(true);
          return;
        }

        const {
          data: identities,
          error,
        } = await supabase.auth.getUserIdentities();

        if (error) {
          setHasCheckedSession(true);
          return;
        }

        const providers = new Set((identities?.identities ?? []).map((i) => i.provider));
        const hasGithub = providers.has("github");
        const hasDiscord = providers.has("discord");

        if (hasGithub && hasDiscord) {
          // Check if user has a role determined
          const { data: organizer } = await supabase
            .from("organizers")
            .select("id")
            .eq("auth_user_id", sessionResult.data.session.user.id)
            .maybeSingle();

          setHasCheckedSession(true);

          if (organizer) {
            navigate("/dashboard", { replace: true });
            return;
          }

          navigate("/hackathons", { replace: true });
          return;
        }

        setHasCheckedSession(true);

        if (hasGithub && !hasDiscord) {
          setView("link_accounts");
          setLinkStep("discord");
          return;
        }

        if (!hasGithub && !hasDiscord) {
          setView("link_accounts");
          setLinkStep("both");
          return;
        }

        navigate("/hackathons", { replace: true });
      } catch (error) {
        console.error("Error checking session:", error);
        setHasCheckedSession(true);
        // Don't redirect on error, just stay on auth page
      }
    }

    checkSession();
  }, [navigate, hasCheckedSession]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage({
        type: "error",
        text:
          error.message === "Invalid login credentials"
            ? "Wrong email or password. Try again."
            : error.message,
      });
      setLoading(false);
      return;
    }

    const {
      data: identities,
      error: identitiesError,
    } = await supabase.auth.getUserIdentities();

    if (identitiesError) {
      setMessage({ type: "error", text: identitiesError.message });
      setLoading(false);
      return;
    }

    const providers = new Set((identities?.identities ?? []).map((i) => i.provider));
    const hasGithub = providers.has("github");
    const hasDiscord = providers.has("discord");

    if (role === "organizer" && data.user) {
      await supabase.from("organizers").upsert(
        { auth_user_id: data.user.id, email: data.user.email ?? "" },
        { onConflict: "auth_user_id" }
      );
      navigate("/dashboard", { replace: true });
      setLoading(false);
      return;
    }

    if (!hasGithub || !hasDiscord) {
      setView("link_accounts");
      setLinkStep(!hasGithub && !hasDiscord ? "both" : !hasGithub ? "github" : "discord");
      setMessage({
        type: "success",
        text: "Signed in successfully. Please link your GitHub and Discord accounts to continue.",
      });
      setLoading(false);
      return;
    }

    navigate("/hackathons", { replace: true });
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    if (data?.user && !data?.session) {
      setMessage({
        type: "success",
        text:
          role === "organizer"
            ? "Check your email for a confirmation link. After confirming, sign in and select organizer."
            : "Check your email for a confirmation link to complete sign up.",
      });
      setLoading(false);
      return;
    }

    if (data?.user && data?.session) {
      if (role === "organizer") {
        await supabase.from("organizers").upsert(
          { auth_user_id: data.user.id, email: data.user.email ?? "" },
          { onConflict: "auth_user_id" }
        );
        navigate("/dashboard", { replace: true });
        setLoading(false);
        return;
      }

      setView("link_accounts");
      setLinkStep("both");
      setMessage({
        type: "success",
        text: "Account created. Please link your GitHub and Discord accounts to continue.",
      });
    }

    setLoading(false);
  }

  async function linkGithub() {
    setLinkingLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLinkingLoading(false);
      return;
    }

    setLinkingLoading(false);
  }

  async function linkDiscord() {
    setLinkingLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.linkIdentity({
      provider: "discord",
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLinkingLoading(false);
      return;
    }

    setLinkingLoading(false);
  }

  async function handleContinueAfterLinking() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setMessage({ type: "error", text: "Session expired. Please sign in again." });
      return;
    }

    navigate("/hackathons", { replace: true });
  }

  function toggleRole() {
    setRole((prev) => (prev === "participant" ? "organizer" : "participant"));
  }

  async function handleGithubOAuth() {
    if (role === "organizer") {
      sessionStorage.setItem("pending_role", "organizer");
    } else {
      sessionStorage.setItem("pending_role", "participant");
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      sessionStorage.removeItem("pending_role");
      setMessage({
        type: "error",
        text: error.message || "GitHub sign-in failed.",
      });
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <button
          onClick={() => navigate("/")}
          className="w-16 h-16 mx-auto mb-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center cursor-pointer hover:bg-accent/20 transition-all active:scale-95"
          aria-label="Go to home"
        >
          <span className="text-accent font-heading text-2xl">LL</span>
        </button>
        <h1 className="font-heading text-3xl text-foreground tracking-wider uppercase">
          {APP_NAME}
        </h1>
        <p className="text-foreground/60 text-sm mt-2 font-sans">{APP_TAGLINE}</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-muted border border-border rounded-2xl p-6">
          {message && (
            <div
              role="alert"
              className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                message.type === "success"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {message.text}
            </div>
          )}

          {(view === "signin" || view === "signup") && (
            <>
              <div className="flex mb-6 bg-background rounded-xl p-1 border border-border">
                <button
                  type="button"
                  aria-label="Sign In tab"
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    view === "signin"
                      ? "bg-accent text-black shadow-sm"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                  onClick={() => setView("signin")}
                  aria-pressed={view === "signin"}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  aria-label="Sign Up tab"
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    view === "signup"
                      ? "bg-accent text-black shadow-sm"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                  onClick={() => setView("signup")}
                  aria-pressed={view === "signup"}
                >
                  Sign Up
                </button>
              </div>

              <div className="mb-4 flex items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                    role === "organizer"
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-background text-foreground/50 border-border"
                  }`}
                >
                  {role === "organizer" ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      Organizer
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      Participant
                    </>
                  )}
                </span>
              </div>

              <form
                onSubmit={view === "signin" ? handleSignIn : handleSignUp}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="auth-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-150"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-150"
                    autoComplete={view === "signin" ? "current-password" : "new-password"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="w-full py-3 bg-accent text-black font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                  {view === "signin"
                    ? role === "organizer"
                      ? "Sign In as Organizer"
                      : "Sign In"
                    : role === "organizer"
                      ? "Create Organizer Account"
                      : "Create Account"}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-foreground/40 bg-muted">or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGithubOAuth}
                disabled={loading}
                className="w-full py-3 bg-background border border-border text-foreground rounded-xl hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
              >
                <SiGithub className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">GitHub</span>
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={toggleRole}
                  className="text-sm text-accent hover:text-accent/80 underline underline-offset-2 transition-colors duration-150 cursor-pointer"
                >
                  {role === "participant" ? "I am an organizer" : "I am a participant"}
                </button>
              </div>
            </>
          )}

          {view === "link_accounts" && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="font-heading text-lg text-foreground tracking-wider uppercase mb-2">
                  Link Your Accounts
                </h2>
                <p className="text-foreground/60 text-sm">
                  {linkStep === "discord"
                    ? "Your GitHub is linked. Please link Discord to continue."
                    : "Please link your GitHub and Discord accounts to continue."}
                </p>
              </div>

              {(linkStep === "both" || linkStep === "github") && (
                <button
                  type="button"
                  onClick={linkGithub}
                  disabled={linkingLoading}
                  className="w-full py-3 bg-background border border-border text-foreground rounded-xl hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
                >
                  {linkingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <SiGithub className="w-5 h-5" aria-hidden="true" />
                  )}
                  <span className="font-medium">Link GitHub</span>
                </button>
              )}

              {(linkStep === "both" || linkStep === "discord") && (
                <button
                  type="button"
                  onClick={linkDiscord}
                  disabled={linkingLoading}
                  className="w-full py-3 bg-background border border-border text-foreground rounded-xl hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
                >
                  {linkingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <SiDiscord className="w-5 h-5" aria-hidden="true" />
                  )}
                  <span className="font-medium">Link Discord</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleContinueAfterLinking}
                className="w-full py-3 bg-accent text-black font-semibold rounded-xl hover:opacity-90 transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Continue
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-foreground/40">
          {role === "organizer"
            ? "Organizers can create and manage hackathons."
            : "By signing in, you agree to participate in the hackathon."}
        </p>
      </div>
    </div>
  );
}