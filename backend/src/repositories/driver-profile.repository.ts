import { PoolClient } from "pg";

export interface DriverProfileRecord {
  user_id: string;
  license_no: string;
  license_expiry: Date | null;
  license_url: string | null;
  dob: Date | null;
  address: string | null;
  language: any | null;
  verified_at: Date | null;
  verification_status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  online_since: Date | null;
  current_lat: number | null;
  current_lng: number | null;
  created_at: Date;
}

export class DriverProfileRepository {
  /**
   * Create a basic driver profile. Runs inside a database transaction.
   */
  async create(
    client: PoolClient,
    profile: {
      userId: string;
      licenseNo: string;
    }
  ): Promise<DriverProfileRecord> {
    const query = `
      INSERT INTO driver_profiles (user_id, license_no, verification_status)
      VALUES ($1, $2, 'PENDING'::verification_status_enum)
      RETURNING user_id, license_no, license_expiry, license_url, dob, address, language, verified_at, verification_status, online_since, current_lat, current_lng, created_at;
    `;
    const values = [profile.userId, profile.licenseNo];
    const result = await client.query(query, values);
    return result.rows[0];
  }
}
