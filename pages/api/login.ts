//pages/api/login.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPool } from '../../lib/dbConn'; //  path to your pool
import sql from 'mssql';
import { SignJWT } from "jose";

const secretKey = process.env.JWT_SECRET; // Store in Vercel env vars!
const key = new TextEncoder().encode(secretKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const pool = await getPool();
    console.log('Database connection established');
    console.log('23: Attempting login for email:', email);
    // Look up the user by email
   // --- Find user ---
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT TOP 1 
          u.id, u.email, u.fname, u.lname,
          u.password, u.access_level, u.profile_picture
        FROM Workreg.tblUser u
        WHERE u.email = @email
      `);

    if (result.recordset.length === 0)
      return res.status(401).json({ error: 'User not found' });



    const resultWactivity = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT 
          u.id,
          u.email,
          u.fname,
          u.lname,
          u.created,
          u.profile_picture,
          u.access_level,
          u.password,
          a.last_activity
        FROM Workreg.tblUser u
        LEFT JOIN Workreg.tblAccountUser au ON au.user_id = u.id
        LEFT JOIN Workreg.tblAccount a ON a.id = au.account_id
        WHERE u.email = @email
      `);
    const user = resultWactivity.recordset[0];
    console.log('33: User found:', user);
    // Simple password check (replace with hashing for production)
    if (user.password !== password) {
        console.log('37: Invalid password for user:', email, 'Provided:', password, 'Expected:', user.password);
      return res.status(401).json({ error: 'Invalid password' });
    }
    // Update last_activity to current time if account exists
    const currentTime = new Date();
    if (user.id) {
      await pool.request()
        .input('account_id', sql.BigInt, user.id)
        .input('current_time', sql.DateTime, currentTime)
        .query(`
          UPDATE WorkReg.tblAccount 
          SET last_activity = @current_time 
          WHERE id = @account_id
        `);
    }
    console.log('70: Last activity updated for account:', user.id, 'at', currentTime);
    // Get session and save user data

// After password and user checks:
// --- Create JWT ---
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      fname: user.fname,
      lname: user.lname,
      accessLvl: user.access_level,
      last_activity: user.last_activity
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1d")
      .sign(key);

    // --- Send JWT Cookie ---
    res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict; Secure`);

    console.log('100: User logged in and session saved for user:', user.email);
    res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        accessLvl: user.access_level
      }
    });
  } catch (err) {
    console.error('113: Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}