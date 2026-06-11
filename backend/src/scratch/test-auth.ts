import app from "../app";
import { pool } from "../config/db";

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test numbers
const PASSENGER_PHONE = "+919999999999";
const DRIVER_PHONE = "+918888888888";

async function cleanup() {
  console.log("🧹 Cleaning up test database records...");
  await pool.query(`
    DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE phone IN ($1, $2));
  `, [PASSENGER_PHONE, DRIVER_PHONE]);
  await pool.query(`
    DELETE FROM driver_profiles WHERE user_id IN (SELECT id FROM users WHERE phone IN ($1, $2));
  `, [PASSENGER_PHONE, DRIVER_PHONE]);
  await pool.query(`
    DELETE FROM users WHERE phone IN ($1, $2);
  `, [PASSENGER_PHONE, DRIVER_PHONE]);
  await pool.query(`
    DELETE FROM otp_verifications WHERE phone IN ($1, $2);
  `, [PASSENGER_PHONE, DRIVER_PHONE]);
  console.log("✅ Cleanup complete.");
}

async function getLatestOtp(phone: string): Promise<string> {
  const result = await pool.query(`
    SELECT otp FROM otp_verifications 
    WHERE phone = $1 
    ORDER BY created_at DESC 
    LIMIT 1;
  `, [phone]);
  if (result.rows.length === 0) {
    throw new Error(`No OTP found for phone ${phone}`);
  }
  return result.rows[0].otp;
}

