import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [menu, setMenu] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTable(params.get('table') || 'Mang đi')

    // Lấy menu từ bảng products (hoặc menu_items tùy bạn chọn)
    supabase.from('products').select('*').eq('active', true)
      .then(({ data }) => setMenu(data || []))
  }, [])

  const totalPrice = menu.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0)

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return alert('Giỏ hàng trống!')
    
    setIsOrdering(true)
    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: table,
          total: totalPrice,
          items: menu
            .filter(p => cart[p.id])
            .map(p => ({
              id: p.id,
              name: p.name,
              qty: cart[p.id],
              price: p.price
            }))
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('🎉 Đơn hàng đã được gửi thành công!')
        setCart({})
      } else {
        alert('Lỗi: ' + result.error)
      }
    } catch (err) {
      alert('Lỗi kết nối server!')
    } finally {
      setIsOrdering(false)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24">
      <header className="p-4 bg-white shadow-sm sticky top-0 flex justify-between items-center">
        <h1 className="font-bold text-orange-600 text-xl">QR Menu</h1>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">Bàn {table}</span>
      </header>

      <main className="p-4 space-y-3">
        {menu.map(p => (
          <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-orange-600 font-bold">{p.price.toLocaleString()}đ</div>
            </div>
            <div className="flex items-center gap-3">
              {cart[p.id] > 0 && (
                <button onClick={() => setCart({...cart, [p.id]: cart[p.id] - 1})} className="w-8 h-8 rounded-full border border-gray-300">-</button>
              )}
              {cart[p.id] > 0 && <span className="font-bold">{cart[p.id]}</span>}
              <button onClick={() => setCart({...cart, [p.id]: (cart[p.id] || 0) + 1})} className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold">+</button>
            </div>
          </div>
        ))}
      </main>

      {totalPrice > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button 
            disabled={isOrdering}
            onClick={handleOrder}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold flex justify-between px-6 active:scale-95 transition-transform disabled:bg-gray-400"
          >
            <span>{isOrdering ? 'Đang gửi...' : 'ĐẶT MÓN'}</span>
            <span>{totalPrice.toLocaleString()}đ</span>
          </button>
        </footer>
      )}
    </div>
  )
}