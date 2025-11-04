import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.SUPABASE_DB_URL || 
  (process.env.SUPABASE_URL
    ? process.env.SUPABASE_URL.replace(/^https?:\/\//, 'postgresql://postgres:').replace(/\/$/, '')
    : '');

export async function initializeDatabase() {
  if (!connectionString) {
    console.error('Database connection string not found');
    return false;
  }

  const sql = postgres(connectionString, {
    ssl: 'require',
    max: 1,
  });

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'drizzle', '0000_next_mysterio.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the entire migration SQL
    await sql.unsafe(migrationSQL);
    
    console.log('Database initialized successfully');
    return true;
  } catch (error: any) {
    // If tables already exist, that's okay
    if (error?.code === '42P07' || error?.message?.includes('already exists')) {
      console.log('Database tables already exist');
      return true;
    }
    console.error('Database initialization error:', error);
    return false;
  } finally {
    await sql.end();
  }
}
