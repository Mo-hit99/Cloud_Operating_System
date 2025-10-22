import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'docker_os_manager',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

export async function initDatabase() {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL');
    
    // Create tables
    await createTables();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

async function createTables() {
  try {
    // Check if users table exists and get its structure
    const usersTableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);

    if (usersTableCheck.rows.length === 0) {
      // Create new users table with UUID
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pool.query(createUsersTable);
      console.log('Created users table with UUID primary key');
    } else {
      // Check if the existing users table has integer ID
      const existingIdType = usersTableCheck.rows[0].data_type;
      if (existingIdType === 'integer') {
        console.log('Existing users table found with integer ID, migrating to UUID...');
        
        // Migration: Add UUID column, update existing records, then switch primary key
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid()');
        await pool.query('UPDATE users SET new_id = gen_random_uuid() WHERE new_id IS NULL');
        
        // Drop foreign key constraints if they exist
        await pool.query('ALTER TABLE containers DROP CONSTRAINT IF EXISTS containers_user_id_fkey');
        
        // Drop old primary key and rename new_id to id
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey');
        await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS id');
        await pool.query('ALTER TABLE users RENAME COLUMN new_id TO id');
        await pool.query('ALTER TABLE users ADD PRIMARY KEY (id)');
        
        console.log('Migrated users table to UUID primary key');
      }
    }

    // Create containers table with UUID foreign key
    const createContainersTable = `
      CREATE TABLE IF NOT EXISTS containers (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        container_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        os_type VARCHAR(50) NOT NULL,
        image VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'created',
        ports JSONB,
        volumes JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create instances table
    const createInstancesTable = `
      CREATE TABLE IF NOT EXISTS instances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        template_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        container_id VARCHAR(255),
        container_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_started TIMESTAMP WITH TIME ZONE,
        access_url TEXT,
        ports JSONB,
        specs JSONB,
        UNIQUE(container_name)
      );
    `;

    await pool.query(createContainersTable);
    await pool.query(createInstancesTable);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_instances_user_id ON instances(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_instances_template_id ON instances(template_id)');
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}