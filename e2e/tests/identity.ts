import { randomUUID } from 'node:crypto';

export interface Identity {
  readonly email: string;
  readonly username: string;
  readonly password: string;
}

/**
 * A unique account per run, so the suite never depends on state a previous run left in the
 * ephemeral Postgres volume. The password satisfies Identity's default `IdentityOptions.Password`
 * rules (`Program.cs` configures none, so the defaults apply): at least six characters, with an
 * upper-case, a lower-case, a digit and a non-alphanumeric.
 */
export function createIdentity(): Identity {
  const id = randomUUID();
  return {
    email: `${id}@example.com`,
    username: `player-${id}`,
    password: `Aa1!${id}`,
  };
}
