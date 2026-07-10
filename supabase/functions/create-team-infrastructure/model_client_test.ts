import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFireworksAI } from "./model_client.ts";

Deno.test("callFireworksAI throws if api key is missing", async () => {
  const originalGet = Deno.env.get;
  Deno.env.get = (key: string) => {
    if (key === "FIREWORKS_API_KEY") return undefined;
    return originalGet(key);
  };

  try {
    await assertRejects(
      () => callFireworksAI("Test bio"),
      Error,
      "Missing FIREWORKS_API_KEY"
    );
  } finally {
    Deno.env.get = originalGet;
  }
});

Deno.test("callFireworksAI handles successful response", async () => {
  const originalGet = Deno.env.get;
  Deno.env.get = (key: string) => {
    if (key === "FIREWORKS_API_KEY") return "fake-key";
    return originalGet(key);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: string | Request | URL, init?: RequestInit) => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '["python", "react"]',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  };

  try {
    const result = await callFireworksAI("Test bio");
    assertEquals(result, '["python", "react"]');
  } finally {
    Deno.env.get = originalGet;
    globalThis.fetch = originalFetch;
  }
});

Deno.test("callFireworksAI handles network error responses", async () => {
  const originalGet = Deno.env.get;
  Deno.env.get = (key: string) => {
    if (key === "FIREWORKS_API_KEY") return "fake-key";
    return originalGet(key);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: string | Request | URL, init?: RequestInit) => {
    return Promise.resolve(
      new Response("Internal Server Error", {
        status: 500,
      })
    );
  };

  try {
    await assertRejects(
      () => callFireworksAI("Test bio"),
      Error,
      "Fireworks API communication collapsed"
    );
  } finally {
    Deno.env.get = originalGet;
    globalThis.fetch = originalFetch;
  }
});
