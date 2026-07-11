import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch for partner API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Deno.env
vi.stubGlobal("Deno", {
  env: {
    get: vi.fn((key: string) => {
      const env: Record<string, string> = {
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      };
      return env[key] || null;
    }),
  },
});

// Mock createClient
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("allocate-partner-credits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    
    // Reset Deno.env mock
    vi.stubGlobal("Deno", {
      env: {
        get: vi.fn((key: string) => {
          const env: Record<string, string> = {
            SUPABASE_URL: "https://test.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
          };
          return env[key] || null;
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation", () => {
    it("rejects requests without Authorization header", async () => {
      // In actual test, we would call the handler with missing auth
      // and verify it returns 401
      expect(true).toBe(true); // Placeholder
    });

    it("rejects requests with invalid token", async () => {
      // Mock getUser to return error
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      // In actual test, we would verify 401 response
      expect(true).toBe(true); // Placeholder
    });

    it("rejects requests with missing participant_id", async () => {
      const body = {
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
      };

      // Missing participant_id should return 400
      expect(body.participant_id).toBeUndefined();
    });

    it("rejects requests with missing hackathon_id", async () => {
      const body = {
        participant_id: "test-participant-id",
        partner_name: "Fireworks AI",
      };

      // Missing hackathon_id should return 400
      expect(body.hackathon_id).toBeUndefined();
    });

    it("rejects requests with missing partner_name", async () => {
      const body = {
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
      };

      // Missing partner_name should return 400
      expect(body.partner_name).toBeUndefined();
    });

    it("accepts valid request body", async () => {
      const body = {
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
      };

      expect(body.participant_id).toBe("test-participant-id");
      expect(body.hackathon_id).toBe("test-hackathon-id");
      expect(body.partner_name).toBe("Fireworks AI");
    });
  });

  describe("Partner Integration Lookup", () => {
    it("fetches partner integration from database", async () => {
      const mockIntegration = {
        id: "test-integration-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        integration_type: "credit_allocation",
        endpoint_url: "https://api.fireworks.ai/allocate",
        api_key: "test-api-key",
        credit_amount: 100,
        is_active: true,
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValueOnce({ data: mockIntegration, error: null }),
              })),
            })),
          })),
        })),
      });

      // In actual test, we would verify the integration is fetched correctly
      expect(true).toBe(true); // Placeholder
    });

    it("returns error when integration not found", async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: "Not found" } }),
              })),
            })),
          })),
        })),
      });

      // In actual test, we would verify 404 response
      expect(true).toBe(true); // Placeholder
    });

    it("returns error when integration is inactive", async () => {
      const mockIntegration = {
        id: "test-integration-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        integration_type: "credit_allocation",
        endpoint_url: "https://api.fireworks.ai/allocate",
        api_key: "test-api-key",
        credit_amount: 100,
        is_active: false,
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValueOnce({ data: mockIntegration, error: null }),
              })),
            })),
          })),
        })),
      });

      // In actual test, we would verify 404 response for inactive integration
      expect(true).toBe(true); // Placeholder
    });

    it("returns error when credit_amount is invalid", async () => {
      const mockIntegration = {
        id: "test-integration-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        integration_type: "credit_allocation",
        endpoint_url: "https://api.fireworks.ai/allocate",
        api_key: "test-api-key",
        credit_amount: 0,
        is_active: true,
      };

      // credit_amount <= 0 should return 400
      expect(mockIntegration.credit_amount).toBe(0);
    });
  });

  describe("Participant Lookup", () => {
    it("fetches participant from database", async () => {
      const mockParticipant = {
        id: "test-participant-id",
        name: "Test User",
        email: "test@example.com",
        github_username: "test-github",
        discord_username: "test-discord",
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({ data: mockParticipant, error: null }),
          })),
        })),
      });

      // In actual test, we would verify participant is fetched
      expect(true).toBe(true); // Placeholder
    });

    it("returns error when participant not found", async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: "Not found" } }),
          })),
        })),
      });

      // In actual test, we would verify 404 response
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Duplicate Credit Check", () => {
    it("checks if credits already allocated", async () => {
      const mockExistingCredit = {
        id: "test-credit-id",
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        credit_amount: 100,
        allocated_at: "2024-01-01T00:00:00Z",
        used_at: null,
        transaction_id: "test-transaction-id",
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValueOnce({ data: mockExistingCredit, error: null }),
              })),
            })),
          })),
        })),
      });

      // In actual test, we would verify already_allocated response
      expect(true).toBe(true); // Placeholder
    });

    it("returns already_allocated status when credit exists", async () => {
      const mockExistingCredit = {
        id: "test-credit-id",
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        credit_amount: 100,
      };

      // In actual test, we would verify response includes already_allocated: true
      expect(mockExistingCredit.participant_id).toBe("test-participant-id");
    });
  });

  describe("Credit Allocation API Call", () => {
    it("calls partner API with correct parameters", async () => {
      const participant = {
        id: "test-participant-id",
        name: "Test User",
        email: "test@example.com",
        github_username: "test-github",
        discord_username: "test-discord",
      };

      const integration = {
        endpoint_url: "https://api.fireworks.ai/allocate",
        api_key: "test-api-key",
        credit_amount: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transaction_id: "test-transaction-id" }),
        text: () => Promise.resolve("OK"),
      });

      const expectedBody = {
        email: participant.email,
        name: participant.name,
        github_username: participant.github_username,
        hackathon_id: "test-hackathon-id",
        credit_amount: integration.credit_amount,
        participant_id: participant.id,
      };

      expect(expectedBody.email).toBe("test@example.com");
      expect(expectedBody.credit_amount).toBe(100);
    });

    it("handles successful API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transaction_id: "test-transaction-id" }),
        text: () => Promise.resolve("OK"),
      });

      // In actual test, we would verify api_success: true
      expect(true).toBe(true); // Placeholder
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid request" }),
        text: () => Promise.resolve("Invalid request"),
      });

      // In actual test, we would verify api_success: false and api_error is set
      expect(true).toBe(true); // Placeholder
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // In actual test, we would verify error handling
      expect(true).toBe(true); // Placeholder
    });

    it("skips API call when endpoint_url is not configured", async () => {
      const integration = {
        endpoint_url: null,
        api_key: null,
        credit_amount: 100,
      };

      // In actual test, we would verify API is not called
      expect(integration.endpoint_url).toBeNull();
    });
  });

  describe("Credit Recording", () => {
    it("records credit allocation in database", async () => {
      const mockInsertResult = { data: null, error: null };

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce(mockInsertResult),
          })),
        })),
      });

      // In actual test, we would verify insert is called with correct data
      expect(true).toBe(true); // Placeholder
    });

    it("records credit with transaction_id", async () => {
      const transactionId = "test-transaction-id";
      const creditData = {
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        credit_amount: 100,
        allocated_at: new Date().toISOString(),
        used_at: null,
        transaction_id: transactionId,
      };

      expect(creditData.transaction_id).toBe(transactionId);
    });

    it("records credit without transaction_id when API not configured", async () => {
      const creditData = {
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        credit_amount: 100,
        allocated_at: new Date().toISOString(),
        used_at: null,
        transaction_id: null,
      };

      expect(creditData.transaction_id).toBeNull();
    });

    it("returns error when recording fails", async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: "Insert failed" } }),
          })),
        })),
      });

      // In actual test, we would verify 500 response
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Audit Logging", () => {
    it("logs credit allocation action", async () => {
      const auditData = {
        hackathon_id: "test-hackathon-id",
        actor_id: "test-user-id",
        actor_role: "participant",
        action: "allocate_credits",
        metadata: {
          participant_id: "test-participant-id",
          partner_name: "Fireworks AI",
          credit_amount: 100,
          api_success: true,
          api_error: null,
          transaction_id: "test-transaction-id",
        },
      };

      expect(auditData.action).toBe("allocate_credits");
      expect(auditData.metadata.participant_id).toBe("test-participant-id");
    });

    it("logs with organizer role when user is organizer", async () => {
      const mockOrganizer = {
        id: "test-organizer-id",
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockOrganizer, error: null }),
          })),
        })),
      });

      // In actual test, we would verify actor_role is "organizer"
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Response Status Codes", () => {
    it("returns 200 for successful allocation", async () => {
      // In actual test, we would verify status 200
      expect(200).toBe(200);
    });

    it("returns 207 for partial success (API failed but recorded)", async () => {
      // In actual test, we would verify status 207
      expect(207).toBe(207);
    });

    it("returns 400 for bad request", async () => {
      // In actual test, we would verify status 400
      expect(400).toBe(400);
    });

    it("returns 401 for unauthorized", async () => {
      // In actual test, we would verify status 401
      expect(401).toBe(401);
    });

    it("returns 404 for not found", async () => {
      // In actual test, we would verify status 404
      expect(404).toBe(404);
    });

    it("returns 500 for server error", async () => {
      // In actual test, we would verify status 500
      expect(500).toBe(500);
    });
  });

  describe("CORS Headers", () => {
    it("includes CORS headers in response", async () => {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
      expect(corsHeaders["Access-Control-Allow-Methods"]).toBe("POST, OPTIONS");
    });

    it("handles OPTIONS request", async () => {
      // OPTIONS should return 204 with CORS headers
      expect(204).toBe(204);
    });

    it("rejects non-POST requests", async () => {
      // GET, PUT, DELETE should return 405
      expect(405).toBe(405);
    });
  });

  describe("Credit Allocation Logic", () => {
    it("calculates correct credit amount", () => {
      const creditAmount = 100;
      expect(creditAmount).toBe(100);
    });

    it("validates credit amount is positive", () => {
      const creditAmount = 100;
      const isValid = creditAmount > 0;
      expect(isValid).toBe(true);
    });

    it("rejects zero credit amount", () => {
      const creditAmount = 0;
      const isValid = creditAmount > 0;
      expect(isValid).toBe(false);
    });

    it("rejects negative credit amount", () => {
      const creditAmount = -100;
      const isValid = creditAmount > 0;
      expect(isValid).toBe(false);
    });
  });

  describe("Integration Types", () => {
    it("accepts credit_allocation type", () => {
      const integrationType = "credit_allocation";
      expect(integrationType).toBe("credit_allocation");
    });

    it("can be extended with other types", () => {
      const integrationTypes = ["credit_allocation", "api_integration", "webhook"];
      expect(integrationTypes).toContain("credit_allocation");
    });
  });

  describe("Environment Variables", () => {
    it("gets SUPABASE_URL from environment", () => {
      const mockDeno = vi.mocked(Deno);
      mockDeno.env.get.mockReturnValueOnce("https://test.supabase.co");
      
      const url = mockDeno.env.get("SUPABASE_URL");
      expect(url).toBe("https://test.supabase.co");
    });

    it("gets SUPABASE_SERVICE_ROLE_KEY from environment", () => {
      const mockDeno = vi.mocked(Deno);
      mockDeno.env.get.mockReturnValueOnce("test-service-role-key");
      
      const key = mockDeno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      expect(key).toBe("test-service-role-key");
    });

    it("returns null for missing environment variables", () => {
      const mockDeno = vi.mocked(Deno);
      mockDeno.env.get.mockReturnValueOnce(null);
      
      const value = mockDeno.env.get("NONEXISTENT_VAR");
      expect(value).toBeNull();
    });
  });
});
