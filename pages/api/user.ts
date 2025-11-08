//http://localhost:3100/api/user?usr_id=28

import { NextApiRequest, NextApiResponse } from 'next';
//import { PrismaClient } from '@prisma/client';
import prisma from "../../prisma"; // Use the Prisma instance with middleware
// Initialize Prisma
//const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("pages/api/user.ts handler url:", req.url + " query: "+  req.query);
    try {
      const user = await prisma.tblUser.findUnique({
        where: { id: Number(req.query.user_id) }, // Ensure ID is a number
      });
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      return res.status(200).json(user);
    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
// }
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   switch (req.method) {
//     case 'GET':
//       // Handle GET requests
//       console.log("Handle GET from user.ts");
//       await handleGetRequest(req, res);
//       break;
//     case 'POST':
//       console.log("Handle POST from srvRoutes");
//       // Handle POST requests
//       //await handlePostRequest(req, res);
//       break;
//     case 'PUT':
//       console.log("Handle PUT from srvRoutes");
//       //await handlePutRequest(req, res);
//       break;
//     case 'DELETE':
//       console.log("Handle DELETE from srvRoutes");
//       //await handleDeleteRequest(req, res);
//       break;
//     default:
//       res.status(405).end(); // Method Not Allowed
//   }
// }

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  // Example: Get Users or other data based on query parameters.
  console.log("Incoming GET request url:", req.url + " query: "+  req.query);

    // New endpoint for fetching user data from usrTable
    if (req.url?.includes('/get-UserById')) {
      console.log("Handling GET /get-UserById request");
      // New endpoint for fetching user data from usrTable
        const usrId = req.query.usrId as string;
        if (!usrId) {
          return res.status(400).json({ success: false, message: 'User ID is required.' });
        }
        try {
          console.log(`Fetching user data for usrId: ${usrId}`);
            // Convert usrId to BigInt
          const userIdBigInt = BigInt(usrId);
          // Assuming your Prisma client is set up to use a model named "usrTable"
          const userData = await prisma.tblUser.findUnique({
            where: { id: userIdBigInt }
          });
          if (userData) {
            return res.status(200).json(userData);
          } else {
            return res.status(404).json({ success: false, message: 'User not found.' });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          return res.status(500).json({ success: false, message: 'Failed to fetch user data.' });
        }
      }
    }
//Next.js API routes are the standard way to create server-side endpoints that your client-side code can call.
//Move Prisma Logic to API Routes: All your Prisma queries (like prisma.user.findMany()) should be inside your API routes