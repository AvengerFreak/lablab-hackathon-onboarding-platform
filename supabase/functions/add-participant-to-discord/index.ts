import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AddParticipantRequest {
  team_id: string;
  participant_id?: string;
  discord_username?: string | null;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  discord_username: string | null;
}

interface Team {
  id: string;
  name: string;
  hackathon_id: string;
  discord_channel_id: string | null;
}

interface Hackathon {
  id: string;
  name: string;
  discord_server_id: string | null;
}

const MEMBER_CHANNEL_PERMS =
  0x00000400 | // VIEW_CHANNEL
  0x00000800 | // SEND_MESSAGES
  0x00010000 | // READ_MESSAGE_HISTORY
  0x00100000 | // CONNECT
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
  0x02000000;  // MANAGE_MESSAGES (for team leads)

function normalizeDiscordQuery(username: string): string {
  return username.split("#")[0].trim();
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

  let body: AddParticipantRequest;
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

  if (!t.discord_channel_id) {
    return new Response(JSON.stringify({ error: "Team does not have a Discord channel" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Fetch hackathon */

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
  const discordGuild = h.discord_server_id || Deno.env.get("DISCORD_GUILD_ID");
  const discordToken = Deno.env.get("DISCORD_BOT_TOKEN");

  if (!discordToken) {
    return new Response(JSON.stringify({ error: "DISCORD_BOT_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!discordGuild) {
    return new Response(JSON.stringify({ error: "DISCORD_GUILD_ID not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Get participant info */

  let participant: Participant | null = null;
  
  if (body.participant_id) {
    const { data: partData, error: partErr } = await sb
      .from("participants")
      .select("*")
      .eq("id", body.participant_id)
      .single();
    
    if (!partErr && partData) {
      participant = partData as unknown as Participant;
    }
  }

  // Fallback to using the provided discord_username or fetching from auth user
  let discordUsername = body.discord_username || null;
  
  if (!discordUsername && participant) {
    discordUsername = participant.discord_username;
  }

  if (!discordUsername) {
    // Try to get from auth user metadata
    const { data: authUser } = await sb.auth.getUser(user.id);
    if (authUser.user?.user_metadata) {
      discordUsername = (authUser.user.user_metadata as Record<string, unknown>).discord_username as string | null;
    }
  }

  if (!discordUsername) {
    return new Response(JSON.stringify({ error: "No Discord username provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Add participant to Discord channel */

  const userId = await findDiscordMemberId(discordGuild, discordUsername, discordToken);
  
  if (!userId) {
    return new Response(JSON.stringify({ 
      error: `${discordUsername} not found in Discord server — join the hackathon server first` 
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const err = await grantDiscordChannelAccess(t.discord_channel_id, userId, discordToken);
  
  if (err) {
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Audit log */

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
    action: "add_to_discord_channel",
    metadata: {
      team_id: body.team_id,
      team_name: t.name,
      discord_channel_id: t.discord_channel_id,
      discord_username: discordUsername,
      discord_user_id: userId,
      status: "success",
    },
  });

  /* Response */

  return new Response(
    JSON.stringify({
      team_id: body.team_id,
      team_name: t.name,
      discord_channel_id: t.discord_channel_id,
      discord_username: discordUsername,
      discord_user_id: userId,
      status: "success",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
