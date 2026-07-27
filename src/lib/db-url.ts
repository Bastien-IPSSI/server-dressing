type ConnectionMode = "pooled" | "direct";

const PORTS: Record<ConnectionMode, string> = {
  pooled: "6543",
  direct: "5432",
};

/**
 * Builds a Postgres connection string from discrete env vars, URL-encoding
 * user/password so special characters (#, &, @, ...) in the Supabase
 * password never break URL parsing.
 */
export function getDatabaseUrl(mode: ConnectionMode): string {
  const host = process.env.SUPABASE_DB_HOST;
  const user = process.env.SUPABASE_DB_USER;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const database = process.env.SUPABASE_DB_NAME ?? "postgres";
  const port = process.env[`SUPABASE_DB_PORT_${mode.toUpperCase()}`] ?? PORTS[mode];

  if (!host || !user || !password) {
    throw new Error(
      "Missing SUPABASE_DB_HOST / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD in .env",
    );
  }

  const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  return mode === "pooled" ? `${url}?pgbouncer=true` : url;
}
