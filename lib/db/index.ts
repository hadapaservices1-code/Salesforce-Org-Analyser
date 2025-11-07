import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use SUPABASE_DB_URL if provided (direct connection string)
// Otherwise construct from SUPABASE_URL
// Format: postgresql://postgres:[password]@[host]:5432/postgres
const connectionString = process.env.SUPABASE_DB_URL || 
  (process.env.SUPABASE_URL
    ? process.env.SUPABASE_URL.replace(/^https?:\/\//, 'postgresql://postgres:').replace(/\/$/, '')
    : '');

if (!connectionString) {
  throw new Error('SUPABASE_DB_URL or SUPABASE_URL is required. Get the connection string from Supabase Dashboard > Settings > Database');
}

const client = postgres(connectionString, {
  ssl: 'require',
  max: 10, // Increased connection pool for better performance
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
});

export const db = drizzle(client, { schema });
export { schema };
export { client as dbClient }; // Export client for raw SQL queries
