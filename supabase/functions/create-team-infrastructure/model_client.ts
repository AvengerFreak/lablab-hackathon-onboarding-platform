import { SKILLS_PARSER_DIRECTIVE } from "./system_directives.ts";

/**
 * Dispatches an unstructured user profile string to the Fireworks AI completion endpoints
 * @param userIntroduction Raw plain text containing the builder's profile summary
 */
export async function callFireworksAI(userIntroduction: string): Promise<string> {
  // Retrieve the secret API key from the secure environment store
  const fireworksApiKey = Deno.env.get("FIREWORKS_API_KEY");
  
  if (!fireworksApiKey) {
    throw new Error("Missing FIREWORKS_API_KEY inside system environment configuration.");
  }

  const endpointUrl = "https://api.fireworks.ai/inference/v1/chat/completions";

  const requestPayload = {
    model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
    messages: [
      { role: "system", content: SKILLS_PARSER_DIRECTIVE },
      { role: "user", content: `Please parse this user profile text: "${userIntroduction}"` }
    ],
    temperature: 0.1, // Forces low randomness for strict structural predictability
    max_tokens: 150
  };

  const networkResponse = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${fireworksApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });

  if (!networkResponse.ok) {
    const errorBody = await networkResponse.text();
    throw new Error(`Fireworks API communication collapsed with status ${networkResponse.status}: ${errorBody}`);
  }

  const trackingData = await networkResponse.json();
  
  // Isolate and return the raw string response block from the assistant choice layer
  return trackingData.choices[0].message.content || "";
}