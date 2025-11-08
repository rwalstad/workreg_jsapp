import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getPool } from '../../../lib/dbConn'; //  path to your pool
import sql from "mssql";

const secret = process.env.JWT_SECRET!;
const key = new TextEncoder().encode(secret);

// ✅ Helper to get userId from JWT cookie
async function getUserId() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    return Number(payload.id);
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { itemId, path } = body;

  if (!itemId || !path) {
    return NextResponse.json({ error: "Missing itemId or path" }, { status: 400 });
  }

  const pool = await getPool();

  await pool.request()
    .input("user_id", sql.BigInt, userId)
    .input("item_id", sql.VarChar, itemId)
    .input("path", sql.NVarChar, path)
    .query(`
      INSERT INTO Workreg.tblUserHistory (user_id, item_id, path)
      VALUES (@user_id, @item_id, @path)
    `);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = await getPool();

  const result = await pool.request()
    .input("user_id", sql.BigInt, userId)
    .query(`
      SELECT TOP 10 *
      FROM Workreg.tblUserHistory
      WHERE user_id = @user_id
      ORDER BY hDateTime DESC
    `);

  return NextResponse.json({ history: result.recordset });
}
