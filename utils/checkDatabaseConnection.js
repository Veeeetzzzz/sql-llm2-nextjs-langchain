import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise'; 

export async function checkDatabaseConnection() {
  const dbType = process.env.DB_TYPE;

  try {
    if (dbType === 'postgresql') {
      const client = new PgClient({
        connectionString: process.env.DATABASE_URL,
      });
      await client.connect();
      const res = await client.query('SELECT 1');
      await client.end();
      return !!res; // Same as `res ? true : false`
    } else if (dbType === 'mysql') {
      const connection = await mysql.createConnection(process.env.DATABASE_URL);
      const [rows] = await connection.execute('SELECT 1');
      await connection.end();
      return Array.isArray(rows) && rows.length > 0;
    } else {
      console.error('Unsupported DB type');
      return false;
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
