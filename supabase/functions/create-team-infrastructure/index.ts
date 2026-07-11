import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateInfraRequest {
  team_id: string;
  /** Team lead PAT  used once to create a repo under their account. Never stored. */
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
  year: number | null;
  repo_visibility: "private" | "public" | null;
}

const VIEW_CHANNEL = 0x00000400;
const SEND_MESSAGES = 0x00000800;
const READ_MESSAGE_HISTORY = 0x00010000;
const CONNECT = 0x00100000;
const MANAGE_CHANNELS = 0x00100000;
const MANAGE_ROLES = 0x20000000;

// Member permissions (for regular team members)
const MEMBER_CHANNEL_PERMS =
  VIEW_CHANNEL |
  SEND_MESSAGES |
  READ_MESSAGE_HISTORY |
  CONNECT |
  0x00001000 | // ADD_REACTIONS
  0x00002000 | // SPEAK
  0x00004000 | // STREAM
  0x00008000 | // EMBED_LINKS
  0x00020000 | // ATTACH_FILES
  0x00040000 | // READ_MESSAGE_HISTORY
  0x00080000 | // MENTION_EVERYONE
  0x00200000 | // USE_EXTERNAL_EMOJIS
  0x00400000 | // USE_EXTERNAL_STICKERS
  0x00800000 | // USE_APPLICATION_COMMANDS
  0x01000000 | // REQUEST_TO_SPEAK
  0x02000000;  // MANAGE_MESSAGES

// Admin permissions (for team lead - includes all member perms + admin)
const ADMIN_CHANNEL_PERMS =
  MEMBER_CHANNEL_PERMS |
  MANAGE_CHANNELS |
  MANAGE_ROLES;

/* Rate limiter */

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

/* Helpers */

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
  hackathonYear: number | null,
  githubOrg: string | null,
  pat: string,
  templateOwner: string,
  templateRepo: string,
  repoVisibility: "private" | "public" | null,
  underTeamLeadAccount = false
): Promise<{ url: string | null; error: string | null }> {
  // Use the new naming convention: <hackathon-slug>-<team-name>-<year>
  const teamSlug = slugify(teamName);
  const yearSuffix = hackathonYear ? `-${hackathonYear}` : "";
  const repoName = `${hackathonSlug}-${teamSlug}${yearSuffix}`;

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

  // Use the hackathon's repo_visibility setting, default to private
  const isPrivate = repoVisibility === "private" || repoVisibility === null;

  const body: Record<string, unknown> = useTemplate
    ? {
        owner: templateOwnerForGenerate,
        name: repoName,
        description: `Team ${teamName}  ${hackathonSlug} Hackathon`,
        include_all_branches: false,
        private: isPrivate,
      }
    : {
        name: repoName,
        description: `Team ${teamName}  ${hackathonSlug} Hackathon`,
        private: isPrivate,
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
  repoFullName: string,
  participants: Participant[],
  pat: string
): Promise<{ success: boolean; error: string | null }> {
  const owner = repoFullName.split("/")[0];
  const repo = repoFullName.split("/")[1];

  // Get the team lead's GitHub username from the PAT
  const teamLeadLogin = await getGitHubLogin(pat);
  if (!teamLeadLogin) {
    return { success: false, error: "Could not determine team lead GitHub login" };
  }

  // Filter out the team lead (they already have access via PAT)
  const otherParticipants = participants.filter(
    (p) => p.github_username && p.github_username !== teamLeadLogin
  );

  // Add each participant as a collaborator
  for (const participant of otherParticipants) {
    if (!participant.github_username) continue;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/collaborators/${participant.github_username}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "hackathon-onboarding",
          },
          body: JSON.stringify({ permission: "push" }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text().catch(() => "Unknown error");
        console.warn(
          `Failed to add collaborator ${participant.github_username}: ${response.status} - ${errBody.slice(0, 200)}`
        );
        // Continue with other participants even if one fails
      }
    } catch (err) {
      console.warn(
        `Error adding collaborator ${participant.github_username}: ${err instanceof Error ? err.message : "Unknown"}`
      );
      // Continue with other participants
    }
  }

  return { success: true, error: null };
}

