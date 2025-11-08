//lib/getSession.ts

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { CustomSession } from "../app/lib/api"; // Import the CustomSession type

const secretKey = process.env.JWT_SECRET!;
const key = new TextEncoder().encode(secretKey);

export async function getSession(): Promise<CustomSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return { user: undefined };

  try {
    const { payload } = await jwtVerify(token, key);

    return {
      user: {
        id: payload.id ? Number(payload.id) : undefined,   // ✅ convert bigint → number
        email: payload.email as string,
        fname: payload.fname as string | null,
        lname: payload.lname as string | null,
        accessLvl: payload.accessLvl ? Number(payload.accessLvl) : undefined,
        last_activity: payload.last_activity as string | Date
      }
    };
  } catch (err) {
    console.error("Invalid token:", err);
    return { user: undefined };
  }
}