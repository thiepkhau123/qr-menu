import type { VercelRequest, VercelResponse } from '@vercel/node'
import mysql from 'mysql2/promise'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  if (req.method === 'GET') {
    const [rows] = await connection.execute(
      'SELECT * FROM orders ORDER BY id DESC'
    )
    await connection.end()
    return res.json(rows)
  }

  if (req.method === 'POST') {
    const { table_number, items, total } = req.body

    await connection.execute(
      'INSERT INTO orders (table_number, items, total) VALUES (?, ?, ?)',
      [table_number, JSON.stringify(items), total]
    )

    await connection.end()
    return res.json({ message: 'Order saved' })
  }

  res.status(405).end()
}
