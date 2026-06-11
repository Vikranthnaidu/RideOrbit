import { pool } from "../config/db";

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export class RefreshTokenRepository {
  /**
   * Save a new refresh token.
   */
  async create(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token, expires_at, created_at;
    `;
    const result = await pool.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  }

  /**
   * Find a refresh token record.
   */
  async findToken(token: string): Promise<RefreshTokenRecord | null> {
    const query = `
      SELECT id, user_id, token, expires_at, created_at
      FROM refresh_tokens
      WHERE token = $1;
    `;
    const result = await pool.query(query, [token]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  /**
   * Delete a specific refresh token (used for token rotation or logging out).
   */
  async deleteToken(token: string): Promise<void> {
    const query = `
      DELETE FROM refresh_tokens
      WHERE token = $1;
    `;
    await pool.query(query, [token]);
  }

  /**
   * Delete all refresh tokens for a user (force logout from all devices).
   */
  async deleteUserTokens(userId: string): Promise<void> {
    const query = `
      DELETE FROM refresh_tokens
      WHERE user_id = $1;
    `;
    await pool.query(query, [userId]);
  }
}
