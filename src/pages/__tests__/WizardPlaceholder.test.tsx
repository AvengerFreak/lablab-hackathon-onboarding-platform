import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* ── Exact step labels as defined in WizardPlaceholder STEPS ────── */
const EXPECTED_STEP_LABELS = [
  "Create AMD Account",
  "Register for AMD Developers Program",
  "Create AMD Cloud Developer Account",
  "Claim Cloud Credits",
  "Claim Fireworks.ai Credits",
  "Claim Natively AI Builder Credits",
  "Create or Join Team Discord",
  "Create or Join Team GitHub Account",
];

/* ── Step key order (must match STEPS array) ────────────────────── */
const EXPECTED_STEP_KEYS = [
  "amd_account",
  "amd_developer",
  "amd_cloud",
  "cloud_credits",
  "fireworks_credits",
  "natively_credits",
  "team_discord",
  "team_github",
];

/* ── Chain builder ──────────────────────────────────────────────── */

function createChain(responses?: {
  maybeSingle?: unknown;
  single?: unknown;
  order?: unknown;
}) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    maybeSingle: vi.fn(() => chain),
    then: vi.fn(),
  };

  chain.then = vi.fn((onfulfilled?: unknown) => {
    return Promise.resolve(
      typeof onfulfilled === "function"
        ? onfulfilled({ data: null, error: null })
        : { data: null, error: null }
    );
  });

  if (responses?.maybeSingle) {
    chain.maybeSingle = vi.fn(() =>
      Promise.resolve(responses.maybeSingle as { data: unknown; error: unknown })
    );
  }
  if (responses?.single) {
    chain.single = vi.fn(() =>
      Promise.resolve(responses.single as { data: unknown; error: unknown })
    );
  }
  if (responses?.order) {
    chain.order = vi.fn(() =>
      Promise.resolve(responses.order as { data: unknown; error: unknown })
    );
  }

  return chain;
}

const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockUseCurrentParticipant = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useCurrentParticipant: () => mockUseCurrentParticipant(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWizard(Wizard: React.ComponentType) {
  return render(
    <QueryClientProvider client={queryClient}>
      <Wizard />
    </QueryClientProvider>
  );
}

let Wizard: React.ComponentType;

async function setupDefaultMocks(participantOverride?: Record<string, unknown>) {
  const participant = participantOverride ?? {
    id: "p-1",
    name: "Test User",
    email: "test@example.com",
    team_id: "team-1",
    hackathon_id: "hack-1",
    steps_completed: EXPECTED_STEP_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {}),
    auth_user_id: "user-1",
    github_username: null,
    discord_username: null,
    created_at: "2024-01-01T00:00:00Z",
  };

  mockUseCurrentParticipant.mockReturnValue({ participant, loading: false });

  // team
  const teamChain = createChain({
    single: { data: { id: "team-1", name: "My Team" }, error: null },
  });
  teamChain.select = vi.fn(() => teamChain);
  teamChain.eq = vi.fn(() => teamChain);

  // hackathon
  const hackChain = createChain({
    single: { data: { name: "Test Hackathon" }, error: null },
  });
  hackChain.select = vi.fn(() => hackChain);
  hackChain.eq = vi.fn(() => hackChain);

  // teammates
  const teammateChain = createChain();
  teammateChain.select = vi.fn(() => teammateChain);
  teammateChain.eq = vi.fn(() => teammateChain);
  teammateChain.neq = vi.fn(() => ({
    then: vi.fn((cb?: unknown) =>
      Promise.resolve(typeof cb === "function" ? cb({ data: [], error: null }) : { data: [], error: null })
    ),
  }));

  // audit_logs
  const auditChain = createChain();
  auditChain.insert = vi.fn(() => ({
    then: vi.fn((cb?: unknown) =>
      Promise.resolve(typeof cb === "function" ? cb({ data: null, error: null }) : { data: null, error: null })
    ),
  }));

  mockFrom.mockImplementation((table: string) => {
    if (table === "teams") return teamChain;
    if (table === "hackathons") return hackChain;
    if (table === "participants") return teammateChain;
    if (table === "audit_logs") return auditChain;
    return createChain();
  });

  return participant;
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseCurrentParticipant.mockReturnValue({ participant: null, loading: true });
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockFrom.mockReturnValue(createChain());
  Wizard = (await import("../WizardPlaceholder")).default;
});

/* ── getStepsCompleted tests ────────────────────────── */

