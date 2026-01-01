import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Order = {
  id: string
  table_number: string
  total: number
  status: string
  created_at: string
}

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([])

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    setOrders(data || [])
  }

  useEffect(() => {
    loadOrders()

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => loadOrders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const done = async (id: string) => {
    await supabase
      .from('orders')
      .update({ status: 'done' })
      .eq('id', id)

    loadOrders()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👨‍🍳 BẾP</h1>

      {orders.map(o => (
        <div
          key={o.id}
          className="border p-4 mb-3 rounded"
        >
          <div className="flex justify-between">
            <strong>Bàn {o.table_number}</strong>
            <span>{o.total.toLocaleString()}đ</span>
          </div>

          <p className="text-sm text-gray-500">
            {new Date(o.created_at).toLocaleTimeString()}
          </p>

          {o.status !== 'done' ? (
            <button
              onClick={() => done(o.id)}
              className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
            >
              Hoàn thành
            </button>
          ) : (
            <span className="text-green-600 font-bold">
              ✔ Xong
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
