import { createClient } from "@libsql/client";

// Uses local SQLite automatically if no turso URL is provided.
export const getDb = () => {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || "file:local_edge.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
};
