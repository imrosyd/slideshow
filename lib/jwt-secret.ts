/**
 * Resolves the JWT signing secret.
 *
 * There is deliberately no default. A shared fallback secret in a public repo
 * is equivalent to no authentication at all: anyone can mint a token with
 * `role: "admin"` and sign it themselves.
 */

const MIN_SECRET_LENGTH = 32;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to .env. ' +
      'Refusing to fall back to a built-in secret — a known signing key lets anyone forge an admin token.'
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    console.warn(
      `[auth] JWT_SECRET is only ${secret.length} characters. ` +
      `Use at least ${MIN_SECRET_LENGTH} (\`openssl rand -hex 32\`).`
    );
  }

  return secret;
}

export default getJwtSecret;
