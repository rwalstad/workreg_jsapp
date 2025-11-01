// config/database.js
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || 'azure_workreg',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASS || '',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 2, // Keep at least 2 connections alive
    idleTimeoutMillis: 300000 // 5 minutes instead of 30 seconds
  },
  connectionTimeout: 30000, // 30 seconds
  requestTimeout: 30000
};

// Create a single connection pool
let pool = null;
let poolPromise = null;

async function getPool() {
  // If pool exists and is connected, return it
  if (pool && pool.connected) {
    return pool;
  }
  
  // If we're already creating a pool, wait for that promise
  if (poolPromise) {
    return poolPromise;
  }
  
  // Create new pool
  poolPromise = (async () => {
    try {
      console.log('Creating new database connection pool...');
      pool = await sql.connect(config);
      console.log('✅ Database connection pool created');
      
      pool.on('error', err => {
        console.error('❌ Database pool error:', err);
        // Don't set pool to null immediately - let it try to reconnect
        if (err.code === 'ECONNRESET' || err.code === 'ESOCKET') {
          console.log('Connection error detected, will recreate pool on next request');
          pool = null;
          poolPromise = null;
        }
      });
      
      return pool;
    } catch (err) {
      console.error('Failed to create database pool:', err);
      pool = null;
      poolPromise = null;
      throw err;
    }
  })();
  
  return poolPromise;
}

async function query(queryText, params = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters if provided
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    return await request.query(queryText);
  } catch (err) {
    console.error('Query error:', err);
    // If connection is closed, reset pool for next request
    if (err.message && err.message.includes('Connection is closed')) {
      console.log('Connection closed error detected, resetting pool');
      pool = null;
      poolPromise = null;
    }
    throw err;
  }
}

// Close pool on app shutdown
async function closePool() {
  if (pool) {
    try {
      await pool.close();
      console.log('Database pool closed');
    } catch (err) {
      console.error('Error closing pool:', err);
    } finally {
      pool = null;
      poolPromise = null;
    }
  }
}

module.exports = {
  sql,
  getPool,
  query,
  closePool,
  config
};