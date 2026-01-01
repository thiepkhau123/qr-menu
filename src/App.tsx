import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Product = {
  id: string
  name: string
  price: number
}

export default function App() {
  const [menu, setMenu] = useState<Product[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTable(params.get('table') || 'Unknown')

    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .then(({ data }) => setMenu(data || []))
  }, [])

  const add = (p: Product) => {
    setCart({ ...cart, [p.id]: (cart[p.id] || 0) + 1 })
  }

  const total = menu.reduce(
    (s, p) => s + (cart[p.id] || 0) * p.price,
    0
  )

  const order = async () => {
    const { data: order } = await supabase
      .from('orders')
      .insert({ table_number: table, total })
      .select()
      .single()

    if (!order) return

    const items = menu
      .filter(p => cart[p.id])
      .map(p => ({
        order_id: order.id,
        product_name: p.name,
        qty: cart[p.id],
        price: p.price,
      }))

    await supabase.from('order_items').insert(items)

    alert('Đã gửi đơn!')
    setCart({})
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">🪑 Bàn {table}</h2>

      {menu.map(p => (
        <div key={p.id} className="flex justify-between mb-2">
          <span>{p.name}</span>
          <span>{p.price.toLocaleString()}đ</span>
          <button
            className="bg-blue-500 text-white px-2 rounded"
            onClick={() => add(p)}
          >
            +
          </button>
        </div>
      ))}

      <div className="mt-4 font-bold">
        Tổng: {total.toLocaleString()}đ
      </div>

      <button
        onClick={order}
        className="mt-4 w-full bg-green-600 text-white py-2 rounded"
      >
        📤 Đặt món
      </button>
    </div>
  )
}
