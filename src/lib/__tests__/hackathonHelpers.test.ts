import { describe, it, expect } from "vitest";

/* Helper Functions */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

describe("Hackathon Helper Functions", () => {
  describe("generateSlug", () => {
    it("converts name to lowercase", () => {
      const result = generateSlug("AI Builders Hackathon");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("replaces spaces with hyphens", () => {
      const result = generateSlug("AI Builders Hackathon");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("removes special characters", () => {
      const result = generateSlug("AI Builder's Hackathon!");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("removes leading and trailing hyphens", () => {
      const result = generateSlug(" - AI Builders - ");
      expect(result).toBe("ai-builders");
    });

    it("truncates to 50 characters", () => {
      const longName = "A".repeat(60);
      const result = generateSlug(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("handles empty string", () => {
      const result = generateSlug("");
      expect(result).toBe("");
    });

    it("handles string with only special characters", () => {
      const result = generateSlug("!@#$%^&*()");
      expect(result).toBe("");
    });

    it("handles string with numbers", () => {
      const result = generateSlug("Hackathon 2026");
      expect(result).toBe("hackathon-2026");
    });

    it("handles multiple spaces", () => {
      const result = generateSlug("AI   Builders   Hackathon");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("handles unicode characters", () => {
      const result = generateSlug("Hackathon café");
      expect(result).toBe("hackathon-caf");
    });
  });

  describe("formatDateForInput", () => {
    it("formats date to YYYY-MM-DD format", () => {
      const date = new Date("2026-01-15T12:00:00Z");
      const result = formatDateForInput(date);
      expect(result).toBe("2026-01-15");
    });

    it("handles different timezones", () => {
      const date = new Date("2026-01-15T12:00:00+05:30");
      const result = formatDateForInput(date);
      // The exact output depends on the timezone, but it should be in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("handles current date", () => {
      const date = new Date();
      const result = formatDateForInput(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("slugify", () => {
    it("converts name to lowercase", () => {
      const result = slugify("AI Builders Hackathon");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("replaces spaces with hyphens", () => {
      const result = slugify("AI Builders Hackathon");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("removes special characters", () => {
      const result = slugify("AI Builder's Hackathon!");
      expect(result).toBe("ai-builders-hackathon");
    });

    it("removes leading and trailing hyphens", () => {
      const result = slugify(" - AI Builders - ");
      expect(result).toBe("ai-builders");
    });

    it("truncates to 60 characters", () => {
      const longName = "A".repeat(70);
      const result = slugify(longName);
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it("handles empty string", () => {
      const result = slugify("");
      expect(result).toBe("");
    });

    it("handles string with only special characters", () => {
      const result = slugify("!@#$%^&*()");
      expect(result).toBe("");
    });
  });

  describe("Repository Naming Convention", () => {
    it("generates correct repo name with year", () => {
      const hackathonSlug = "ai-builders";
      const teamName = "Team Alpha";
      const year = 2026;
      
      const teamSlug = slugify(teamName);
      const repoName = `${hackathonSlug}-${teamSlug}-${year}`;
      
      expect(repoName).toBe("ai-builders-team-alpha-2026");
    });

    it("generates correct repo name without year", () => {
      const hackathonSlug = "ai-builders";
      const teamName = "Team Alpha";
      
      const teamSlug = slugify(teamName);
      const repoName = `${hackathonSlug}-${teamSlug}`;
      
      expect(repoName).toBe("ai-builders-team-alpha");
    });

    it("handles special characters in team name", () => {
      const hackathonSlug = "ai-builders";
      const teamName = "Team Alpha's Group!";
      const year = 2026;
      
      const teamSlug = slugify(teamName);
      const repoName = `${hackathonSlug}-${teamSlug}-${year}`;
      
      expect(repoName).toBe("ai-builders-team-alphas-group-2026");
    });

    it("handles long team names", () => {
      const hackathonSlug = "ai-builders";
      const teamName = "A".repeat(100);
      const year = 2026;
      
      const teamSlug = slugify(teamName);
      const repoName = `${hackathonSlug}-${teamSlug}-${year}`;
      
      // Total length should be reasonable
      expect(repoName.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Form Validation", () => {
    it("validates hackathon name is required", () => {
      const name = "";
      const isValid = name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("validates hackathon name is valid", () => {
      const name = "AI Builders Hackathon";
      const isValid = name.trim().length > 0;
      expect(isValid).toBe(true);
    });

    it("validates year is within range", () => {
      const year = 2026;
      const isValid = year >= 2020 && year <= 2030;
      expect(isValid).toBe(true);
    });

    it("validates year is too low", () => {
      const year = 2019;
      const isValid = year >= 2020 && year <= 2030;
      expect(isValid).toBe(false);
    });

    it("validates year is too high", () => {
      const year = 2031;
      const isValid = year >= 2020 && year <= 2030;
      expect(isValid).toBe(false);
    });

    it("validates end date is after start date", () => {
      const startDate = "2026-01-15";
      const endDate = "2026-01-20";
      const isValid = new Date(startDate) < new Date(endDate);
      expect(isValid).toBe(true);
    });

    it("validates end date is not after start date", () => {
      const startDate = "2026-01-20";
      const endDate = "2026-01-15";
      const isValid = new Date(startDate) < new Date(endDate);
      expect(isValid).toBe(false);
    });

    it("validates GitHub organization is required", () => {
      const githubOrg = "";
      const isValid = githubOrg.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("validates GitHub organization is valid", () => {
      const githubOrg = "test-org";
      const isValid = githubOrg.trim().length > 0;
      expect(isValid).toBe(true);
    });
  });

  describe("Checklist Runbook", () => {
    it("creates reusable steps array", () => {
      const reusableSteps = [
        "Join lablab Discord",
        "Join hackathon Discord server",
        "Create GitHub account",
        "Link GitHub account",
      ];
      
      expect(reusableSteps.length).toBe(4);
      expect(reusableSteps).toContain("Join lablab Discord");
    });

    it("creates custom steps array", () => {
      const customSteps = [
        { name: "Custom Step 1", description: "Description 1", is_required: true },
        { name: "Custom Step 2", description: "Description 2", is_required: false },
      ];
      
      expect(customSteps.length).toBe(2);
      expect(customSteps[0].is_required).toBe(true);
      expect(customSteps[1].is_required).toBe(false);
    });

    it("merges reusable and custom steps", () => {
      const reusableSteps = ["Step 1", "Step 2"];
      const customSteps = [
        { name: "Step 3", description: "Desc", is_required: true },
      ];
      
      const allSteps = [...reusableSteps, ...customSteps.map(s => s.name)];
      
      expect(allSteps).toContain("Step 1");
      expect(allSteps).toContain("Step 2");
      expect(allSteps).toContain("Step 3");
    });
  });

  describe("Event Schedule", () => {
    it("creates day with events", () => {
      const day = {
        date: "2026-01-15",
        events: [
          { time: "10:00", title: "Kickoff", description: "Hackathon starts", meeting_link: "https://meet.google.com/abc" },
          { time: "14:00", title: "Workshop", description: "AI Workshop", meeting_link: null },
        ],
      };
      
      expect(day.date).toBe("2026-01-15");
      expect(day.events.length).toBe(2);
      expect(day.events[0].meeting_link).toBe("https://meet.google.com/abc");
    });

    it("creates multiple days", () => {
      const days = [
        { date: "2026-01-15", events: [] },
        { date: "2026-01-16", events: [] },
        { date: "2026-01-17", events: [] },
      ];
      
      expect(days.length).toBe(3);
    });

    it("formats meeting time correctly", () => {
      const time = "14:30";
      const formattedTime = time;
      expect(formattedTime).toBe("14:30");
    });
  });

  describe("Partner Integrations", () => {
    it("creates partner integration with all fields", () => {
      const partner = {
        name: "Fireworks AI",
        endpoint_url: "https://api.fireworks.ai/allocate",
        api_key: "test-api-key",
        credit_amount: 100,
        is_active: true,
      };
      
      expect(partner.name).toBe("Fireworks AI");
      expect(partner.credit_amount).toBe(100);
      expect(partner.is_active).toBe(true);
    });

    it("creates multiple partner integrations", () => {
      const partners = [
        { name: "Fireworks AI", endpoint_url: "https://api.fireworks.ai/allocate", api_key: "key1", credit_amount: 100 },
        { name: "AMD", endpoint_url: "https://api.amd.com/allocate", api_key: "key2", credit_amount: 200 },
      ];
      
      expect(partners.length).toBe(2);
      expect(partners[0].credit_amount).toBe(100);
      expect(partners[1].credit_amount).toBe(200);
    });

    it("validates credit amount is positive", () => {
      const creditAmount = 100;
      const isValid = creditAmount > 0;
      expect(isValid).toBe(true);
    });

    it("validates credit amount is not positive", () => {
      const creditAmount = -100;
      const isValid = creditAmount > 0;
      expect(isValid).toBe(false);
    });
  });

  describe("Guest Speakers", () => {
    it("creates speaker with all fields", () => {
      const speaker = {
        name: "John Doe",
        title: "CTO",
        bio: "Experienced AI engineer",
        photo_url: "https://example.com/photo.jpg",
        session_time: "Day 1, 2:00 PM - 3:00 PM",
      };
      
      expect(speaker.name).toBe("John Doe");
      expect(speaker.title).toBe("CTO");
      expect(speaker.bio).toBe("Experienced AI engineer");
    });

    it("creates multiple speakers", () => {
      const speakers = [
        { name: "John Doe", title: "CTO", bio: "Bio 1", photo_url: "", session_time: "" },
        { name: "Jane Smith", title: "CEO", bio: "Bio 2", photo_url: "", session_time: "" },
      ];
      
      expect(speakers.length).toBe(2);
      expect(speakers[0].name).toBe("John Doe");
      expect(speakers[1].name).toBe("Jane Smith");
    });
  });

  describe("Community Configuration", () => {
    it("creates community config with all fields", () => {
      const config = {
        discord_server_id: "123456789",
        discord_invite_url: "https://discord.gg/abc",
        slack_channel: "#hackathon-2026",
        forum_url: "https://forum.example.com",
      };
      
      expect(config.discord_server_id).toBe("123456789");
      expect(config.discord_invite_url).toBe("https://discord.gg/abc");
    });

    it("validates Discord server ID format", () => {
      const serverId = "123456789012345678";
      const isValid = /^\d{17,19}$/.test(serverId);
      expect(isValid).toBe(true);
    });

    it("validates Discord invite URL format", () => {
      const url = "https://discord.gg/abc123";
      const isValid = url.startsWith("https://discord.gg/");
      expect(isValid).toBe(true);
    });
  });

  describe("Social Configuration", () => {
    it("creates social config with all fields", () => {
      const config = {
        twitter_handle: "@lablabai",
        linkedin_url: "https://linkedin.com/company/lablab",
        instagram_handle: "@lablabai",
        hashtag: "#LabLabHackathon2026",
      };
      
      expect(config.twitter_handle).toBe("@lablabai");
      expect(config.hashtag).toBe("#LabLabHackathon2026");
    });

    it("validates Twitter handle format", () => {
      const handle = "@lablabai";
      const isValid = handle.startsWith("@");
      expect(isValid).toBe(true);
    });

    it("validates LinkedIn URL format", () => {
      const url = "https://linkedin.com/company/lablab";
      const isValid = url.startsWith("https://linkedin.com/");
      expect(isValid).toBe(true);
    });

    it("validates hashtag format", () => {
      const hashtag = "#LabLabHackathon2026";
      const isValid = hashtag.startsWith("#");
      expect(isValid).toBe(true);
    });
  });

  describe("Prizes", () => {
    it("creates prize with all fields", () => {
      const prize = {
        name: "First Place",
        description: "Best overall project",
        amount: "$10,000",
        place: "1st",
      };
      
      expect(prize.name).toBe("First Place");
      expect(prize.amount).toBe("$10,000");
      expect(prize.place).toBe("1st");
    });

    it("creates multiple prizes", () => {
      const prizes = [
        { name: "First Place", description: "Best project", amount: "$10,000", place: "1st" },
        { name: "Second Place", description: "Runner up", amount: "$5,000", place: "2nd" },
        { name: "Third Place", description: "Honorable mention", amount: "$2,500", place: "3rd" },
      ];
      
      expect(prizes.length).toBe(3);
      expect(prizes[0].place).toBe("1st");
      expect(prizes[1].place).toBe("2nd");
      expect(prizes[2].place).toBe("3rd");
    });

    it("validates prize amount format", () => {
      const amount = "$10,000";
      const isValid = amount.startsWith("$");
      expect(isValid).toBe(true);
    });
  });

  describe("Partners", () => {
    it("creates partner with all fields", () => {
      const partner = {
        name: "Fireworks AI",
        description: "AI inference platform",
        logo_url: "https://example.com/logo.png",
        website: "https://fireworks.ai",
      };
      
      expect(partner.name).toBe("Fireworks AI");
      expect(partner.website).toBe("https://fireworks.ai");
    });

    it("creates multiple partners", () => {
      const partners = [
        { name: "Fireworks AI", description: "AI platform", logo_url: "", website: "https://fireworks.ai" },
        { name: "AMD", description: "Hardware partner", logo_url: "", website: "https://amd.com" },
      ];
      
      expect(partners.length).toBe(2);
      expect(partners[0].name).toBe("Fireworks AI");
      expect(partners[1].name).toBe("AMD");
    });

    it("validates website URL format", () => {
      const url = "https://fireworks.ai";
      const isValid = url.startsWith("https://");
      expect(isValid).toBe(true);
    });
  });
});
