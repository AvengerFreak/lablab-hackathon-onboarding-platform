import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateInfraRequest {
  team_id: string;
  /** Team lead PAT — used once to create a repo under their account. Never stored. */
  github_pat?: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  steps_completed: Record<string, boolean>;
  github_username: string | null;
  discord_username: string | null;
}

interface Team {
  id: string;
  name: string;
  hackathon_id: string;
  is_approved: boolean;
  github_repo_url: string | null;
  discord_channel_id: string | null;
  created_by: string | null;
}

interface Hackathon {
  id: string;
  name: string;
  slug: string;
  github_org: string | null;
  discord_server_id: string | null;
}

const VIEW_CHANNEL = 0x00000400;
const SEND_MESSAGES = 0x00000800;
const READ_MESSAGE_HISTORY = 0x00010000;
const CONNECT = 0x00100000;
const MEMBER_CHANNEL_PERMS =
  VIEW_CHANNEL |
  SEND_MESSAGES |
  READ_MESSAGE_HISTORY |
  CONNECT |
  0x00001000 |
  0x00002000 |
  0x00004000 |
  0x00008000 |
  0x00020000 |
  0x00040000 |
  0x00080000 |
  0x00200000 |
  0x00400000 |
  0x00800000 |
  0x01000000 |
  0x02000000;

/* ── Rate limiter ─────────────────────────────────── */

const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(hackathonId: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const maxCalls = 5;

  let timestamps = rateLimitStore.get(hackathonId);
  if (!timestamps) {
    timestamps = [];
    rateLimitStore.set(hackathonId, timestamps);
  }

  const recent = timestamps.filter((t) => now - t < window);
  rateLimitStore.set(hackathonId, recent);

  if (recent.length >= maxCalls) return false;

  recent.push(now);
  return true;
}

/* ── Helpers ───────────────────────────────────────── */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function parseRepoFromUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function normalizeDiscordQuery(username: string): string {
  return username.split("#")[0].trim();
}

async function getGitHubLogin(pat: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "hackathon-onboarding",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.login === "string" ? data.login : null;
  } catch {
    return null;
  }
}

