import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { Tables } from "../lib/database.types";
import {
  Loader2,
  Trophy,
  Users,
  Calendar,
  ChevronRight,
  Plus,
  AlertCircle,
  LogOut,
} from "lucide-react";

interface HackathonWithTeams extends Tables<"hackathons"> {
  teams: Tables<"teams">[];
  teamCount: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HackathonsDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [hackathons, setHackathons] = useState<HackathonWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonWithTeams | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Tables<"teams"> | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<{
    participant: Tables<"participants">;
    hackathon: Tables<"hackathons">;
    team: Tables<"teams"> | null;
  } | null>(null);

  useEffect(() => {
    async function fetchHackathons() {
      setLoading(true);

      const { data: hackData } = await supabase
        .from("hackathons")
        .select("*")
        .order("start_date", { ascending: true, nullsLast: true });

      const { data: teamData } = await supabase.from("teams").select("*");

      const teamsByHackathon = new Map<string, Tables<"teams">[]>();
      for (const t of teamData ?? []) {
        const arr = teamsByHackathon.get(t.hackathon_id) ?? [];
        arr.push(t);
        teamsByHackathon.set(t.hackathon_id, arr);
      }

      const enriched: HackathonWithTeams[] = (hackData ?? []).map((h) => {
        const teams = teamsByHackathon.get(h.id) ?? [];
        return { ...(h as Tables<"hackathons">), teams, teamCount: teams.length };
      });

      setHackathons(enriched);
      setLoading(false);
    }

    fetchHackathons();
  }, []);

