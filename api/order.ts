import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { table_number, items, total } = body

    if (!table_number || !items || !total) {
      return res.status(400).json({ error: 'Thiếu dữ liệu: bàn, món ăn hoặc tổng tiền' })
    }

    // Chèn vào bảng 'orders' theo schema của bạn
    const { data, error } = await supabase
      .from('orders')
      .insert({
        table_number: table_number.toString(),
        items: items, // Đây là mảng JSONB chứa chi tiết món
        total: Math.round(total),
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({ success: true, orderId: data.id })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}