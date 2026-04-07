import { Auth0Client } from "@auth0/nextjs-auth0/server";

let _auth0: Auth0Client | null = null;

export const auth0 = new Proxy({} as Auth0Client, {
  get(_, prop) {
    if (!_auth0) {
      _auth0 = new Auth0Client({
        authorizationParameters: {
          scope: "openid profile email offline_access",
          audience: process.env.AUTH0_DOMAIN
            ? `https://${process.env.AUTH0_DOMAIN}/api/v2/`
            : undefined,
        },
      });
    }
    const value = (_auth0 as any)[prop];
    if (typeof value === "function") {
      return value.bind(_auth0);
    }
    return value;
  },
});