async function createDiscordChannel(
  teamName: string,
  hackathonName: string,
  botToken: string,
  guildId: string,
  participantNames: string[],
  participantDiscordUsernames: string[]
): Promise<{ channelId: string | null; error: string | null }> {
  const channelName = `team-${slugify(teamName)}`;
  const topic =
    `Team ${teamName}  ${hackathonName}\nMembers: ${participantNames.join(", ")}`;

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
    const channelId = data.id as string;

    // Add participants to the channel by their Discord usernames
    for (const discordUsername of participantDiscordUsernames) {
      if (!discordUsername) continue;
      
      // Get guild members to find the user ID from username
      const membersResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(normalizeDiscordQuery(discordUsername))}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bot ${botToken}`,
            "User-Agent": "hackathon-onboarding",
          },
        }
      );

      if (membersResponse.ok) {
        const members = await membersResponse.json();
        if (members && members.length > 0) {
          const member = members[0];
          const userId = member.user?.id;
          
          if (userId) {
            // Add permission overwrite for the user in the channel
            await fetch(
              `https://discord.com/api/v10/channels/${channelId}/permissions/${userId}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bot ${botToken}`,
                  "Content-Type": "application/json",
                  "User-Agent": "hackathon-onboarding",
                },
                body: JSON.stringify({
                  allow: MEMBER_CHANNEL_PERMS,
                  type: 1,
                }),
              }
            );
          }
        }
      }
    }

    return { channelId, error: null };
  } catch (err) {
    return {
      channelId: null,
      error: `Discord request failed: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

/* Handler */

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

  /* Auth */

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

  /* Parse body */

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

  /* Fetch team */

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

  if (t.is_approved) {
    return new Response(
      JSON.stringify({
        error: "Already approved",
        status: "already_approved",
        github_repo_url: t.github_repo_url,
        discord_channel_id: t.discord_channel_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  /* Fetch participants */

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

  // Verify all participants completed all required steps
  // Now we check for dynamic steps from the hackathon
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

  // Get the checklist items for this hackathon
  const { data: checklistItems, error: checklistErr } = await sb
    .from("hackathon_checklist_items")
    .select("*")
    .eq("hackathon_id", t.hackathon_id)
    .order("order_index", { ascending: true });

  let requiredSteps: string[] = [];
  if (checklistItems && !checklistErr) {
    // Get all required steps (both reusable and custom)
    requiredSteps = (checklistItems as any[])
      .filter(item => item.is_required)
      .map(item => item.step_name);
  } else {
    // Fallback to default steps
    requiredSteps = ["amd", "fireworks", "natively_ai", "discord", "github"];
  }

  const incomplete = parts.filter((p) => {
    const s = p.steps_completed ?? {};
    return !requiredSteps.every((step) => s[step]);
  });

  if (incomplete.length > 0) {
    return new Response(
      JSON.stringify({
        error: "Not all participants completed all steps",
        status: "incomplete",
        incomplete_participants: incomplete.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  /* Rate limit */

  if (!checkRateLimit(t.hackathon_id)) {
    return new Response(JSON.stringify({ error: "Rate limit (5/min per hackathon)" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Gather env vars */

  const githubPat = body.github_pat || Deno.env.get("GITHUB_PAT");
  const tmplOwner = Deno.env.get("GITHUB_TEMPLATE_OWNER") || "";
  const tmplRepo = Deno.env.get("GITHUB_TEMPLATE_REPO") || "";
  const discordToken = Deno.env.get("DISCORD_BOT_TOKEN");
  const discordGuild = Deno.env.get("DISCORD_GUILD_ID");

  let githubUrl: string | null = null;
  let githubErr: string | null = null;
  let discordId: string | null = null;
  let discordErr: string | null = null;

  /* Create GitHub repo */

  if (githubPat) {
    const result = await createGitHubRepo(
      t.name,
      h.slug,
      h.year,
      h.github_org || null,
      githubPat,
      tmplOwner,
      tmplRepo,
      h.repo_visibility,
      false // underTeamLeadAccount
    );
    githubUrl = result.url;
    githubErr = result.error;

    // If repo was created successfully and we have participants with GitHub usernames, add them as collaborators
    if (githubUrl && parts.some(p => p.github_username)) {
      const parsed = parseRepoFromUrl(githubUrl);
      if (parsed) {
        const repoFullName = `${parsed.owner}/${parsed.repo}`;
        const collabResult = await addGitHubCollaborators(repoFullName, parts, githubPat);
        if (!collabResult.success) {
          console.warn("Failed to add some collaborators:", collabResult.error);
          // Don't fail the whole operation if collaborator addition fails
        }
      }
    }
  } else {
    githubErr = "GITHUB_PAT not configured";
  }

  /* Create Discord channel */

  if (discordToken && discordGuild) {
    const result = await createDiscordChannel(
      t.name,
      h.name,
      discordToken,
      discordGuild,
      parts.map((p) => p.name),
      parts.map((p) => p.discord_username || "")
    );
    discordId = result.channelId;
    discordErr = result.error;
  } else {
    discordErr = !discordToken ? "DISCORD_BOT_TOKEN not configured" : "DISCORD_GUILD_ID not configured";
  }

  /* Update team record */

  const updates: Record<string, unknown> = {};
  if (githubUrl) updates.github_repo_url = githubUrl;
  if (discordId) updates.discord_channel_id = discordId;

  const bothOk = githubUrl && discordId;
  const partial = (githubUrl || discordId) && !bothOk;

  if (bothOk) updates.is_approved = true;

  if (Object.keys(updates).length > 0) {
    await sb.from("teams").update(updates).eq("id", body.team_id);
  }

  /* Audit log */

  // Determine actor role: check if the caller is an organizer
  let actorRole = "participant";
  const { data: orgCheck } = await sb
    .from("organizers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (orgCheck) actorRole = "organizer";

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
      status: bothOk ? "complete" : partial ? "partial" : "failed",
    },
  });

  /* Response */

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
      status: bothOk ? "complete" : partial ? "partial" : "failed",
    }),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
