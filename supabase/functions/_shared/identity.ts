// The account's `identity.json` and the eligibility rule for a backup (SCHEMA §Account backup, Keys).
// It holds the providers and the provider user ids only, never an email, a name or a token.

export type AuthIdentityLike = { provider?: string; id?: string };
export type AuthUserLike = { id: string; is_anonymous?: boolean; identities?: AuthIdentityLike[] | null };

export type IdentityFile = {
  user_id: string;
  providers: { provider: string; provider_user_id: string }[];
};

export type Eligibility =
  | { ok: true; identity: IdentityFile }
  | { ok: false; code: "anonymous" | "no_oauth_identity" };

/** Providers that are not a sign-in through an OAuth provider. */
const NOT_OAUTH = new Set(["email", "anonymous", "phone"]);

export function judgeAuthUser(user: AuthUserLike): Eligibility {
  if (user.is_anonymous === true) return { ok: false, code: "anonymous" };
  const providers = (user.identities ?? [])
    .filter((i) => typeof i.provider === "string" && !NOT_OAUTH.has(i.provider) && typeof i.id === "string")
    .map((i) => ({ provider: i.provider as string, provider_user_id: i.id as string }))
    .sort((a, b) => (a.provider + a.provider_user_id).localeCompare(b.provider + b.provider_user_id));
  if (providers.length === 0) return { ok: false, code: "no_oauth_identity" };
  return { ok: true, identity: { user_id: user.id, providers } };
}