  useEffect(() => {
    async function fetchExisting() {
      if (auth.status !== "authenticated") return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: participant } = await supabase
        .from("participants")
        .select("*, hackathon:hackathons(*), team:teams(*)")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (participant) {
        setExistingRegistration({
          participant: participant as Tables<"participants">,
          hackathon: (participant as Record<string, unknown>).hackathon as Tables<"hackathons">,
          team: ((participant as Record<string, unknown>).team as Tables<"teams">) ?? null,
        });
      }
    }

    fetchExisting();
  }, [auth.status]);

  const handleHackathonSelect = useCallback(
    (hack: HackathonWithTeams) => {
      setSelectedHackathon(hack);
      setSelectedTeam(null);
      setNewTeamName("");
      setError(null);

      if (auth.role === "participant") {
        // Check if already registered for this hackathon
        if (existingRegistration?.hackathon.id === hack.id) {
          // Already registered, go to wizard
          navigate("/wizard");
          return;
        }
        setShowTeamSelection(true);
      } else {
        // Organizer - go to dashboard for this hackathon
        navigate("/dashboard");
      }
    },
    [auth.role, existingRegistration, navigate]
  );

  const handleTeamSelect = useCallback((team: Tables<"teams">) => {
    setSelectedTeam(team);
    setNewTeamName("");
    setError(null);
  }, []);

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim() || !selectedHackathon) return;

    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("Session expired. Please sign in again.");
      setSubmitting(false);
      return;
    }

    const { data, error: createError } = await supabase
      .from("teams")
      .insert({
        hackathon_id: selectedHackathon.id,
        name: newTeamName.trim(),
        is_approved: false,
        created_by: null,
      })
      .select()
      .single();

    if (createError) {
      setError("Failed to create team. Please try again.");
      setSubmitting(false);
      return;
    }

    setSelectedTeam(data as Tables<"teams">);
    setNewTeamName("");
    setSubmitting(false);
  }, [newTeamName, selectedHackathon]);

  const handleJoinHackathon = useCallback(async () => {
    if (!selectedHackathon || !selectedTeam) return;

    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("Session expired. Please sign in again.");
      setSubmitting(false);
      return;
    }

    const userId = session.user.id;
    const email = session.user.email ?? "";

    const { data: participantData, error: participantError } = await supabase
      .from("participants")
      .upsert(
        {
          auth_user_id: userId,
          email,
          name: email.split("@")[0],
          hackathon_id: selectedHackathon.id,
          team_id: selectedTeam.id,
          github_username: null,
          discord_username: null,
        },
        { onConflict: "auth_user_id" }
      )
      .select("id")
      .single();

    if (participantError) {
      setError(participantError.message);
      setSubmitting(false);
      return;
    }

    // Update team created_by if this was a new team
    await supabase.from("teams").update({ created_by: participantData?.id }).eq("id", selectedTeam.id);

    setSubmitting(false);
    navigate("/wizard");
  }, [selectedHackathon, selectedTeam, navigate]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }, [navigate]);

  if (auth.status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (auth.status !== "authenticated") {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-10">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-foreground/50 hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all duration-150 cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate("/")}
            className="w-16 h-16 mx-auto mb-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center cursor-pointer hover:bg-accent/20 transition-all active:scale-95"
            aria-label="Go to home"
          >
            <span className="text-accent font-heading text-2xl">LL</span>
          </button>
          <h1 className="font-heading text-3xl text-foreground tracking-wider uppercase">
            Hackathons
          </h1>
          <p className="text-foreground/60 text-sm mt-2 font-sans">
            {auth.role === "organizer" ? "Manage your hackathons" : "Join a hackathon and build your project"}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {!showTeamSelection ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-accent" aria-hidden="true" />
              </div>
              <p className="text-foreground/70 text-sm">
                {auth.role === "organizer" ? "Your hackathons" : "Available hackathons"}
              </p>
            </div>

            {hackathons.length === 0 ? (
              <div className="bg-muted border border-border rounded-2xl p-10 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-foreground/30" aria-hidden="true" />
                <p className="text-foreground/80 font-medium">No hackathons available</p>
                <p className="text-foreground/40 text-sm mt-1">
                  {auth.role === "organizer"
                    ? "Create your first hackathon to get started."
                    : "Check back later for new hackathons."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hackathons.map((hack, index) => (
                  <button
                    key={hack.id}
                    type="button"
                    onClick={() => handleHackathonSelect(hack)}
                    className="bg-muted border border-border rounded-2xl p-5 text-left hover:border-accent/40 hover:bg-muted/80 transition-all duration-200 active:scale-[0.98] cursor-pointer group text-start"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <h3 className="font-heading text-sm text-foreground tracking-wider uppercase truncate mb-2">
                      {hack.name}
                    </h3>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border mb-3 bg-accent/10 border-accent/30 text-accent">
                      {hack.start_date && new Date(hack.start_date) > new Date()
                        ? "Upcoming"
                        : hack.end_date && new Date(hack.end_date) < new Date()
                          ? "Ended"
                          : "Active"}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-foreground/40 mb-2">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      <span>
                        {formatDate(hack.start_date)}
                        {hack.end_date ? ` — ${formatDate(hack.end_date)}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                      <Users className="w-3 h-3" aria-hidden="true" />
                      <span>
                        {hack.teamCount} team{hack.teamCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span>{auth.role === "organizer" ? "Manage" : "Join"}</span>
                      <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-foreground/70 text-sm">
                  Join a team for{" "}
                  <span className="text-accent font-medium">{selectedHackathon?.name}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowTeamSelection(false);
                    setSelectedHackathon(null);
                  }}
                  className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors duration-150 cursor-pointer"
                >
                  Choose different hackathon
                </button>
              </div>
            </div>

            {selectedHackathon && selectedHackathon.teams.length > 0 && (
              <div className="space-y-2 mb-6">
                <p className="text-xs text-foreground/50 uppercase tracking-wider mb-3">
                  Join an existing team
                </p>
                {selectedHackathon.teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleTeamSelect(team)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                      selectedTeam?.id === team.id
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-muted border-border hover:border-accent/30 hover:bg-muted/80"
                    }`}
                    aria-pressed={selectedTeam?.id === team.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center">
                        <span className="font-heading text-xs text-foreground/60">
                          {team.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-foreground font-medium">{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-border/40 pt-5">
              <p className="text-xs text-foreground/50 uppercase tracking-wider mb-3">
                Or create a new team
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value);
                    if (selectedTeam) setSelectedTeam(null);
                  }}
                  placeholder="Your team name"
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all duration-150"
                  aria-label="New team name"
                />
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={submitting || !newTeamName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  )}
                  Create
                </button>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleJoinHackathon}
                disabled={!selectedTeam || submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    Join Hackathon with {selectedTeam?.name ?? "selected team"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
