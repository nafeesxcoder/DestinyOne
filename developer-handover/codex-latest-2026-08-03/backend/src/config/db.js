import mysql from "mysql2/promise";

const hasDatabaseConfig =
  Boolean(process.env.MYSQL_HOST) &&
  Boolean(process.env.MYSQL_USER) &&
  Boolean(process.env.MYSQL_DATABASE);

export const pool = hasDatabaseConfig
  ? mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  : null;

export const databaseMode = pool ? "mysql" : "preview";

export async function query(sql, values = []) {
  if (!pool) {
    throw new Error("MySQL is not configured.");
  }

  const [rows] = await pool.execute(sql, values);
  return rows;
}