async function runTests() {
  await cleanup();

  // Start Server
  const server = app.listen(TEST_PORT, () => {
    console.log(`🚀 Test server listening on port ${TEST_PORT}`);
  });

  try {
    // ----------------------------------------------------
    // SCENARIO 1: Request OTP for passenger
    // ----------------------------------------------------
    console.log("\n--- Scenario 1: Request OTP (Passenger) ---");
    const sendRes = await fetch(`${BASE_URL}/api/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: PASSENGER_PHONE }),
    });
    const sendData: any = await sendRes.json();
    console.log("Response:", sendData);
    if (!sendData.success) throw new Error("Send OTP failed");

    // Fetch the OTP directly from DB
    const passengerOtp = await getLatestOtp(PASSENGER_PHONE);
    console.log(`Retrieved OTP from DB: ${passengerOtp}`);

    // ----------------------------------------------------
    // SCENARIO 2: Verify OTP (Unregistered)
    // ----------------------------------------------------
    console.log("\n--- Scenario 2: Verify OTP (Unregistered Passenger) ---");
    const verifyRes = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: PASSENGER_PHONE, otp: passengerOtp }),
    });
    const verifyData: any = await verifyRes.json();
    console.log("Response:", verifyData);
    if (!verifyData.success || verifyData.isRegistered) {
      throw new Error("Verify OTP for unregistered user failed");
    }

    // ----------------------------------------------------
    // SCENARIO 3: Register Passenger
    // ----------------------------------------------------
    console.log("\n--- Scenario 3: Register Passenger ---");
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: PASSENGER_PHONE,
        otp: passengerOtp,
        password: "password123",
        name: "Alice Passenger",
        role: "PASSENGER",
        email: "alice@example.com",
      }),
    });
    const registerData: any = await registerRes.json();
    console.log("Response:", registerData);
    if (!registerData.success || !registerData.accessToken || !registerData.refreshToken) {
      throw new Error("Registration failed");
    }
    const passengerAccessToken = registerData.accessToken;
    let passengerRefreshToken = registerData.refreshToken;

    // ----------------------------------------------------
    // SCENARIO 4: Get Profile (Me)
    // ----------------------------------------------------
    console.log("\n--- Scenario 4: Get Passenger Profile (Me) ---");
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${passengerAccessToken}`,
      },
    });
    const meData: any = await meRes.json();
    console.log("Response:", meData);
    if (!meData.success || meData.user.name !== "Alice Passenger") {
      throw new Error("Get profile failed");
    }

    // ----------------------------------------------------
    // SCENARIO 5: Verify OTP (Registered - direct login)
    // ----------------------------------------------------
    console.log("\n--- Scenario 5: Direct Login (Verify OTP for Registered User) ---");
    // Request new OTP
    await fetch(`${BASE_URL}/api/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: PASSENGER_PHONE }),
    });
    const loginOtp = await getLatestOtp(PASSENGER_PHONE);
    const loginRes = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: PASSENGER_PHONE, otp: loginOtp }),
    });
    const loginData: any = await loginRes.json();
    console.log("Response:", loginData);
    if (!loginData.success || !loginData.isRegistered || !loginData.accessToken) {
      throw new Error("Direct login failed");
    }

    // ----------------------------------------------------
    // SCENARIO 6: Register Driver (Transactional)
    // ----------------------------------------------------
    console.log("\n--- Scenario 6: Register Driver (Transactional) ---");
    await fetch(`${BASE_URL}/api/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: DRIVER_PHONE }),
    });
    const driverOtp = await getLatestOtp(DRIVER_PHONE);
    await fetch(`${BASE_URL}/api/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: DRIVER_PHONE, otp: driverOtp }),
    });
    
    // Register as driver
    const driverRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: DRIVER_PHONE,
        otp: driverOtp,
        password: "password123",
        name: "Bob Driver",
        role: "DRIVER",
        licenseNo: "DL-8888888",
      }),
    });
    const driverRegData: any = await driverRegRes.json();
    console.log("Response:", driverRegData);
    if (!driverRegData.success || driverRegData.user.role !== "DRIVER") {
      throw new Error("Driver registration failed");
    }

    // Verify driver profile was created in DB
    const driverProfileCheck = await pool.query("SELECT * FROM driver_profiles WHERE user_id = $1", [driverRegData.user.id]);
    console.log("Driver Profile in DB:", driverProfileCheck.rows[0]);
    if (driverProfileCheck.rows.length === 0 || driverProfileCheck.rows[0].license_no !== "DL-8888888") {
      throw new Error("Driver profile database record missing or incorrect");
    }

    // ----------------------------------------------------
    // SCENARIO 7: Refresh Token (Rotation)
    // ----------------------------------------------------
    console.log("\n--- Scenario 7: Refresh Token Rotation ---");
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: passengerRefreshToken }),
    });
    const refreshData: any = await refreshRes.json();
    console.log("Response:", refreshData);
    if (!refreshData.success || !refreshData.accessToken || !refreshData.refreshToken) {
      throw new Error("Token refresh failed");
    }
    const newPassengerRefreshToken = refreshData.refreshToken;

    // Verify old refresh token is revoked
    const oldTokenCheck = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [passengerRefreshToken]);
    console.log("Old token in DB (should be empty):", oldTokenCheck.rows);
    if (oldTokenCheck.rows.length > 0) {
      throw new Error("Old refresh token was not deleted during rotation");
    }

    // ----------------------------------------------------
    // SCENARIO 8: Logout
    // ----------------------------------------------------
    console.log("\n--- Scenario 8: Logout ---");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newPassengerRefreshToken }),
    });
    const logoutData: any = await logoutRes.json();
    console.log("Response:", logoutData);
    if (!logoutData.success) {
      throw new Error("Logout failed");
    }

    // Verify refresh token is deleted
    const tokenCheck = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [newPassengerRefreshToken]);
    console.log("RefreshToken in DB (should be empty):", tokenCheck.rows);
    if (tokenCheck.rows.length > 0) {
      throw new Error("Refresh token was not deleted during logout");
    }

    console.log("\n🎉 All scenarios passed successfully!");
  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error);
    process.exitCode = 1;
  } finally {
    // Close server and pool
    server.close(() => {
      console.log("💤 Test server closed.");
    });
    await cleanup();
    pool.end();
    console.log("🔌 Database pool closed.");
  }
}

runTests();
