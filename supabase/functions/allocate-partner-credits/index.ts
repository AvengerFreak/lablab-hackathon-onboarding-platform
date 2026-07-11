import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AllocateCreditsRequest {
  participant_id: string;
  hackathon_id: string;
  partner_name: string;
}

interface PartnerIntegration {
  id: string;
  hackathon_id: string;
  partner_name: string;
  integration_type: string;
  endpoint_url: string | null;
  api_key: string | null;
  credit_amount: number | null;
  is_active: boolean;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  github_username: string | null;
  discord_username: string | null;
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

  let body: AllocateCreditsRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.participant_id || !body.hackathon_id || !body.partner_name) {
    return new Response(JSON.stringify({ error: "Missing required fields: participant_id, hackathon_id, partner_name" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Fetch partner integration */

  const { data: integration, error: integrationError } = await sb
    .from("partner_integrations")
    .select("*")
    .eq("hackathon_id", body.hackathon_id)
    .eq("partner_name", body.partner_name)
    .eq("is_active", true)
    .single();

  if (integrationError || !integration) {
    return new Response(JSON.stringify({ error: "Partner integration not found or inactive" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pi = integration as unknown as PartnerIntegration;

  if (!pi.credit_amount || pi.credit_amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid credit amount configured" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Fetch participant */

  const { data: participant, error: participantError } = await sb
    .from("participants")
    .select("*")
    .eq("id", body.participant_id)
    .single();

  if (participantError || !participant) {
    return new Response(JSON.stringify({ error: "Participant not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const p = participant as unknown as Participant;

  /* Check if credits already allocated */

  const { data: existingCredit, error: existingError } = await sb
    .from("participant_credits")
    .select("*")
    .eq("participant_id", body.participant_id)
    .eq("hackathon_id", body.hackathon_id)
    .eq("partner_name", body.partner_name)
    .single();

  if (existingCredit && !existingError) {
    return new Response(JSON.stringify({
      error: "Credits already allocated",
      already_allocated: true,
      credit_id: existingCredit.id,
      amount: existingCredit.credit_amount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* Allocate credits via API if endpoint is configured */

  let apiSuccess = true;
  let apiError: string | null = null;
  let transactionId: string | null = null;

  if (pi.endpoint_url && pi.api_key) {
    try {
      // Call the partner's API to allocate credits
      const response = await fetch(pi.endpoint_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pi.api_key}`,
          "User-Agent": "hackathon-onboarding",
        },
        body: JSON.stringify({
          email: p.email,
          name: p.name,
          github_username: p.github_username,
          hackathon_id: body.hackathon_id,
          credit_amount: pi.credit_amount,
          participant_id: body.participant_id,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "Unknown error");
        apiSuccess = false;
        apiError = `Partner API (${response.status}): ${errBody.slice(0, 300)}`;
      } else {
        const apiData = await response.json();
        transactionId = apiData.transaction_id || apiData.id || null;
      }
    } catch (err) {
      apiSuccess = false;
      apiError = `Partner API request failed: ${err instanceof Error ? err.message : "Unknown"}`;
    }
  }

  /* Record the credit allocation */

  const { error: recordError } = await sb.from("participant_credits").insert({
    participant_id: body.participant_id,
    hackathon_id: body.hackathon_id,
    partner_name: body.partner_name,
    credit_amount: pi.credit_amount,
    allocated_at: new Date().toISOString(),
    used_at: null,
    transaction_id: transactionId,
  });

  if (recordError) {
    return new Response(JSON.stringify({ error: `Failed to record credit allocation: ${recordError.message}` }), {
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
    hackathon_id: body.hackathon_id,
    actor_id: user.id,
    actor_role: actorRole,
    action: "allocate_credits",
    metadata: {
      participant_id: body.participant_id,
      partner_name: body.partner_name,
      credit_amount: pi.credit_amount,
      api_success: apiSuccess,
      api_error: apiError,
      transaction_id: transactionId,
    },
  });

  /* Response */

  return new Response(
    JSON.stringify({
      success: true,
      participant_id: body.participant_id,
      partner_name: body.partner_name,
      credit_amount: pi.credit_amount,
      api_success: apiSuccess,
      api_error: apiError,
      transaction_id: transactionId,
      message: apiSuccess 
        ? "Credits allocated successfully"
        : "Credits recorded but API call failed",
    }),
    { status: apiSuccess ? 200 : 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
