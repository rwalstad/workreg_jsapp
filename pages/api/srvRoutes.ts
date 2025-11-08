/*pages/api/srvRoutes.ts
This file, pages/api/srvRoutes.ts, defines a single API route
 that handles multiple different API endpoints based on
 the HTTP method (GET, POST, PUT, DELETE) and the URL path.

 It acts as a centralized entry point for many of your API functionalities.

 # handler() Function:
 This is the main function that Next.js calls when a request comes to this API route.
 It uses a switch statement to determine which function to call
 (handleGetRequest, handlePostRequest, etc.) based on the req.method (the HTTP method of the request).

 If the method is not GET, POST, PUT, or DELETE, it returns a 405 Method Not Allowed error.


 # handleGetRequest() Function:
 This function handles all GET requests to this API route.
 It uses req.url.includes() to check which specific endpoint
 was called (e.g., /get-user-accounts, /get-info-account, etc.).

 Inside each if block, it calls the appropriate function
 (likely from a separate file, like ./queries/queryPipeline.js or ./queries/queryProfile.js)
 to perform the database query or other logic.

 It then sends the response back to the client.


 # handlePostRequest Function:
 Similar to handleGetRequest, this function handles all POST requests.
 It checks the URL path to determine which endpoint was called
 (e.g., /updateAccDetails, /updateProfile) and calls the corresponding function.
 It also handles the logic for updating account details and user profiles.

 # Database Interaction:
 The file uses Prisma (@/lib/prisma) for database interactions in some routes.
 Other routes import functions from separate query files (./queries/...) which likely contain the SQL queries.

 This file handles HTTP requests and interacts with Prisma to fetch data from SQL DB.
It listens for GET requests on  f.ex /api/srvRoutes?usrId=<user_id> and returns user data.
*/

import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from "next";

// Initialize Prisma Client
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      // Handle GET requests
      console.log("Handle GET from srvRoutes");
      await handleGetRequest(req, res);
      break;
    case 'POST':
      console.log("Handle POST from srvRoutes");
      // Handle POST requests
      await handlePostRequest(req, res);
      break;
    case 'PUT':
      console.log("Handle PUT from srvRoutes");
      await handlePutRequest(req, res);
      break;
    case 'DELETE':
      console.log("Handle DELETE from srvRoutes");
      await handleDeleteRequest(req, res);
      break;
    default:
      res.status(405).end(); // Method Not Allowed
  }
}

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
      
      // Existing endpoints remain unchanged...
      if (req.url?.includes('/get-user-accounts')) {
        // ... your existing account logic
      }
      // ... other endpoints
    
      // Fallback to listing users if no path matches
      try {
        const users = await prisma.tblUser.findMany();
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ error: "134: Database query failed" });
      }
    }

async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  if (req.url?.includes('/updateAccDetails')) {

  }
  else if (req.url?.includes('/updateProfile')) {

  }
}

// These functions need to be implemented but can be empty for now
async function handlePutRequest(req: NextApiRequest, res: NextApiResponse) {
  // Implementation needed
  res.status(501).json({ message: 'Not implemented yet' });
}

async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse) {
  // Implementation needed
  res.status(501).json({ message: 'Not implemented yet' });
}