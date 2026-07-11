# Hackathon Creation Enhancements - Implementation Plan

## Overview
This document outlines the implementation plan for enhancing the hackathon creation process on the organizer portal.

## Key Features to Implement

### 1. Enhanced Hackathon Creation Form
- **Fields Required:**
  - Basic Info: name, slug, year, start_date, end_date, welcome_message
  - Content: program, challenge_description
  - Rules & Guidelines: rules, submission_rules, judging_criteria
  - Partners & Prizes: partners (array), prizes (array)
  - Community & Social: discord_server_id, discord_invite_url, slack_channel, forum_url, twitter_handle, linkedin_url, instagram_handle, hashtag
  - GitHub Settings: github_org, repo_visibility (private/public)
  - Checklist Runbook: reusable_steps (array), custom_steps (array with name, description, is_required)
  - Event Schedule: days (array with date and events), events (array with time, title, description, meeting_link)
  - Guest Speakers: array with name, title, bio, photo_url, session_time
  - Credit Allocations: enabled (boolean), partners (array with name, endpoint_url, api_key, credit_amount)

### 2. Database Schema Updates
- Add new columns to `hackathons` table
- Create new tables:
  - `hackathon_checklist_items` - for reusable and custom checklist steps
  - `partner_integrations` - for credit allocation endpoints
  - `participant_credits` - for tracking participant credit allocations
  - `event_meetings` - for storing event schedule with meeting links
  - `participant_meeting_invites` - for tracking Google Calendar invites

### 3. GitHub Organization Integration
- Modify `create-team-infrastructure` function to:
  - Create repos in the specified GitHub organization
  - Use naming convention: `<hackathon-slug>-<team-name>-<year>`
  - Support both private and public repository creation
  - Add participants as collaborators to team repos

### 4. Automated Credit Allocation
- Create new Supabase function: `allocate-partner-credits`
- Trigger credit allocation when participant links their account
- Call partner APIs to allocate credits automatically

### 5. Google Calendar Integration
- Create new Supabase function: `send-google-calendar-invite`
- Send calendar invites when participant registers (before team selection)
- Store invite status in `participant_meeting_invites` table

### 6. Updated Team Infrastructure Creation
- Modify `create-team-infrastructure` to:
  - Use the hackathon's GitHub organization
  - Apply the naming convention
  - Respect the repo_visibility setting
  - Add all team members as collaborators

## Files to Create/Modify

### New Files
1. `src/pages/HackathonCreationPage.tsx` - Main creation form
2. `src/pages/hackathon-creation/steps/BasicInfoStep.tsx` - Basic info form
3. `src/pages/hackathon-creation/steps/ContentStep.tsx` - Content form
4. `src/pages/hackathon-creation/steps/RulesStep.tsx` - Rules form
5. `src/pages/hackathon-creation/steps/PartnersStep.tsx` - Partners & prizes form
6. `src/pages/hackathon-creation/steps/CommunityStep.tsx` - Community & social form
7. `src/pages/hackathon-creation/steps/GitHubStep.tsx` - GitHub settings form
8. `src/pages/hackathon-creation/steps/ChecklistStep.tsx` - Checklist runbook form
9. `src/pages/hackathon-creation/steps/ScheduleStep.tsx` - Event schedule form
10. `src/pages/hackathon-creation/steps/SpeakersStep.tsx` - Guest speakers form
11. `src/pages/hackathon-creation/steps/CreditsStep.tsx` - Credit allocations form
12. `src/pages/hackathon-creation/steps/ReviewStep.tsx` - Review & create form
13. `supabase/functions/allocate-partner-credits/index.ts` - Credit allocation function
14. `supabase/functions/send-google-calendar-invite/index.ts` - Calendar invite function

### Modified Files
1. `src/lib/database.types.ts` - Updated with new tables and columns
2. `src/App.tsx` - Add route for hackathon creation
3. `supabase/functions/create-team-infrastructure/index.ts` - Updated for org support
4. `src/pages/RegistrationPage.tsx` - Add Google Calendar email field
5. `src/pages/WizardPlaceholder.tsx` - Handle calendar invites

## Implementation Steps

### Phase 1: Database Schema
1. Update `database.types.ts` with new tables and columns
2. Create migration SQL for Supabase

### Phase 2: Backend Functions
1. Update `create-team-infrastructure` for GitHub org support
2. Create `allocate-partner-credits` function
3. Create `send-google-calendar-invite` function

### Phase 3: Frontend Components
1. Create all step components
2. Create main HackathonCreationPage
3. Update App.tsx with new route

### Phase 4: Integration
1. Connect credit allocation to participant onboarding
2. Connect calendar invites to registration
3. Test all flows

## Repository Naming Convention
Format: `{hackathon-slug}-{team-name}-{year}`
Example: `ai-builders-team-alpha-2026`

## GitHub Organization Benefits
- Unlimited collaborators (vs 3 for free personal accounts)
- Centralized management of all hackathon repos
- Better organization and discoverability

## Credit Allocation Flow
1. Organizer configures partner integrations during hackathon creation
2. Participant links their partner account during onboarding
3. System automatically calls partner API to allocate credits
4. Credits are tracked in `participant_credits` table

## Calendar Invite Flow
1. Organizer creates events with meeting links during hackathon creation
2. Participant registers and provides Google Calendar email
3. System sends calendar invite for all events with meeting links
4. Invite status tracked in `participant_meeting_invites` table
