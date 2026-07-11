import { describe, it, expect } from "vitest";
import type { Tables, TablesInsert, TablesUpdate } from "../database.types";

describe("Database Types", () => {
  describe("Hackathons Table", () => {
    it("has all required fields for insertion", () => {
      const hackathonData: TablesInsert<"hackathons"> = {
        name: "Test Hackathon",
        slug: "test-hackathon",
        start_date: "2026-01-15",
        end_date: "2026-01-20",
        program: "Test program",
        challenge_description: "Test challenge",
        rules: "Test rules",
        submission_rules: "Test submission rules",
        judging_criteria: "Test judging criteria",
        welcome_message: "Welcome!",
        github_org: "test-org",
        repo_visibility: "private",
        year: 2026,
        checklist_runbook: JSON.stringify({ reusable_steps: [], custom_steps: [] }),
        community_config: JSON.stringify({ discord_server_id: "", discord_invite_url: "", slack_channel: "", forum_url: "" }),
        social_config: JSON.stringify({ twitter_handle: "", linkedin_url: "", instagram_handle: "", hashtag: "" }),
        partners: JSON.stringify([]),
        prizes: JSON.stringify([]),
        event_schedule: JSON.stringify({ days: [] }),
        guest_speakers: JSON.stringify([]),
        credit_allocations: JSON.stringify({ enabled: false, partners: [] }),
      };

      expect(hackathonData.name).toBe("Test Hackathon");
      expect(hackathonData.slug).toBe("test-hackathon");
      expect(hackathonData.year).toBe(2026);
      expect(hackathonData.repo_visibility).toBe("private");
    });

    it("accepts public repo visibility", () => {
      const hackathonData: TablesInsert<"hackathons"> = {
        name: "Test Hackathon",
        slug: "test-hackathon",
        repo_visibility: "public",
        year: 2026,
      };

      expect(hackathonData.repo_visibility).toBe("public");
    });

    it("accepts null for optional fields", () => {
      const hackathonData: TablesInsert<"hackathons"> = {
        name: "Test Hackathon",
        slug: "test-hackathon",
        start_date: null,
        end_date: null,
        program: null,
        challenge_description: null,
        rules: null,
        submission_rules: null,
        judging_criteria: null,
        welcome_message: null,
        github_org: null,
        repo_visibility: null,
        year: null,
        checklist_runbook: null,
        community_config: null,
        social_config: null,
        partners: null,
        prizes: null,
        event_schedule: null,
        guest_speakers: null,
        credit_allocations: null,
      };

      expect(hackathonData.start_date).toBeNull();
      expect(hackathonData.github_org).toBeNull();
    });

    it("has all new fields", () => {
      const hackathon: Tables<"hackathons"> = {
        id: "test-id",
        name: "Test Hackathon",
        slug: "test-hackathon",
        created_at: "2024-01-01T00:00:00Z",
        start_date: "2026-01-15",
        end_date: "2026-01-20",
        discord_server_id: "123456789",
        github_org: "test-org",
        welcome_message: "Welcome!",
        program: "Test program",
        challenge_description: "Test challenge",
        rules: JSON.stringify({ rule1: "test" }),
        submission_rules: JSON.stringify({ rule1: "test" }),
        judging_criteria: JSON.stringify({ criteria1: "test" }),
        checklist_runbook: JSON.stringify({ reusable_steps: ["step1"], custom_steps: [] }),
        community_config: JSON.stringify({ discord_server_id: "123", discord_invite_url: "", slack_channel: "", forum_url: "" }),
        social_config: JSON.stringify({ twitter_handle: "", linkedin_url: "", instagram_handle: "", hashtag: "" }),
        partners: JSON.stringify([{ name: "Partner 1", description: "", logo_url: "", website: "" }]),
        prizes: JSON.stringify([{ name: "Prize 1", description: "", amount: "", place: "" }]),
        event_schedule: JSON.stringify({ days: [{ date: "2026-01-15", events: [] }] }),
        guest_speakers: JSON.stringify([{ name: "Speaker 1", title: "", bio: "", photo_url: "", session_time: "" }]),
        year: 2026,
        repo_visibility: "private",
        credit_allocations: JSON.stringify({ enabled: false, partners: [] }),
      };

      expect(hackathon.program).toBe("Test program");
      expect(hackathon.challenge_description).toBe("Test challenge");
      expect(hackathon.year).toBe(2026);
      expect(hackathon.repo_visibility).toBe("private");
    });
  });

  describe("Hackathon Checklist Items Table", () => {
    it("has all required fields", () => {
      const checklistItem: TablesInsert<"hackathon_checklist_items"> = {
        hackathon_id: "test-hackathon-id",
        step_name: "Join lablab Discord",
        description: "Join the lablab Discord server",
        is_reusable: true,
        is_required: true,
        order_index: 0,
      };

      expect(checklistItem.hackathon_id).toBe("test-hackathon-id");
      expect(checklistItem.step_name).toBe("Join lablab Discord");
      expect(checklistItem.is_reusable).toBe(true);
      expect(checklistItem.is_required).toBe(true);
      expect(checklistItem.order_index).toBe(0);
    });

    it("accepts custom step", () => {
      const checklistItem: TablesInsert<"hackathon_checklist_items"> = {
        hackathon_id: "test-hackathon-id",
        step_name: "Custom Step",
        description: "Custom step description",
        is_reusable: false,
        is_required: false,
        order_index: 10,
      };

      expect(checklistItem.is_reusable).toBe(false);
      expect(checklistItem.is_required).toBe(false);
    });
  });

  describe("Partner Integrations Table", () => {
    it("has all required fields", () => {
      const integration: TablesInsert<"partner_integrations"> = {
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        integration_type: "credit_allocation",
        endpoint_url: "https://api.fireworks.ai/allocate",
        api_key: "test-api-key",
        credit_amount: 100,
        is_active: true,
      };

      expect(integration.hackathon_id).toBe("test-hackathon-id");
      expect(integration.partner_name).toBe("Fireworks AI");
      expect(integration.integration_type).toBe("credit_allocation");
      expect(integration.credit_amount).toBe(100);
      expect(integration.is_active).toBe(true);
    });

    it("accepts null for optional fields", () => {
      const integration: TablesInsert<"partner_integrations"> = {
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        integration_type: "credit_allocation",
        endpoint_url: null,
        api_key: null,
        credit_amount: null,
        is_active: false,
      };

      expect(integration.endpoint_url).toBeNull();
      expect(integration.api_key).toBeNull();
    });
  });

  describe("Participant Credits Table", () => {
    it("has all required fields", () => {
      const credit: TablesInsert<"participant_credits"> = {
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        credit_amount: 100,
        allocated_at: "2024-01-01T00:00:00Z",
        used_at: null,
        transaction_id: "test-transaction-id",
      };

      expect(credit.participant_id).toBe("test-participant-id");
      expect(credit.hackathon_id).toBe("test-hackathon-id");
      expect(credit.partner_name).toBe("Fireworks AI");
      expect(credit.credit_amount).toBe(100);
      expect(credit.used_at).toBeNull();
    });

    it("accepts null for transaction_id", () => {
      const credit: TablesInsert<"participant_credits"> = {
        participant_id: "test-participant-id",
        hackathon_id: "test-hackathon-id",
        partner_name: "Fireworks AI",
        credit_amount: 100,
        allocated_at: "2024-01-01T00:00:00Z",
        used_at: null,
        transaction_id: null,
      };

      expect(credit.transaction_id).toBeNull();
    });
  });

  describe("Event Meetings Table", () => {
    it("has all required fields", () => {
      const meeting: TablesInsert<"event_meetings"> = {
        hackathon_id: "test-hackathon-id",
        title: "Kickoff Meeting",
        description: "Hackathon kickoff",
        start_time: "2026-01-15T10:00:00",
        end_time: "2026-01-15T11:00:00",
        meeting_link: "https://meet.google.com/abc",
        google_calendar_event_id: "test-event-id",
        is_required: true,
      };

      expect(meeting.hackathon_id).toBe("test-hackathon-id");
      expect(meeting.title).toBe("Kickoff Meeting");
      expect(meeting.start_time).toBe("2026-01-15T10:00:00");
      expect(meeting.meeting_link).toBe("https://meet.google.com/abc");
      expect(meeting.is_required).toBe(true);
    });

    it("accepts null for optional fields", () => {
      const meeting: TablesInsert<"event_meetings"> = {
        hackathon_id: "test-hackathon-id",
        title: "Kickoff Meeting",
        description: null,
        start_time: "2026-01-15T10:00:00",
        end_time: null,
        meeting_link: null,
        google_calendar_event_id: null,
        is_required: false,
      };

      expect(meeting.description).toBeNull();
      expect(meeting.meeting_link).toBeNull();
    });
  });

  describe("Participant Meeting Invites Table", () => {
    it("has all required fields", () => {
      const invite: TablesInsert<"participant_meeting_invites"> = {
        participant_id: "test-participant-id",
        meeting_id: "test-meeting-id",
        google_calendar_invite_sent: true,
        google_calendar_invite_id: "test-invite-id",
      };

      expect(invite.participant_id).toBe("test-participant-id");
      expect(invite.meeting_id).toBe("test-meeting-id");
      expect(invite.google_calendar_invite_sent).toBe(true);
      expect(invite.google_calendar_invite_id).toBe("test-invite-id");
    });

    it("accepts false for google_calendar_invite_sent", () => {
      const invite: TablesInsert<"participant_meeting_invites"> = {
        participant_id: "test-participant-id",
        meeting_id: "test-meeting-id",
        google_calendar_invite_sent: false,
        google_calendar_invite_id: null,
      };

      expect(invite.google_calendar_invite_sent).toBe(false);
      expect(invite.google_calendar_invite_id).toBeNull();
    });
  });

  describe("Organizers Table", () => {
    it("has new Google Calendar fields", () => {
      const organizer: TablesInsert<"organizers"> = {
        email: "organizer@example.com",
        name: "Test Organizer",
        auth_user_id: "test-auth-user-id",
        google_calendar_connected: true,
        google_calendar_token: JSON.stringify({ access_token: "test-token" }),
      };

      expect(organizer.google_calendar_connected).toBe(true);
      expect(organizer.google_calendar_token).toBe(JSON.stringify({ access_token: "test-token" }));
    });

    it("accepts false for google_calendar_connected", () => {
      const organizer: TablesInsert<"organizers"> = {
        email: "organizer@example.com",
        google_calendar_connected: false,
        google_calendar_token: null,
      };

      expect(organizer.google_calendar_connected).toBe(false);
      expect(organizer.google_calendar_token).toBeNull();
    });
  });

  describe("Participants Table", () => {
    it("has new Google Calendar fields", () => {
      const participant: TablesInsert<"participants"> = {
        email: "participant@example.com",
        name: "Test Participant",
        hackathon_id: "test-hackathon-id",
        team_id: null,
        github_username: "test-github",
        discord_username: "test-discord",
        steps_completed: JSON.stringify({}),
        google_calendar_email: "calendar@example.com",
        google_calendar_invite_sent: false,
      };

      expect(participant.google_calendar_email).toBe("calendar@example.com");
      expect(participant.google_calendar_invite_sent).toBe(false);
    });

    it("accepts null for google_calendar_email", () => {
      const participant: TablesInsert<"participants"> = {
        email: "participant@example.com",
        name: "Test Participant",
        hackathon_id: "test-hackathon-id",
        google_calendar_email: null,
        google_calendar_invite_sent: false,
      };

      expect(participant.google_calendar_email).toBeNull();
    });

    it("accepts true for google_calendar_invite_sent", () => {
      const participant: TablesInsert<"participants"> = {
        email: "participant@example.com",
        name: "Test Participant",
        hackathon_id: "test-hackathon-id",
        google_calendar_email: "calendar@example.com",
        google_calendar_invite_sent: true,
      };

      expect(participant.google_calendar_invite_sent).toBe(true);
    });
  });

  describe("Update Types", () => {
    it("allows partial updates for hackathons", () => {
      const update: TablesUpdate<"hackathons"> = {
        name: "Updated Hackathon",
        repo_visibility: "public",
      };

      expect(update.name).toBe("Updated Hackathon");
      expect(update.repo_visibility).toBe("public");
    });

    it("allows partial updates for participants", () => {
      const update: TablesUpdate<"participants"> = {
        google_calendar_email: "updated@example.com",
        google_calendar_invite_sent: true,
      };

      expect(update.google_calendar_email).toBe("updated@example.com");
      expect(update.google_calendar_invite_sent).toBe(true);
    });

    it("allows partial updates for organizers", () => {
      const update: TablesUpdate<"organizers"> = {
        google_calendar_connected: true,
        google_calendar_token: JSON.stringify({ access_token: "new-token" }),
      };

      expect(update.google_calendar_connected).toBe(true);
    });
  });
});
