//srvazure.js

const config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || 'azure_workreg',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASS || '',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: true
  }
};

module.exports = config;