// lib/dbConn.ts

import sql, { ConnectionPool } from 'mssql';

let pool: ConnectionPool | null = null;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST, 
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // Use encryption depending on your DB setup
    trustServerCertificate: true // May be needed for local/dev setups
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export async function getPool(): Promise<ConnectionPool> {
  if (pool) {
    // Return existing pool if already initialized
    if (pool.connected) return pool;
    // If disconnected, try to close and recreate
    try {
      console.log('Closing existing disconnected pool');
      await pool.close();
    } catch {}
  }
  
  // Create new pool and connect
  pool = new sql.ConnectionPool(config);
  await pool.connect();
  return pool;
}
