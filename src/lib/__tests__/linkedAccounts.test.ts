import { describe, it, expect } from "vitest";
import {
  getLinkedAccountUsernames,
  hasLinkedAccounts,
  hasLinkedGitHub,
  hasLinkedDiscord,
  needsDiscordLink,
  needsBothAccountsLink,
} from "../linkedAccounts";
import type { User } from "@supabase/supabase-js";

// Helper to create a mock user
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "test-user-id",
    aud: "test-aud",
    email: "test@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
    phone: "",
    confirmed_at: "2024-01-01T00:00:00Z",
    last_sign_in_at: "2024-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: null,
    identities: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

describe("linkedAccounts", () => {
  describe("getLinkedAccountUsernames", () => {
    it("returns null usernames when no metadata exists", () => {
      const user = createMockUser();
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBeNull();
      expect(result.discordUsername).toBeNull();
    });

    it("extracts github_username from user_metadata", () => {
      const user = createMockUser({
        user_metadata: { github_username: "github-user" },
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBe("github-user");
      expect(result.discordUsername).toBeNull();
    });

    it("extracts discord_username from user_metadata", () => {
      const user = createMockUser({
        user_metadata: { discord_username: "discord-user" },
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBeNull();
      expect(result.discordUsername).toBe("discord-user");
    });

    it("extracts both usernames from user_metadata", () => {
      const user = createMockUser({
        user_metadata: {
          github_username: "github-user",
          discord_username: "discord-user",
        },
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBe("github-user");
      expect(result.discordUsername).toBe("discord-user");
    });

    it("trims whitespace from usernames", () => {
      const user = createMockUser({
        user_metadata: {
          github_username: "  github-user  ",
          discord_username: "  discord-user  ",
        },
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBe("github-user");
      expect(result.discordUsername).toBe("discord-user");
    });

    it("extracts github username from OAuth identity", () => {
      const user = createMockUser({
        user_metadata: {},
        identities: [
          {
            provider: "github",
            identity_data: {
              user_name: "github-oauth-user",
            },
          } as never,
        ],
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBe("github-oauth-user");
    });

    it("prefers user_metadata over OAuth identity", () => {
      const user = createMockUser({
        user_metadata: { github_username: "metadata-user" },
        identities: [
          {
            provider: "github",
            identity_data: {
              user_name: "oauth-user",
            },
          } as never,
        ],
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBe("metadata-user");
    });

    it("handles legacy nested metadata", () => {
      const user = createMockUser({
        user_metadata: {
          user_metadata: {
            github_username: "nested-github",
            discord_username: "nested-discord",
          },
        },
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBe("nested-github");
      expect(result.discordUsername).toBe("nested-discord");
    });

    it("returns empty string as null", () => {
      const user = createMockUser({
        user_metadata: {
          github_username: "",
          discord_username: "",
        },
      });
      const result = getLinkedAccountUsernames(user);
      expect(result.githubUsername).toBeNull();
      expect(result.discordUsername).toBeNull();
    });
  });

  describe("hasLinkedAccounts", () => {
    it("returns true when both accounts are linked", () => {
      const user = createMockUser({
        user_metadata: {
          github_username: "github-user",
          discord_username: "discord-user",
        },
      });
      expect(hasLinkedAccounts(user)).toBe(true);
    });

    it("returns false when only github is linked", () => {
      const user = createMockUser({
        user_metadata: { github_username: "github-user" },
      });
      expect(hasLinkedAccounts(user)).toBe(false);
    });

    it("returns false when only discord is linked", () => {
      const user = createMockUser({
        user_metadata: { discord_username: "discord-user" },
      });
      expect(hasLinkedAccounts(user)).toBe(false);
    });

    it("returns false when no accounts are linked", () => {
      const user = createMockUser();
      expect(hasLinkedAccounts(user)).toBe(false);
    });
  });

  describe("hasLinkedGitHub", () => {
    it("returns true when github is linked via metadata", () => {
      const user = createMockUser({
        user_metadata: { github_username: "github-user" },
      });
      expect(hasLinkedGitHub(user)).toBe(true);
    });

    it("returns true when github is linked via OAuth", () => {
      const user = createMockUser({
        user_metadata: {},
        identities: [
          {
            provider: "github",
            identity_data: { user_name: "github-user" },
          } as never,
        ],
      });
      expect(hasLinkedGitHub(user)).toBe(true);
    });

    it("returns false when github is not linked", () => {
      const user = createMockUser({
        user_metadata: { discord_username: "discord-user" },
      });
      expect(hasLinkedGitHub(user)).toBe(false);
    });
  });

  describe("hasLinkedDiscord", () => {
    it("returns true when discord is linked", () => {
      const user = createMockUser({
        user_metadata: { discord_username: "discord-user" },
      });
      expect(hasLinkedDiscord(user)).toBe(true);
    });

    it("returns false when discord is not linked", () => {
      const user = createMockUser({
        user_metadata: { github_username: "github-user" },
      });
      expect(hasLinkedDiscord(user)).toBe(false);
    });
  });

  describe("needsDiscordLink", () => {
    it("returns true when github is linked but discord is not", () => {
      const user = createMockUser({
        user_metadata: { github_username: "github-user" },
      });
      expect(needsDiscordLink(user)).toBe(true);
    });

    it("returns false when both are linked", () => {
      const user = createMockUser({
        user_metadata: {
          github_username: "github-user",
          discord_username: "discord-user",
        },
      });
      expect(needsDiscordLink(user)).toBe(false);
    });

    it("returns false when neither is linked", () => {
      const user = createMockUser();
      expect(needsDiscordLink(user)).toBe(false);
    });

    it("returns false when only discord is linked", () => {
      const user = createMockUser({
        user_metadata: { discord_username: "discord-user" },
      });
      expect(needsDiscordLink(user)).toBe(false);
    });
  });

  describe("needsBothAccountsLink", () => {
    it("returns true when neither account is linked", () => {
      const user = createMockUser();
      expect(needsBothAccountsLink(user)).toBe(true);
    });

    it("returns false when both are linked", () => {
      const user = createMockUser({
        user_metadata: {
          github_username: "github-user",
          discord_username: "discord-user",
        },
      });
      expect(needsBothAccountsLink(user)).toBe(false);
    });

    it("returns false when only github is linked", () => {
      const user = createMockUser({
        user_metadata: { github_username: "github-user" },
      });
      expect(needsBothAccountsLink(user)).toBe(false);
    });

    it("returns false when only discord is linked", () => {
      const user = createMockUser({
        user_metadata: { discord_username: "discord-user" },
      });
      expect(needsBothAccountsLink(user)).toBe(false);
    });
  });
});
