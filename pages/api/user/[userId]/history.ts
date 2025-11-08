import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const id = Number(userId);
    if (isNaN(id)) throw new Error("Invalid userId");

    // Query last 5 history items for this user
    const historyItems = await prisma.tblUserHistory.findMany({
      where: { user_id: id },
      orderBy: { hDateTime: "desc" },
      take: 5,
    });

    // Map for client-friendly format
    const mappedHistory = historyItems.map((item) => ({
      id: item.id.toString(),
      path: item.path,
      hDateTime: item.hDateTime,
      accountId: item.account_id?.toString() ?? null,
    }));

    res.status(200).json(mappedHistory);
  } catch (err) {
    console.error("Error fetching user history:", err);
    res.status(500).json({ error: "Failed to fetch user history" });
  }
}