async function createGitHubRepo(
  teamName: string,
  hackathonSlug: string,
  githubOrg: string | null,
  pat: string,
  templateOwner: string,
  templateRepo: string,
  underTeamLeadAccount = false
): Promise<{ url: string | null; error: string | null }> {
  const repoName = `${hackathonSlug}-${slugify(teamName)}`;

  const useTemplate = !underTeamLeadAccount && templateOwner && templateRepo;
  let templateOwnerForGenerate = githubOrg || templateOwner;

  if (underTeamLeadAccount && templateOwner && templateRepo) {
    const login = await getGitHubLogin(pat);
    if (login) templateOwnerForGenerate = login;
  }

  const endpoint = useTemplate
    ? `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`
    : underTeamLeadAccount || !githubOrg
      ? `https://api.github.com/user/repos`
      : `https://api.github.com/orgs/${githubOrg}/repos`;

  const body: Record<string, unknown> = useTemplate
    ? {
        owner: templateOwnerForGenerate,
        name: repoName,
        description: `Team ${teamName} — ${hackathonSlug} Hackathon`,
        include_all_branches: false,
        private: true,
      }
    : {
        name: repoName,
        description: `Team ${teamName} — ${hackathonSlug} Hackathon`,
        private: true,
        auto_init: true,
      };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "hackathon-onboarding",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "Unknown error");
      return {
        url: null,
        error: `GitHub API (${response.status}): ${errBody.slice(0, 300)}`,
      };
    }

    const data = await response.json();
    return { url: data.html_url as string, error: null };
  } catch (err) {
    return {
      url: null,
      error: `GitHub request failed: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

async function addGitHubCollaborators(
  repoUrl: string,
  participants: Participant[],
  teamLeadGithub: string | null,
  pat: string
): Promise<{ added: string[]; errors: string[] }> {
  const parsed = parseRepoFromUrl(repoUrl);
  if (!parsed) {
    return { added: [], errors: ["Invalid GitHub repo URL"] };
  }

  const added: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const participant of participants) {
    const username = participant.github_username?.trim();
    if (!username || seen.has(username.toLowerCase())) continue;
    seen.add(username.toLowerCase());

    const permission =
      teamLeadGithub &&
      username.toLowerCase() === teamLeadGithub.toLowerCase()
        ? "admin"
        : "push";

    try {
      const response = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/collaborators/${encodeURIComponent(username)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "hackathon-onboarding",
          },
          body: JSON.stringify({ permission }),
        }
      );

      if (response.ok || response.status === 204) {
        added.push(username);
      } else {
        const errBody = await response.text().catch(() => "Unknown");
        errors.push(`${username}: GitHub API (${response.status}) ${errBody.slice(0, 120)}`);
      }
    } catch (err) {
      errors.push(
        `${username}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return { added, errors };
}

async function findDiscordMemberId(
  guildId: string,
  discordUsername: string,
  botToken: string
): Promise<string | null> {
  const query = normalizeDiscordQuery(discordUsername);
  if (!query) return null;

  const membersResponse = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=10`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
        "User-Agent": "hackathon-onboarding",
      },
    }
  );

  if (!membersResponse.ok) return null;

  const members = await membersResponse.json();
  if (!Array.isArray(members) || members.length === 0) return null;

  const normalized = query.toLowerCase();
  const exact = members.find((member: { user?: { username?: string; global_name?: string } }) => {
    const username = member.user?.username?.toLowerCase();
    const globalName = member.user?.global_name?.toLowerCase();
    return username === normalized || globalName === normalized;
  });

  const chosen = exact ?? members[0];
  return chosen?.user?.id ?? null;
}

async function grantDiscordChannelAccess(
  channelId: string,
  userId: string,
  botToken: string
): Promise<string | null> {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/permissions/${userId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
        "User-Agent": "hackathon-onboarding",
      },
      body: JSON.stringify({
        allow: String(MEMBER_CHANNEL_PERMS),
        type: 1,
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "Unknown");
    return `Discord permissions (${response.status}): ${errBody.slice(0, 200)}`;
  }

  return null;
}

async function syncDiscordMembers(
  channelId: string,
  guildId: string,
  participants: Participant[],
  botToken: string
): Promise<{ added: string[]; errors: string[] }> {
  const added: string[] = [];
  const errors: string[] = [];

  for (const participant of participants) {
    const discordUsername = participant.discord_username?.trim();
    if (!discordUsername) continue;

    const userId = await findDiscordMemberId(guildId, discordUsername, botToken);
    if (!userId) {
      errors.push(
        `${discordUsername}: not found in Discord server — join the hackathon server first`
      );
      continue;
    }

    const err = await grantDiscordChannelAccess(channelId, userId, botToken);
    if (err) {
      errors.push(`${discordUsername}: ${err}`);
    } else {
      added.push(discordUsername);
    }
  }

  return { added, errors };
}

async function createDiscordChannel(
  teamName: string,
  hackathonName: string,
  botToken: string,
  guildId: string,
  participantNames: string[]
): Promise<{ channelId: string | null; error: string | null }> {
  const channelName = `team-${slugify(teamName)}`;
  const topic =
    `Team ${teamName} — ${hackathonName}\nMembers: ${participantNames.join(", ")}`;

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
          "User-Agent": "hackathon-onboarding",
        },
        body: JSON.stringify({
          name: channelName,
          type: 0,
          topic: topic.slice(0, 1000),
          reason: `Auto-created for ${teamName}`,
          permission_overwrites: [
            {
              id: guildId,
              type: 0,
              deny: String(VIEW_CHANNEL),
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "Unknown");
      return {
        channelId: null,
        error: `Discord API (${response.status}): ${errBody.slice(0, 300)}`,
      };
    }

    const data = await response.json();
    return { channelId: data.id as string, error: null };
  } catch (err) {
    return {
      channelId: null,
      error: `Discord request failed: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

/* ── Handler ───────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* ── Auth ────────────────────────────────────── */

  const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error: userError } = await sb.auth.getUser(authHeader);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* ── Parse body ───────────────────────────────── */

  let body: CreateInfraRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.team_id || typeof body.team_id !== "string") {
    return new Response(JSON.stringify({ error: "Missing team_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* ── Fetch team ───────────────────────────────── */

  const { data: team, error: teamErr } = await sb
    .from("teams")
    .select("*")
    .eq("id", body.team_id)
    .single();

  if (teamErr || !team) {
    return new Response(JSON.stringify({ error: "Team not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const t = team as unknown as Team;

  /* ── Fetch participants ───────────────────────── */

  const { data: participants, error: partErr } = await sb
    .from("participants")
    .select("*")
    .eq("team_id", body.team_id);

  if (partErr) {
    return new Response(JSON.stringify({ error: "DB error fetching participants" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parts = participants as unknown as Participant[];

  if (parts.length === 0) {
    return new Response(JSON.stringify({ error: "Team has no participants" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const teamLead = t.created_by
    ? parts.find((p) => p.id === t.created_by) ?? parts[0]
    : parts[0];
  const teamLeadGithub = teamLead.github_username?.trim() || null;

  /* ── Fetch hackathon ──────────────────────────── */

  const { data: hack, error: hackErr } = await sb
    .from("hackathons")
    .select("*")
    .eq("id", t.hackathon_id)
    .single();

  if (hackErr || !hack) {
    return new Response(JSON.stringify({ error: "Hackathon not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const h = hack as unknown as Hackathon;

  /* ── Rate limit ───────────────────────────────── */

  if (!checkRateLimit(t.hackathon_id)) {
    return new Response(JSON.stringify({ error: "Rate limit (5/min per hackathon)" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* ── Resolve GitHub PAT ───────────────────────── */

  const teamLeadPat = body.github_pat?.trim() || null;
  const envGithubPat = Deno.env.get("GITHUB_PAT") || null;

  if (teamLeadPat) {
    if (!t.created_by) {
      return new Response(
        JSON.stringify({ error: "Team lead must register before providing a GitHub PAT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const leadParticipant = parts.find((p) => p.id === t.created_by);
    if (!leadParticipant) {
      return new Response(JSON.stringify({ error: "Team lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: leadAuth } = await sb
      .from("participants")
      .select("auth_user_id")
      .eq("id", t.created_by)
      .single();
    if (leadAuth?.auth_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only the team lead can provide a GitHub PAT" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const githubPat = teamLeadPat || envGithubPat;
  const useTeamLeadAccount = !!teamLeadPat;
  const tmplOwner = Deno.env.get("GITHUB_TEMPLATE_OWNER") || "";
  const tmplRepo = Deno.env.get("GITHUB_TEMPLATE_REPO") || "";
  const discordToken = Deno.env.get("DISCORD_BOT_TOKEN");
  const discordGuild = h.discord_server_id || Deno.env.get("DISCORD_GUILD_ID");

  let githubUrl: string | null = t.github_repo_url;
  let githubErr: string | null = null;
  let discordId: string | null = t.discord_channel_id;
  let discordErr: string | null = null;
  let githubSyncErrors: string[] = [];
  let discordSyncErrors: string[] = [];
  let githubAdded: string[] = [];
  let discordAdded: string[] = [];

  const needsGithub = !githubUrl;
  const needsDiscord = !discordId;

  /* ── Create GitHub repo if missing ────────────── */

  if (needsGithub) {
    if (githubPat) {
      const result = await createGitHubRepo(
        t.name,
        h.slug,
        useTeamLeadAccount ? null : h.github_org || null,
        githubPat,
        tmplOwner,
        tmplRepo,
        useTeamLeadAccount
      );
      githubUrl = result.url;
      githubErr = result.error;
    } else {
      githubErr =
        "Team lead GitHub Personal Access Token required to create the repository";
    }
  }

  /* ── Create Discord channel if missing ────────── */

  if (needsDiscord) {
    if (discordToken && discordGuild) {
      const result = await createDiscordChannel(
        t.name,
        h.name,
        discordToken,
        discordGuild,
        parts.map((p) => p.name)
      );
      discordId = result.channelId;
      discordErr = result.error;
    } else {
      discordErr = !discordToken
        ? "DISCORD_BOT_TOKEN not configured"
        : "DISCORD_GUILD_ID not configured";
    }
  }

  /* ── Sync members to GitHub repo ──────────────── */

  if (githubUrl && githubPat) {
    const sync = await addGitHubCollaborators(
      githubUrl,
      parts,
      teamLeadGithub,
      githubPat
    );
    githubAdded = sync.added;
    githubSyncErrors = sync.errors;
    if (githubSyncErrors.length > 0 && !githubErr) {
      githubErr = githubSyncErrors.join("; ");
    }
  }

  /* ── Sync members to Discord channel ──────────── */

  if (discordId && discordToken && discordGuild) {
    const sync = await syncDiscordMembers(
      discordId,
      discordGuild,
      parts,
      discordToken
    );
    discordAdded = sync.added;
    discordSyncErrors = sync.errors;
    if (discordSyncErrors.length > 0 && !discordErr) {
      discordErr = discordSyncErrors.join("; ");
    }
  } else if (!discordToken && !discordErr) {
    discordErr = "DISCORD_BOT_TOKEN not configured";
  } else if (!discordGuild && !discordErr) {
    discordErr = "DISCORD_GUILD_ID not configured";
  }

  /* ── Update team record ───────────────────────── */

  const updates: Record<string, unknown> = {};
  if (githubUrl && githubUrl !== t.github_repo_url) {
    updates.github_repo_url = githubUrl;
  }
  if (discordId && discordId !== t.discord_channel_id) {
    updates.discord_channel_id = discordId;
  }

  const infraExists = !!(githubUrl && discordId);
  const membersSynced =
    githubAdded.length > 0 ||
    discordAdded.length > 0 ||
    (githubUrl && discordId && parts.length > 0);

  if (infraExists && (needsGithub || needsDiscord || membersSynced)) {
    updates.is_approved = true;
  }

  if (Object.keys(updates).length > 0) {
    await sb.from("teams").update(updates).eq("id", body.team_id);
  }

  /* ── Audit log ────────────────────────────────── */

  let actorRole = "participant";
  const { data: orgCheck } = await sb
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (orgCheck) actorRole = "organizer";

  const bothOk = !!(githubUrl && discordId);
  const partial = (githubUrl || discordId) && !bothOk;
  const status = bothOk
    ? needsGithub || needsDiscord
      ? "complete"
      : "synced"
    : partial
      ? "partial"
      : "failed";

  await sb.from("audit_logs").insert({
    hackathon_id: t.hackathon_id,
    actor_id: user.id,
    actor_role: actorRole,
    action: "create_infrastructure",
    metadata: {
      team_id: body.team_id,
      team_name: t.name,
      github_repo_url: githubUrl,
      discord_channel_id: discordId,
      github_error: githubErr,
      discord_error: discordErr,
      github_collaborators_added: githubAdded,
      discord_members_added: discordAdded,
      github_sync_errors: githubSyncErrors,
      discord_sync_errors: discordSyncErrors,
      status,
    },
  });

  /* ── Response ─────────────────────────────────── */

  const statusCode = bothOk ? 200 : partial ? 207 : 500;

  return new Response(
    JSON.stringify({
      team_id: body.team_id,
      team_name: t.name,
      github_repo_url: githubUrl,
      github_error: githubErr,
      discord_channel_id: discordId,
      discord_guild_id: discordGuild || null,
      discord_error: discordErr,
      github_collaborators_added: githubAdded,
      discord_members_added: discordAdded,
      status,
    }),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
