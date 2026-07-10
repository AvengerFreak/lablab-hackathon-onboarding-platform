import { describe, it, expect } from "vitest";
import { isLikelyGitHubPat } from "../TeamLeadGithubPatStep";

describe("isLikelyGitHubPat", () => {
  it("accepts classic tokens", () => {
    expect(isLikelyGitHubPat("ghp_1234567890abcdefghijklmnopqrstuvwxyz")).toBe(true);
  });

  it("accepts fine-grained tokens", () => {
    expect(
      isLikelyGitHubPat("github_pat_11ABCDEF1234567890_abcdefghijklmnopqrstuvwxyz")
    ).toBe(true);
  });

  it("rejects empty or invalid tokens", () => {
    expect(isLikelyGitHubPat("")).toBe(false);
    expect(isLikelyGitHubPat("not-a-token")).toBe(false);
    expect(isLikelyGitHubPat("ghp_short")).toBe(false);
  });
});
