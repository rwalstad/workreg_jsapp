// pages/api/user/[userId]/account.ts
// pages/api/user/[userId]/account.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../../lib/dbConn"; // your existing mssql pool
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: "Missing userId" });
    console.log("🔎 API Call: Fetching accounts for userId:", userId);
  const idNum = Number(userId);
  if (isNaN(idNum)) return res.status(400).json({ error: "Invalid userId" });

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("userId", sql.BigInt, idNum)
      .query(`
        SELECT 
          a.id AS account_id,
          a.name,
          a.last_activity,
          au.user_id
        FROM Workreg.tblAccountUser au
        JOIN Workreg.tblAccount a ON a.id = au.account_id
        WHERE au.user_id = @userId
        ORDER BY a.id DESC
      `);

    const accounts = result.recordset;
        console.log("✅ API Call: Retrieved accounts:", accounts);
    return res.status(200).json(accounts);
  } catch (error) {
    console.error("Failed to fetch user accounts:", error);
    return res.status(500).json({ error: "Server error fetching accounts" });
  }
}
