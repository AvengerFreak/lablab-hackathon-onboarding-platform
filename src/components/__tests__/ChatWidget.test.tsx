import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ChatWidget from "../ChatWidget";

describe("ChatWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the floating chat button and toggles chatbox open/close", () => {
    render(<ChatWidget />);

    // Initially, the chatbot panel should not be open
    expect(screen.queryByRole("dialog", { name: /ai chatbot assistant/i })).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: /open chatbot pane/i });
    expect(toggleBtn).toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("dialog", { name: /ai chatbot assistant/i })).toBeInTheDocument();
    expect(screen.getByText(/hi! i am your lablab hackathon assistant/i)).toBeInTheDocument();

    // Click close button inside header
    const closeBtn = screen.getByRole("button", { name: /close assistant panel/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog", { name: /ai chatbot assistant/i })).not.toBeInTheDocument();
  });

  it("sends user message and simulates bot typing and response delay", () => {
    render(<ChatWidget />);

    // Open chatbox
    fireEvent.click(screen.getByRole("button", { name: /open chatbot pane/i }));

    const input = screen.getByPlaceholderText(/ask a question/i);
    const sendBtn = screen.getByRole("button", { name: /send message/i });

    // Type query about AMD
    fireEvent.change(input, { target: { value: "How do I get AMD credits?" } });
    fireEvent.click(sendBtn);

    // Verify user message is added
    expect(screen.getByText("How do I get AMD credits?")).toBeInTheDocument();

    // Bot typing indicator should appear
    expect(screen.getByLabelText(/ai is typing/i)).toBeInTheDocument();

    // Advance fake timers by 750ms
    act(() => {
      vi.advanceTimersByTime(750);
    });

    // Typing indicator should disappear and bot response should appear
    expect(screen.queryByLabelText(/ai is typing/i)).not.toBeInTheDocument();
    expect(screen.getByText(/to claim your amd ai developer credits/i)).toBeInTheDocument();
  });

  it("clicking suggested question chip triggers response", () => {
    render(<ChatWidget />);

    // Open chatbox
    fireEvent.click(screen.getByRole("button", { name: /open chatbot pane/i }));

    // Click "GitHub Setup" chip
    const chip = screen.getByRole("button", { name: "GitHub Setup" });
    fireEvent.click(chip);

    // User message is automatically sent
    expect(screen.getByText("When will our team GitHub repository be ready?")).toBeInTheDocument();

    // Advance fake timers
    act(() => {
      vi.advanceTimersByTime(750);
    });

    // Bot response appears
    expect(screen.getByText(/your team's github repository/i)).toBeInTheDocument();
  });

  it("returns help guidance default response on unknown keywords", () => {
    render(<ChatWidget />);

    fireEvent.click(screen.getByRole("button", { name: /open chatbot pane/i }));

    const input = screen.getByPlaceholderText(/ask a question/i);
    const sendBtn = screen.getByRole("button", { name: /send message/i });

    fireEvent.change(input, { target: { value: "what is the meaning of life?" } });
    fireEvent.click(sendBtn);

    act(() => {
      vi.advanceTimersByTime(750);
    });

    expect(screen.getByText(/i'm sorry, i don't have a direct answer/i)).toBeInTheDocument();
  });
});
