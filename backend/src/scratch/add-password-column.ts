import { pool } from "../config/db";

async function migrate() {
  console.log("🚀 Running database migration to clean up 'password_hash' and verify 'password' column...");
  try {
    // 1. Drop password_hash column if it exists
    await pool.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
    `);
    console.log("🗑️ Dropped column 'password_hash' if it existed.");

    // 2. Check if password column already exists
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password';
    `);

    if (checkRes.rows.length > 0) {
      console.log("ℹ️ Column 'password' already exists on 'users' table.");
    } else {
      await pool.query(`
        ALTER TABLE users ADD COLUMN password VARCHAR(255);
      `);
      console.log("✅ Column 'password' successfully added to 'users' table.");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    console.log("🔌 Database connection closed.");
  }
}

migrate();
