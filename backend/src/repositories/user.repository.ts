import { pool } from "../config/db";
import { PoolClient } from "pg";

export interface UserRecord {
  id: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  phone: string;
  email: string | null;
  name: string;
  photo_url: string | null;
  rating: string; // postgres numeric is returned as string in pg client
  trips_count: number;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  created_at: Date;
  password: string | null;
}

export class UserRepository {
  /**
   * Find user by phone number.
   */
  async findByPhone(phone: string): Promise<UserRecord | null> {
    const query = `
      SELECT id, role, phone, email, name, photo_url, rating, trips_count, status, created_at, password
      FROM users
      WHERE phone = $1;
    `;
    const result = await pool.query(query, [phone]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  /**
   * Find user by ID.
   */
  async findById(id: string): Promise<UserRecord | null> {
    const query = `
      SELECT id, role, phone, email, name, photo_url, rating, trips_count, status, created_at, password
      FROM users
      WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  /**
   * Create a new user. Accepts an optional PoolClient to run inside a transaction.
   */
  async create(
    user: {
      phone: string;
      name: string;
      role: "PASSENGER" | "DRIVER" | "ADMIN";
      email?: string | null;
      password?: string | null;
    },
    client?: PoolClient
  ): Promise<UserRecord> {
    const db = client || pool;
    const query = `
      INSERT INTO users (phone, name, role, email, status, password)
      VALUES ($1, $2, $3, $4, 'ACTIVE'::user_status, $5)
      RETURNING id, role, phone, email, name, photo_url, rating, trips_count, status, created_at, password;
    `;
    const values = [user.phone, user.name, user.role, user.email || null, user.password || null];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update user status (ACTIVE, SUSPENDED, DEACTIVATED).
   */
  async updateStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"): Promise<void> {
    const query = `
      UPDATE users
      SET status = $1::user_status
      WHERE id = $2;
    `;
    await pool.query(query, [status, id]);
  }
}
