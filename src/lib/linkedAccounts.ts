import type { User } from "@supabase/supabase-js";

export interface LinkedAccountUsernames {
  githubUsername: string | null;
  discordUsername: string | null;
}

/** Read GitHub/Discord usernames from user metadata and OAuth identities. */
export function getLinkedAccountUsernames(user: User): LinkedAccountUsernames {
  const metadata = user.user_metadata ?? {};

  let githubUsername =
    (metadata.github_username as string | undefined)?.trim() || null;
  let discordUsername =
    (metadata.discord_username as string | undefined)?.trim() || null;

  // Support legacy double-nested metadata from an earlier bug
  const nested = metadata.user_metadata as Record<string, unknown> | undefined;
  if (!githubUsername && typeof nested?.github_username === "string") {
    githubUsername = nested.github_username.trim() || null;
  }
  if (!discordUsername && typeof nested?.discord_username === "string") {
    discordUsername = nested.discord_username.trim() || null;
  }

  if (!githubUsername) {
    const githubIdentity = user.identities?.find((i) => i.provider === "github");
    const identityData = githubIdentity?.identity_data as
      | Record<string, unknown>
      | undefined;
    const fromOAuth =
      identityData?.user_name ??
      identityData?.preferred_username ??
      identityData?.login;
    if (typeof fromOAuth === "string" && fromOAuth.trim()) {
      githubUsername = fromOAuth.trim();
    }
  }

  return { githubUsername, discordUsername };
}

export function hasLinkedAccounts(user: User): boolean {
  const { githubUsername, discordUsername } = getLinkedAccountUsernames(user);
  return !!githubUsername && !!discordUsername;
}
