// Import your database client library, e.g., pg for PostgreSQL
import { Client } from 'pg';

// This is a very basic check.
// You might want to implement a more robust check depending on your needs.
export async function checkDatabaseConnection() {
  try {
    const client = new Client({
      // Your database connection information
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    // Perform a simple query to check if the connection is successful
    const res = await client.query('SELECT 1');
    await client.end();

    // If the query is successful, then the database connection is good
    return res ? true : false;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
