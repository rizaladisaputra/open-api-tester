import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Support running from root or scripts dir
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from multiple possible .env locations
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, 'apps/client/.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set.');
  console.error('Please add DATABASE_URL to your root .env file.');
  console.error('Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
  console.error('\nYou can find this in Supabase Dashboard -> Settings -> Database -> Connection string -> URI');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString: DATABASE_URL,
  // Required for Supabase direct connections
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🔄 Connecting to database...');
  try {
    await client.connect();
    console.log('✅ Connected successfully.');

    const sqlFilePath = path.join(rootDir, 'supabase/migrations/001_full_schema.sql');
    console.log(`📄 Reading migration file: ${sqlFilePath}`);
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🚀 Executing SQL migration...');
    console.log('--------------------------------------------------');
    
    // Split the SQL into logical blocks if needed, but pg can execute multiple statements
    await client.query(sql);

    console.log('--------------------------------------------------');
    console.log('🎉 Database migration applied successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.position) {
      console.error(`Error at position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database.');
  }
}

runMigration();
