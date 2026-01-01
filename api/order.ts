export const config = {
  runtime: 'nodejs'
}

import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body

  const { table_number, items, total } = body || {}

  if (!table_number || !items || !total) {
    return res.status(400).json({ error: 'Missing data' })
  }

  const { error } = await supabase.from('orders').insert({
    table_number,
    items,
    total,
    status: 'pending',
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
