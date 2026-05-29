import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from ai_engine
dotenv.config({ path: path.resolve(__dirname, '../../ai_engine/.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "db-classinsight-it-18cf.j.aivencloud.com",
  port: parseInt(process.env.DB_PORT || "15183", 10),
  user: process.env.DB_USER || "avnadmin",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "defaultdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
