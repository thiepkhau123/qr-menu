import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { table_number, items, total } = req.body

    if (!table_number || !items || !total) {
      return res.status(400).json({ error: 'Missing data' })
    }

    const { error } = await supabase
      .from('orders')
      .insert([
        {
          table_number,
          items,
          total,
          status: 'pending',
        },
      ])

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (err: any) {
    console.error('Server error:', err)
    return res.status(500).json({ error: 'Server crashed' })
  }
}