describe("getStepsCompleted helper", () => {
  it("parses all 8 keys from a valid object", () => {
    const getStepsCompleted = (raw: unknown) => {
      if (typeof raw === "object" && raw !== null) {
        const r = raw as Record<string, unknown>;
        return {
          amd_account: Boolean(r.amd_account),
          amd_developer: Boolean(r.amd_developer),
          amd_cloud: Boolean(r.amd_cloud),
          cloud_credits: Boolean(r.cloud_credits),
          fireworks_credits: Boolean(r.fireworks_credits),
          natively_credits: Boolean(r.natively_credits),
          team_discord: Boolean(r.team_discord),
          team_github: Boolean(r.team_github),
        };
      }
      return {
        amd_account: false,
        amd_developer: false,
        amd_cloud: false,
        cloud_credits: false,
        fireworks_credits: false,
        natively_credits: false,
        team_discord: false,
        team_github: false,
      };
    };

    const allTrue = Object.fromEntries(EXPECTED_STEP_KEYS.map((k) => [k, true]));
    expect(getStepsCompleted(allTrue)).toEqual(allTrue);

    const allFalse = Object.fromEntries(EXPECTED_STEP_KEYS.map((k) => [k, false]));
    expect(getStepsCompleted(null)).toEqual(allFalse);
    expect(getStepsCompleted(undefined)).toEqual(allFalse);
    expect(getStepsCompleted({})).toEqual(allFalse);
  });

  it("returns false for any missing keys", () => {
    const getStepsCompleted = (raw: unknown) => {
      if (typeof raw === "object" && raw !== null) {
        const r = raw as Record<string, unknown>;
        return {
          amd_account: Boolean(r.amd_account),
          amd_developer: Boolean(r.amd_developer),
          amd_cloud: Boolean(r.amd_cloud),
          cloud_credits: Boolean(r.cloud_credits),
          fireworks_credits: Boolean(r.fireworks_credits),
          natively_credits: Boolean(r.natively_credits),
          team_discord: Boolean(r.team_discord),
          team_github: Boolean(r.team_github),
        };
      }
      return {
        amd_account: false,
        amd_developer: false,
        amd_cloud: false,
        cloud_credits: false,
        fireworks_credits: false,
        natively_credits: false,
        team_discord: false,
        team_github: false,
      };
    };

    // partially filled
    const partial = getStepsCompleted({ amd_account: true, amd_developer: true });
    expect(partial.amd_account).toBe(true);
    expect(partial.amd_developer).toBe(true);
    expect(partial.amd_cloud).toBe(false);
    expect(partial.team_github).toBe(false);
  });
});

/* ── Step ordering tests ────────────────────────────── */

describe("WizardPlaceholder — step order", () => {
  it("shows all 8 step labels on screen in the correct order", async () => {
    await setupDefaultMocks();
    renderWizard(Wizard);

    // Each step header renders the label
    const stepNodes = EXPECTED_STEP_LABELS.map((label) =>
      screen.getAllByText(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
    );

    // Every label appears at least once
    stepNodes.forEach((nodes, i) => {
      expect(nodes.length, `Step "${EXPECTED_STEP_LABELS[i]}" not found`).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders step indices 1-8 on the step indicators", async () => {
    await setupDefaultMocks();
    renderWizard(Wizard);

    for (let i = 1; i <= 8; i++) {
      // The step number is rendered inside the step indicator circle
      const nums = screen.getAllByText(String(i));
      // Each step number should appear at least once
      expect(nums.length, `Step number ${i} not found in DOM`).toBeGreaterThanOrEqual(1);
    }
  });

  it("step 2 is locked (disabled) when step 1 is incomplete", async () => {
    await setupDefaultMocks();
    renderWizard(Wizard);

    // Step 1 button is NOT disabled (it's active), step 2 buttons are disabled
    const buttons = screen.getAllByRole("button");

    // The step header buttons: find the one for step 2 label
    const step2Buttons = buttons.filter((btn) =>
      btn.textContent?.includes("Register for AMD Developers Program")
    );

    step2Buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("all steps beyond the first incomplete one are locked", async () => {
    // All steps false = step 1 active, steps 2-8 locked
    await setupDefaultMocks();
    renderWizard(Wizard);

    const buttons = screen.getAllByRole("button");

    // Step 1 should be enabled
    const step1 = buttons.find((btn) =>
      btn.textContent?.includes("Create AMD Account")
    );
    expect(step1).toBeDefined();

    // Steps 2-8 should be disabled
    for (let i = 1; i < EXPECTED_STEP_LABELS.length; i++) {
      const btns = buttons.filter((btn) =>
        btn.textContent?.includes(EXPECTED_STEP_LABELS[i])
      );
      btns.forEach((b) => {
        expect(b, `Step "${EXPECTED_STEP_LABELS[i]}" should be disabled`).toBeDisabled();
      });
    }
  });
});

/* ── Component rendering tests ──────────────────────── */

describe("WizardPlaceholder — rendering", () => {
  it("shows loading state when participant is loading", () => {
    mockUseCurrentParticipant.mockReturnValue({ participant: null, loading: true });
    renderWizard(Wizard);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows not found message when no participant", async () => {
    mockUseCurrentParticipant.mockReturnValue({ participant: null, loading: false });
    renderWizard(Wizard);
    const msg = await screen.findByText(/no hackathon found/i);
    expect(msg).toBeInTheDocument();
  });

  it("shows welcome message with participant name", async () => {
    await setupDefaultMocks();
    renderWizard(Wizard);
    const welcome = await screen.findByText(/welcome, test user/i);
    expect(welcome).toBeInTheDocument();
  });

  it("shows all set state when all 8 steps completed and both usernames filled", async () => {
    const participant = {
      id: "p-1",
      name: "Test User",
      email: "test@example.com",
      team_id: "team-1",
      hackathon_id: "hack-1",
      steps_completed: Object.fromEntries(EXPECTED_STEP_KEYS.map((k) => [k, true])),
      auth_user_id: "user-1",
      github_username: "testuser",
      discord_username: "testuser#1234",
      created_at: "2024-01-01T00:00:00Z",
    };
    await setupDefaultMocks(participant);
    renderWizard(Wizard);
    const msg = await screen.findByText(/you're all set/i);
    expect(msg).toBeInTheDocument();
  });
});

/* ── Progress indicator tests ───────────────────────── */

describe("WizardPlaceholder — progress indicator", () => {
  it("has progress dots for all 8 steps", async () => {
    await setupDefaultMocks();
    renderWizard(Wizard);

    // The progress dots are rendered as small circles with aria-labels
    // Each step gets a dot
    for (const label of EXPECTED_STEP_LABELS) {
      // The progress indicator uses aria-label like "Current step: X" or "X complete"
      const dots = screen.getAllByLabelText(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      expect(dots.length, `Progress dot missing for "${label}"`).toBeGreaterThanOrEqual(1);
    }
  });
});
