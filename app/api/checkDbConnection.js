import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
// Uncomment below to add Oracle support
// import oracledb from 'oracledb';

async function handler(req, res) {
  const dbType = process.env.DB_TYPE;

  try {
    if (dbType === 'postgresql') {
      const client = new PgClient({
        connectionString: 'postgresql://username:password@host:port/database',
      });
      await client.connect();
      const result = await client.query('SELECT 1');
      await client.end();
      res.status(200).json({ connected: !!result });
    } else if (dbType === 'mysql') {
      const connection = await mysql.createConnection('mysql://username:password@host:port/database');
      const [rows] = await connection.execute('SELECT 1');
      await connection.end();
      res.status(200).json({ connected: Array.isArray(rows) && rows.length > 0 });
    }
    /* Uncomment below to add Oracle support
    else if (dbType === 'oracle') {
      await oracledb.createPool({
        user: 'your_username',
        password: 'your_password',
        connectString: 'host:port/service_name',
      });
      const connection = await oracledb.getConnection();
      const result = await connection.execute('SELECT 1 FROM DUAL');
      await connection.close();
      res.status(200).json({ connected: !!result.rows.length });
    } 
    */
    else {
      console.error('Unsupported DB type');
      res.status(500).json({ error: 'Unsupported DB type' });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection error' });
  }
}

export default handler;
