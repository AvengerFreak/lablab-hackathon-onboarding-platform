import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HackathonCreationPage from "../HackathonCreationPage";
import { supabase } from "../../lib/supabase";

// Mock supabase
vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "test-hackathon-id" }, error: null })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user-id", email: "test@example.com" } }, error: null })),
    },
  },
}));

// Mock useAuth hook
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    status: "authenticated",
    role: "organizer",
    user: { id: "test-user-id", email: "test@example.com" },
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("HackathonCreationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  describe("Basic Info Step", () => {
    it("renders the hackathon creation page", () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );
      
      expect(screen.getByText("Create New Hackathon")).toBeInTheDocument();
    });

    it("validates required fields in basic info step", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Try to proceed without filling required fields
      const nextButton = screen.getByText(/Next/i);
      fireEvent.click(nextButton);

      // Should show validation errors
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Slug is required")).toBeInTheDocument();
    });

    it("generates slug from hackathon name", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "AI Builders Hackathon 2026" } });

      const slugInput = screen.getByLabelText(/Slug/i);
      expect(slugInput).toHaveValue("ai-builders-hackathon-2026");
    });

    it("validates year is within valid range", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      const yearInput = screen.getByLabelText(/Year/i);
      fireEvent.change(yearInput, { target: { value: "2019" } });

      const nextButton = screen.getByText(/Next/i);
      fireEvent.click(nextButton);

      expect(screen.getByText("Valid year is required")).toBeInTheDocument();
    });

    it("validates end date is after start date", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const endDateInput = screen.getByLabelText(/End Date/i);
      
      fireEvent.change(startDateInput, { target: { value: "2026-01-15" } });
      fireEvent.change(endDateInput, { target: { value: "2026-01-10" } });

      const nextButton = screen.getByText(/Next/i);
      fireEvent.click(nextButton);

      expect(screen.getByText("End date must be after start date")).toBeInTheDocument();
    });
  });

  describe("Content Step", () => {
    it("validates program and challenge description are required", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Fill in basic info first
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const nextButton = screen.getAllByText(/Next/i)[0];
      fireEvent.click(nextButton);

      // Now on content step, try to proceed without filling
      const nextButton2 = screen.getByText(/Next/i);
      fireEvent.click(nextButton2);

      expect(screen.getByText("Program is required")).toBeInTheDocument();
      expect(screen.getByText("Challenge description is required")).toBeInTheDocument();
    });
  });

  describe("Rules Step", () => {
    it("validates all rule fields are required", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to rules step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      // Click through to rules step
      const nextButtons = screen.getAllByText(/Next/i);
      fireEvent.click(nextButtons[0]); // basic -> content
      fireEvent.click(nextButtons[0]); // content -> rules

      // Try to proceed without filling rules
      const nextButton = screen.getByText(/Next/i);
      fireEvent.click(nextButton);

      expect(screen.getByText("Rules are required")).toBeInTheDocument();
      expect(screen.getByText("Submission rules are required")).toBeInTheDocument();
      expect(screen.getByText("Judging criteria are required")).toBeInTheDocument();
    });
  });

  describe("GitHub Step", () => {
    it("validates GitHub organization is required", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to github step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      // Click through to github step
      const nextButtons = screen.getAllByText(/Next/i);
      fireEvent.click(nextButtons[0]); // basic -> content
      fireEvent.click(nextButtons[0]); // content -> rules
      fireEvent.click(nextButtons[0]); // rules -> partners
      fireEvent.click(nextButtons[0]); // partners -> community
      fireEvent.click(nextButtons[0]); // community -> github

      // Try to proceed without GitHub org
      const nextButton = screen.getByText(/Next/i);
      fireEvent.click(nextButton);

      expect(screen.getByText("GitHub organization is required")).toBeInTheDocument();
    });

    it("displays repository naming convention preview", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to github step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "AI Builders" } });
      
      const yearInput = screen.getByLabelText(/Year/i);
      fireEvent.change(yearInput, { target: { value: "2026" } });

      // Fill required fields to navigate through
      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      // Click through to github step
      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Check the naming convention preview
      expect(screen.getByText(/ai-builders-&lt;team-name&gt;-2026/)).toBeInTheDocument();
    });
  });

  describe("Checklist Step", () => {
    it("allows selecting reusable steps", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to checklist step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      // Fill all required fields
      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      // Click through to checklist step
      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 6; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Check for reusable steps
      expect(screen.getByText("Join lablab Discord")).toBeInTheDocument();
      expect(screen.getByText("Join hackathon Discord server")).toBeInTheDocument();
    });

    it("allows adding custom steps", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to checklist step (fill all required fields first)
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 6; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Add a custom step
      const addButton = screen.getByText(/Add Custom Step/i);
      fireEvent.click(addButton);

      expect(screen.getByText("Step 1")).toBeInTheDocument();
    });
  });

  describe("Schedule Step", () => {
    it("allows adding event days", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to schedule step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 7; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Add a day
      const addDayButton = screen.getByText(/Add Day/i);
      fireEvent.click(addDayButton);

      expect(screen.getByText("No events for this day.")).toBeInTheDocument();
    });

    it("allows adding events to days", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to schedule step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 7; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Add a day
      const addDayButton = screen.getByText(/Add Day/i);
      fireEvent.click(addDayButton);

      // Add an event
      const addEventButton = screen.getByText(/Add Event/i);
      fireEvent.click(addEventButton);

      expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Meeting link (Google Meet/Zoom)")).toBeInTheDocument();
    });
  });

  describe("Partners Step", () => {
    it("allows adding partners", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to partners step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 4; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Add a partner
      const addPartnerButton = screen.getByText(/Add Partner/i);
      fireEvent.click(addPartnerButton);

      expect(screen.getByText("Partner 1")).toBeInTheDocument();
    });

    it("allows adding prizes", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to partners step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 4; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Add a prize
      const addPrizeButton = screen.getByText(/Add Prize/i);
      fireEvent.click(addPrizeButton);

      expect(screen.getByText("Prize 1")).toBeInTheDocument();
    });
  });

  describe("Credits Step", () => {
    it("allows enabling credit allocation", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to credits step
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 9; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Enable credit allocation
      const toggle = screen.getByLabelText(/Enable Automated Credit Allocation/i);
      fireEvent.click(toggle);

      expect(screen.getByText("Partner Integrations")).toBeInTheDocument();
    });

    it("allows adding partner integrations", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Navigate to credits step and enable
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 9; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Enable credit allocation
      const toggle = screen.getByLabelText(/Enable Automated Credit Allocation/i);
      fireEvent.click(toggle);

      // Add a partner
      const addPartnerButton = screen.getByText(/Add Partner/i);
      fireEvent.click(addPartnerButton);

      expect(screen.getByText("Partner 1")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g., Fireworks AI")).toBeInTheDocument();
    });
  });

  describe("Review Step", () => {
    it("displays all entered information for review", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Fill in all required fields
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const slugInput = screen.getByLabelText(/Slug/i);
      fireEvent.change(slugInput, { target: { value: "test-hackathon" } });
      
      const yearInput = screen.getByLabelText(/Year/i);
      fireEvent.change(yearInput, { target: { value: "2026" } });

      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      // Navigate to review step
      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 10; i++) {
        fireEvent.click(nextButtons[0]);
      }

      // Check review displays the information
      expect(screen.getByText("Test Hackathon")).toBeInTheDocument();
      expect(screen.getByText("test-hackathon")).toBeInTheDocument();
      expect(screen.getByText("2026")).toBeInTheDocument();
      expect(screen.getByText("test-org")).toBeInTheDocument();
    });

    it("displays create hackathon button", async () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Fill in all required fields and navigate to review
      const nameInput = screen.getByLabelText(/Hackathon Name/i);
      fireEvent.change(nameInput, { target: { value: "Test Hackathon" } });
      
      const githubOrgInput = screen.getByLabelText(/GitHub Organization Name/i);
      fireEvent.change(githubOrgInput, { target: { value: "test-org" } });

      const programInput = screen.getByLabelText(/Program Overview/i);
      fireEvent.change(programInput, { target: { value: "Test program" } });
      
      const challengeInput = screen.getByLabelText(/Challenge Description/i);
      fireEvent.change(challengeInput, { target: { value: "Test challenge" } });

      const rulesInput = screen.getByLabelText(/General Rules/i);
      fireEvent.change(rulesInput, { target: { value: "Test rules" } });
      
      const submissionInput = screen.getByLabelText(/Submission Rules/i);
      fireEvent.change(submissionInput, { target: { value: "Test submission" } });
      
      const judgingInput = screen.getByLabelText(/Judging Criteria/i);
      fireEvent.change(judgingInput, { target: { value: "Test judging" } });

      const nextButtons = screen.getAllByText(/Next/i);
      for (let i = 0; i < 10; i++) {
        fireEvent.click(nextButtons[0]);
      }

      expect(screen.getByText(/Create Hackathon/i)).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates back to hackathons list when back button is clicked", () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      const backButton = screen.getByLabelText(/Go to home/i);
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith("/hackathons");
    });

    it("shows step indicators", () => {
      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      // Should show 11 step indicators
      const stepIndicators = screen.getAllByText(/^[0-9\u2713]$/);
      expect(stepIndicators.length).toBeGreaterThanOrEqual(11);
    });
  });

  describe("Authentication", () => {
    it("redirects unauthenticated users to home", () => {
      // Mock unauthenticated state
      vi.mocked(require("../../hooks/useAuth")).useAuth = () => ({
        status: "unauthenticated",
        role: "unknown",
        user: null,
      });

      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("redirects non-organizers to wizard", () => {
      // Mock participant state
      vi.mocked(require("../../hooks/useAuth")).useAuth = () => ({
        status: "authenticated",
        role: "participant",
        user: { id: "test-user-id", email: "test@example.com" },
      });

      render(
        <MemoryRouter>
          <HackathonCreationPage />
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith("/wizard", { replace: true });
    });
  });
});
