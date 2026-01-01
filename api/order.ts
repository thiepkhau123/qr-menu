import type { VercelRequest, VercelResponse } from "@vercel/node";
import mysql from "mysql2/promise";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { table, items, total } = req.body;

  const db = await mysql.createConnection({
    host: process.env.DB_HOST as string,
    user: process.env.DB_USER as string,
    password: process.env.DB_PASS as string,
    database: process.env.DB_NAME as string,
  });

  await db.execute(
    "INSERT INTO orders (table_number, items, total) VALUES (?, ?, ?)",
    [table, JSON.stringify(items), total]
  );

  res.status(200).json({ success: true });
}
