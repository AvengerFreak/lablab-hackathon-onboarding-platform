import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as baseRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const render = (ui: React.ReactElement) => baseRender(<MemoryRouter>{ui}</MemoryRouter>);

const mockUseAuth = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

describe("HackathonsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("redirects to auth if unauthenticated", async () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated", user: null, role: "unknown" });

    const HackathonsDashboard = (await import("../HackathonsDashboard")).default;
    render(<HackathonsDashboard />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("shows hackathons list for authenticated participants", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { id: "user-1" },
      role: "participant",
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const HackathonsDashboard = (await import("../HackathonsDashboard")).default;
    render(<HackathonsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Hackathons")).toBeInTheDocument();
      expect(screen.getByText(/join a hackathon and build your project/i)).toBeInTheDocument();
    });
  });

  it("shows hackathons list for authenticated organizers", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { id: "org-1" },
      role: "organizer",
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const HackathonsDashboard = (await import("../HackathonsDashboard")).default;
    render(<HackathonsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Hackathons")).toBeInTheDocument();
      expect(screen.getByText(/manage your hackathons/i)).toBeInTheDocument();
    });
  });

  it("shows no hackathons message when list is empty", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { id: "user-1" },
      role: "participant",
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const HackathonsDashboard = (await import("../HackathonsDashboard")).default;
    render(<HackathonsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("No hackathons available")).toBeInTheDocument();
    });
  });

  it("displays sign out button", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { id: "user-1" },
      role: "participant",
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const HackathonsDashboard = (await import("../HackathonsDashboard")).default;
    render(<HackathonsDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText("Sign out")).toBeInTheDocument();
    });
  });
});
