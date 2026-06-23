import { Auth0AI } from "@auth0/ai-vercel";
import type { ToolWrapper } from "@auth0/ai-vercel";
import type { Tool } from "ai";
import { auth0 } from "@/lib/auth0";

/**
 * Lazy Token Vault authorizers.
 *
 * `Auth0AI().withTokenVault()` validates the Auth0 client credentials the moment
 * it is constructed. The tool modules import these wrappers at module-evaluation
 * time, so constructing the authorizers eagerly makes `next build` crash whenever
 * the Auth0 env vars are absent (e.g. a fresh clone before `.env.local` exists).
 *
 * Instead we defer both `new Auth0AI()` and `.withTokenVault()` until the first
 * time a wrapped tool actually executes - which only happens at request time,
 * when the env is guaranteed to be present.
 */

async function getRefreshToken() {
  const session = await auth0.getSession();
  return session?.tokenSet.refreshToken as string;
}

type AuthorizerSpec = Parameters<Auth0AI["withTokenVault"]>[0];

let _auth0AI: Auth0AI | null = null;
function auth0AI() {
  return (_auth0AI ??= new Auth0AI());
}

/**
 * Wraps a tool so the Token Vault authorizer is built on first execution rather
 * than at import time. Returns a transparent Proxy over the (eventually) wrapped
 * tool so the AI SDK sees a normal tool object.
 */
function lazyAuthorizer(spec: AuthorizerSpec) {
  let authorizer: ToolWrapper | null = null;
  const wrapper = () => (authorizer ??= auth0AI().withTokenVault(spec));

  return <T extends Tool>(t: T): T => {
    let wrapped: T | null = null;
    const resolve = () => (wrapped ??= wrapper()(t) as T);

    return new Proxy(function () {} as unknown as T, {
      get: (_target, prop) => resolve()[prop as keyof T],
      has: (_target, prop) => prop in (resolve() as object),
      ownKeys: () => Reflect.ownKeys(resolve() as object),
      getOwnPropertyDescriptor: (_target, prop) => {
        const descriptor = Object.getOwnPropertyDescriptor(
          resolve() as object,
          prop
        );
        if (descriptor) descriptor.configurable = true;
        return descriptor;
      },
    });
  };
}

// GitHub - repos, issues, PRs, actions
export const withGitHub = lazyAuthorizer({
  refreshToken: getRefreshToken,
  connection: "github",
  scopes: ["repo", "read:user", "read:org"],
});

// Google - calendar, gmail, drive
export const withGoogle = lazyAuthorizer({
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
export const withSlack = lazyAuthorizer({
  refreshToken: getRefreshToken,
  connection: "sign-in-with-slack",
  scopes: ["channels:read", "channels:history", "users:read", "chat:write"],
});
