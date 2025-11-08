// pages/api/auth/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

interface JWTPayload {
  id: number;
  email: string;
  fname: string | null;
  lname: string | null;
  accessLvl: number;
  last_activity?: string | Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const { payload } = await jwtVerify(token, key) as { payload: JWTPayload };

    return res.status(200).json({
      user: {
        id: payload.id,
        email: payload.email,
        fname: payload.fname,
        lname: payload.lname,
        accessLvl: payload.accessLvl,
        last_activity: payload.last_activity
      }
    });

  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
