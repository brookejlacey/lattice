import { Auth0AI } from "@auth0/ai-vercel";
import { auth0 } from "@/lib/auth0";

const auth0AI = new Auth0AI();

async function getRefreshToken() {
  const session = await auth0.getSession();
  return session?.tokenSet.refreshToken as string;
}

// GitHub - repos, issues, PRs, actions
export const withGitHub = auth0AI.withTokenVault({
  refreshToken: getRefreshToken,
  connection: "github",
  scopes: ["repo", "read:user", "read:org"],
});

// Google - calendar, gmail, drive
export const withGoogle = auth0AI.withTokenVault({
  refreshToken: getRefreshToken,
  connection: "google-oauth2",
  scopes: [
    "openid",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
});

// Slack - channels, messages
export const withSlack = auth0AI.withTokenVault({
  refreshToken: getRefreshToken,
  connection: "sign-in-with-slack",
  scopes: ["channels:read", "channels:history", "users:read", "chat:write"],
});

// Linear - issues, projects
export const withLinear = auth0AI.withTokenVault({
  refreshToken: getRefreshToken,
  connection: "linear",
  scopes: ["read", "write"],
});

// Notion - pages, databases
export const withNotion = auth0AI.withTokenVault({
  refreshToken: getRefreshToken,
  connection: "notion",
  scopes: [],
});
