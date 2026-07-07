# Hackathon Post-Mortem: Building the LabLab Onboarding Platform

A candid retrospective of complications, tool limitations, and lessons learned while building a hackathon onboarding platform with AI-assisted development tools.

> **Context:** This project was built during the **LabLab AI Hackathon** using the Natively AI Builder platform. The goal was a comprehensive onboarding platform that guides participants through AMD Developer Cloud setup, Fireworks.ai integration, team workspace provisioning, and GitHub repository creation — all orchestrated by an AI assistant.

---

## Table of Contents

1. [Communication Breakdown — Building a Team Was a Pain](#1-communication-breakdown)
2. [Moderator & Mentor Scarcity](#2-moderator--mentor-scarcity)
3. [The AI Builder Exposed Real Secrets to the Repository](#3-the-ai-builder-exposed-real-secrets-to-the-repository)
4. [Token Efficiency ≠ Quality Code](#4-token-efficiency--quality-code)
5. [Architectural Intent vs. Generated Reality](#5-architectural-intent-vs-generated-reality)
6. [The README Was Never Written — Until I Asked](#6-the-readme-was-never-written)

---

## 1. Communication Breakdown

### The Problem

At the start of the hackathon, **team communication was essentially nonexistent**. The core team was assembled through a hackathon matchmaking system with no built-in messaging, no shared workspace, and no way to coordinate until everyone independently found their way to a Discord server.

### Impact

- **Day 1 was lost** to figuring out who was on the team and how to reach them.
- Division of labor couldn't start because nobody knew who could own what.
- Architectural decisions were made in isolation rather than collaboratively, leading to rework later.
- The "team lead" role was ambiguous — no formal assignment, so ownership of critical decisions fell to whoever happened to respond first.

### What Would Have Helped

- A pre-hackathon onboarding call or mandatory team channel creation upon registration.
- A matchmaking system that provides contact info (Discord, GitHub, email) immediately upon team formation.
- A lightweight team charter template that teams fill out in the first hour (who owns what, communication channels, decision-making process).

---

## 2. Moderator & Mentor Scarcity

### The Problem

**Moderators and mentors were scarce and slow to respond.** Throughout the hackathon, questions that needed an organizer's or mentor's input could take hours — sometimes overnight — to get an answer.

### Impact

- **Blocked on infrastructure decisions.** Questions like "Should we use Supabase or Firebase?" or "Can we deploy Edge Functions?" required organizer input on what tools were allowed.
- **API key provisioning was delayed.** Promo codes, API credits, and access grants depended on mentors who were stretched across dozens of teams.
- **Bug triage was solo.** When something broke (e.g., the AI Builder failing to scaffold a component), there was no escalation path — the team had to debug AI-generated code with no mentor to sanity-check the approach.
- **Morale took a hit.** When you're stuck and nobody answers for 6+ hours in a 48-hour hackathon, you either give up or hack around the problem with duct tape.

### What Would Have Helped

- A scheduled "office hours" cadence (every 4 hours, 30 min) so teams knew when to expect answers.
- A FAQ / known-issues document updated in real time by mentors.
- A Discord bot with automated responses for the top 10 most common setup questions.

---

## 3. The AI Builder Exposed Real Secrets to the Repository

### The Problem

This was the **most critical security failure in the project.**

Despite the architectural blueprint explicitly stating:

> *"Keep credentials in HashiCorp Vault only. Do not store secrets in source code, GitHub, frontend code, or plain .env files outside local dev."*

...the **AI Builder wrote a raw** `.env` **file containing real Supabase API credentials and committed it to the** `main` **branch of the repository.**

### Root Cause

The AI Builder was given a detailed architectural plan with security requirements, but the natively medium model was not intelligent enough to build out all those requirements, using another model like Claude Opus would have been better but way to token expensive:

1. The plan mentioned `.env` as a local development convenience, but the AI interpreted this as "I should create this file with real values."
2. The AI had **direct access to the project's Supabase configuration** (from the MCP tools that list projects and fetch API keys) and injected those real values into the source tree.
3. The builder's generation model prioritizes "working output" over "secure output" — it will happily paste live credentials into generated code unless aggressively prompted otherwise.
4. There was **no pre-commit hook, no secret scanner, and no code review gate** because the AI generated and committed files autonomously.

### The Aftermath

- **The Supabase anon key had to be rotated** — invalidating any client that was still using the old key and requiring all team members to update their local configs.
- The `.env` file was visible in the commit history even after deletion, so a full cleanup required rewriting git history.
- Trust in the AI tool was damaged — if it couldn't follow the most basic security rule, what else had it gotten wrong?

### The Fix Applied

1. Deleted the `.env` file from the repository.
2. Added `.env`, `.env.local`, `.env.production` to `.gitignore`.
3. Sanitized `.env.example` to contain only placeholder values.
4. Updated the CI/CD pipeline to inject secrets from GitHub Actions Secrets at build time, never from a committed file.
5. Rotated the Supabase anon key in the Supabase dashboard.

### Lessons Learned

- **Never give the AI builder direct access to real credentials.** The tool should operate in a sandboxed environment where secrets are injected at runtime, not available for the AI to read and write.
- **Treat AI-generated code as an unvetted PR from an intern.** Always review for secrets, hardcoded URLs, and security antipatterns before committing.
- **Add automated secret scanning to the CI pipeline** (e.g., `trufflehog`, `git-secrets`, GitHub's built-in secret scanning) as a non-negotiable gate.
- **The architectural blueprint must explicitly say "DO NOT WRITE .env FILES"** — not "keep credentials in Vault." The AI literalises instructions, so prohibitions must be concrete and unambiguous.

---

## 4. Token Efficiency ≠ Quality Code

### The Problem

The AI Builder uses a **medium-complexity algorithm** that is token-efficient — it generates concise, minimal code that runs. But **efficiency in token count did not translate to efficiency in development.**

### Manifestations

IssueExample**Shallow component structure**Instead of a reusable `TeamCard` with variants, the AI generated inline JSX that was duplicated across three pages.**No error boundaries**The generated components assumed success paths only. Network failures, empty states, and auth timeouts were not handled.**Poor TypeScript usage**Types were often `any` or `unknown` when explicit interfaces were needed. The architectural plan specified "Use typed request and response schemas" — this was ignored.**Missing accessibility**Buttons without `aria-label`, forms without `htmlFor` on labels, no focus management.**Hardcoded strings**API URLs, error messages, and copy were scattered across files instead of centralised in a constants/config file.

### The Guidance Paradox

The more specific the guidance, the better the output — but "more specific" meant writing pseudo-code in the prompt, at which point **you might as well write the code yourself.**

The AI needed:

- Exact file paths for imports.
- Exact Tailwind class combinations.
- Exact function signatures.
- Explicit instructions about what *not* to do (see: the `.env` disaster above).

If you gave vague but correct guidance ("use proper error handling"), the output was generic. If you gave precise guidance ("wrap this fetch in a try/catch, return a discriminated union of `{data, error}`, and render a fallback UI when `error` is non-null"), the output was correct — but you'd already solved the problem mentally.

### The Real Cost

"Token efficiency" meant fewer tokens per generation, but **more generations per feature.** Each feature required 3–5 refinement rounds, each with detailed correction prompts. The total token spend across refinements often exceeded what a single, more expensive generation with a better algorithm would have cost.

### What Would Have Helped

- A "quality over conciseness" mode that generates more verbose, safer, better-structured code on the first attempt.
- Built-in linting and type-checking as a post-generation validation step (the AI should check its own output before writing it to disk).
- A pattern library / snippet system so the AI doesn't regenerate the same patterns from scratch every time.

---

## 5. Architectural Intent vs. Generated Reality

### The Problem

The architectural blueprint specified a comprehensive quality system:

> *"Require unit tests for API, services, and frontend logic. Require linting, formatting, and type checking. Require code scanning, dependency scanning, secret scanning, and container scanning."*

**None of this was implemented in the generated code.**

### What Was Missing

RequirementStatusImpactUnit tests❌ Not generatedNo regression safety net; every change risked breaking existing functionalityLinting (ESLint)❌ Not configuredCode quality inconsistencies, no automated enforcementPrettier / formatting❌ Not configuredInconsistent formatting across generated filesTypeScript strict mode❌ Not enabledRelaxed type checking allowed bugs to slip throughSecret scanning❌ Not configuredThe `.env` leak (see issue #3) was detected by a human, not a toolDependency scanning❌ Not configuredNo visibility into vulnerable packagesIntegration tests❌ Not generatedNo automated verification of onboarding flowsCode scanning (SAST)❌ Not configuredNo automated security review of generated code

### Root Cause Analysis

1. **The architectural blueprint was provided as context to the "Product Architect" agent, not the "Builder" agent.** There's a handoff between agents, and context is lost or compressed in the transition.

2. **The AI optimises for visible progress.** A passing test suite doesn't make the app "work" in the preview panel, so the AI prioritises rendering UI over writing tests.

3. **"Linting" and "testing" are abstract directives.** Without explicit, actionable instructions (e.g., `npm install --save-dev eslint prettier; npx eslint --init`), the AI interpreted them as aspirational goals rather than build steps.

4. **The generation pipeline has no post-processing stage.** After generating code, there's no automated step to run `npm run lint`, `npm test`, or `npx trivy scan` against the output. The AI writes files, and the process ends.

### What Would Have Helped

- **A "pre-flight checklist" that the AI must execute after code generation:** install lint tools, create config files, run the linter, fix all errors, run tests, verify coverage.
- **Multi-agent handoff with context-preserving summaries.** When the Architect passes to the Builder, the Builder should receive a structured "non-negotiable requirements" block that includes testing, linting, and security.
- **Output validation gates.** Before writing a file, the AI should check: does this file import exist? Is this component tested? Are there any hardcoded secrets? Does this violate the architectural plan?

---

## 6. The README Was Never Written

### The Problem

After generating the entire project — scaffold, components, routing, Supabase integration, CI/CD pipeline, Edge Functions — the AI **never created a README file.**

The architectural plan explicitly required:

> *"Ensure the README includes: hackathon submission instructions, setup steps, relevant links, schedule link, lablab Twitch videos, tutorial resources."*

But this requirement was scoped to the **boilerplate repository that the onboarding assistant would create for each team**, not the project's own README. The Builder agent didn't infer that the project itself needed documentation.

### The Irony

The codebase had:

- A `.github/workflows/deploy.yml` with a 77-line CI pipeline.
- Three Supabase Edge Functions with full TypeScript types.
- React components with routing, authentication, and layout.
- Zero instructions on how to run any of it.

A new developer cloning the repository would see:

```
src/
public/
supabase/
package.json
vite.config.ts
...
```

...and have no idea what commands to run, what environment variables to set, or what the project even does.

### Why This Happened

1. **The AI doesn't proactively document.** It assumes the consumer (the developer) is the same entity as the requester (the AI user). It doesn't reason that other humans will need to understand the output.

2. **"Write documentation" is a separate cognitive step** that the AI doesn't chain automatically after "write code." It would need an explicit instruction or a workflow rule: "After generating all source files, write a README."

3. **The architectural plan had a blind spot.** The README requirement was nested inside the "Repository Workflow" section — describing what the *platform* would create for *teams* — not what the *project itself* needed. The AI correctly applied the instruction to the wrong target.

### The Fix Applied

I explicitly prompted the AI to create the README. It generated a comprehensive document covering prerequisites, quick start, environment variables, project structure, scripts, Supabase setup, and deployment — all in one pass. The capability was there; the initiative was not.

### Lessons Learned

- **Add "Generate a README" as the final step in every build workflow.** Make it non-optional.
- **Prompt for documentation in two passes:** first the code, then the docs. Don't combine them.
- **Include a "Who is this for?" check.** If the AI can't articulate who will read a file and what they need to know, it should flag it as requiring documentation.

---

## 7. Model Limitations — Free Tier Ceiling

### The Problem

Even after provisioning a Fireworks.ai API key and connecting it to the Natively Builder, **the only models available for code generation were free-tier, medium-complexity models.** There was no way to unlock premium models (Claude Opus, GPT-4, Gemini Ultra, etc.) despite having a paid API account hooked up.

### Root Cause

1. **The builder platform does not pass the user's external API key upstream to the generation model.** Having a Fireworks.ai account with credits meant nothing — the builder still routed prompts through its own internal, cost-capped model selection.
2. **No "bring your own premium model" pathway exists.** There's no setting, toggle, or integration point where a user can say "use my Anthropic/GPT-4 credits for generation." The architecture assumes all users operate at the same tier.
3. **The free-tier model has a ceiling on reasoning depth.** It can scaffold, but it cannot architect. Complex multi-file refactors, nuanced security policies, and edge-case handling consistently required generations that the cheaper model couldn't produce in one pass — leading to the 3–5 refinement cycle documented in Issue #4.

### Impact

- **Every feature required iterative refinement.** Instead of the model getting it right in one generation (which a premium model might have achieved), each feature needed 3–5 correction rounds — burning more total tokens than a single premium generation would have cost.
- **Security-sensitive code couldn't be trusted.** The model that wrote the `.env` file with real secrets (Issue #3) simply lacked the reasoning capability to fully understand the security implications of its actions.
- **Sophisticated architectural directives were ignored.** The blueprint specified testing, linting, secret scanning, and error boundaries — the model lacked the cognitive bandwidth to implement all of these while also generating working UI code.
- **Real-time debugging was impossible.** When the generated code had a subtle bug (race condition, incorrect state management, missing edge case), the model couldn't self-correct without explicit line-by-line prompting.

### What Would Have Helped

- **A "bring your own key" premium mode** that allows participants to use their own Anthropic, OpenAI, or Gemini credits for generation, unlocking Claude Opus / GPT-4 class reasoning.
- **Anthropic partnership for hackathon token grants.** Partnering with Anthropic (or similar) to provide free token allocations for hackathon participants would have dramatically improved output quality — better architecture, fewer refinement rounds, more secure code.
- **Natively Builder native premium model toggle.** Even without external key integration, a simple platform-level toggle to "use best available model" (at a higher token cost to the host) would let builders opt into quality when the complexity demands it.
- **Transparent model selection UI.** Show the user what model is currently generating code and what alternatives exist, so they can make an informed trade-off between speed/cost and quality.

### The Irony

Hackathons are about building impressive things quickly. But the tool provided to builders was capped at a model tier that excels at *simple, fast output* — precisely the opposite of what a competitive hackathon needs. Participants with Fireworks.ai credits, Anthropic accounts, or OpenAI subscriptions were locked into the same free-tier generation quality as everyone else.

> **For future hackathons:** Partner with Anthropic for free token grants, or add a native "premium model" toggle in the builder that lets participants access Claude Opus–class reasoning — even if it consumes external API credits. The quality ceiling of the free-tier model was the single largest bottleneck in this project.

---

## Summary: Systemic Issues

These seven problems aren't isolated failures — they share root causes in how AI-assisted development tools work today.

Root Cause Issues It Caused **Free-tier model ceiling**#7 — premium models locked, refinement cycles required **No sandbox for secrets**#3 — `.env` leak **Token efficiency over correctness** #4 — shallow code, missing error handling **Agent handoff loses context** #5 — testing and linting never executed **No post-generation validation**#5 — no lint/test/scan step after code gen**AI doesn't infer developer needs**#6 — no README, no setup docs **No escalation path for tool bugs** #2 — stuck waiting for mentors

---

## Recommendations for Future Hackathons

### For Platform Organizers

1. **Pre-assign team communication channels** at registration time. Don't let teams self-organize channel discovery.
2. **Maintain a living FAQ document** that mentors update as questions come in.
3. **Schedule fixed office hours** with visible countdowns so teams know when help is available.
4. **Provide a "starter template" repo** that includes: README, `.env.example`, `.gitignore` with secret protection, CI with lint+test+scan, and a contributing guide.
5. **Partner with model providers (e.g. Anthropic) for hackathon token grants.** Participants building with Claude Opus–class models produce better, safer, more complete code in fewer iterations — reducing both mentor burden and participant frustration. This was the single largest quality bottleneck in this project.

### For AI Builder Tools

1. **Secrets must be injected at runtime, never available for AI to read or write.** The AI should see placeholder values only.
2. **Add a mandatory "security review" step** before any file is committed — scan for secrets, hardcoded URLs, and API keys.
3. **Support a "comprehensive mode"** that generates more verbose, safer, better-tested code at the cost of higher token usage.
4. **Preserve context across agent handoffs** with a structured "requirements contract" that the downstream agent must acknowledge and execute.
5. **Auto-generate a README** with setup instructions as the final build step, gated on all required sections being populated.
6. **Support a "bring your own key" premium model tier** so participants can use their own Anthropic/OpenAI credits to unlock Claude Opus / GPT-4 class reasoning when complexity demands it.
7. **Partner with model providers (e.g. Anthropic) for hackathon token grants** — free premium model access for participants would dramatically improve output quality and reduce the refinement cycle documented in Issue #7.

### For Teams Using AI-Assisted Development

1. **Assume the AI will leak secrets.** Never give it access to real credentials. Use a secrets manager or CI-injected environment variables from the start.
2. **Audit every generated file** for security, correctness, and completeness. The AI writes code confidently, even when it's wrong.
3. **Explicitly require the things the AI will skip:** tests, lint config, error handling, accessibility, documentation.
4. **Prefer many small, specific prompts** over one large, detailed plan. The AI follows the last instruction it received, not the full context from earlier.
5. **Budget time for cleanup.** AI-generated code is a first draft, not a final deliverable. Plan for refactoring, testing, and documentation as separate phases.

---

*Documented after the LabLab AI Hackathon, capturing the real experience of building with AI-assisted tools under hackathon constraints.*