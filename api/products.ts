import type { VercelRequest, VercelResponse } from '@vercel/node'
import mysql from 'mysql2/promise'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })

    const [rows] = await connection.execute('SELECT * FROM products')

    await connection.end()

    return res.status(200).json(rows)
  } catch (error: any) {
    console.error(error)
    return res.status(500).json({ message: error.message })
  }
}
