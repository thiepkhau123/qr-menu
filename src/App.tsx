import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [menu, setMenu] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [loading, setLoading] = useState(true) // Thêm trạng thái tải

useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTable(params.get('table') || 'Mang đi')

    // SỬA DÒNG NÀY: Đổi 'products' thành 'menu_items'
    // Và đổi 'active' thành 'is_available' (theo đúng database của bạn)
    supabase
      .from('menu_items') 
      .select('*')
      .eq('is_available', true) 
      .then(({ data, error }) => {
        if (error) {
          console.error("Lỗi Supabase:", error.message);
        } else {
          setMenu(data || []);
        }
      })
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

  if (loading) return <div className="p-10 text-center">Đang tải thực đơn...</div>
  if (menu.length === 0) return <div className="p-10 text-center text-gray-500">Thực đơn hiện đang trống hoặc chưa bật RLS Policy.</div>

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24 font-sans">
      <header className="p-4 bg-white shadow-sm sticky top-0 flex justify-between items-center z-10">
        <h1 className="font-bold text-orange-600 text-xl uppercase tracking-wider">QR Menu</h1>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">Bàn {table}</span>
      </header>

      <main className="p-4 space-y-3">
        {menu.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-gray-100 transition-all active:scale-95">
            <div className="flex-1">
              <div className="font-bold text-gray-800">{p.name}</div>
              <div className="text-gray-400 text-xs mb-1">{p.description}</div>
              <div className="text-orange-600 font-extrabold">{Number(p.price).toLocaleString()}đ</div>
            </div>
            <div className="flex items-center gap-3 ml-4 bg-gray-50 p-1 rounded-full">
              {cart[p.id] > 0 && (
                <button 
                  onClick={() => setCart({...cart, [p.id]: cart[p.id] - 1})} 
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 border border-gray-100"
                >-</button>
              )}
              {cart[p.id] > 0 && <span className="font-bold text-gray-800 w-4 text-center">{cart[p.id]}</span>}
              <button 
                onClick={() => setCart({...cart, [p.id]: (cart[p.id] || 0) + 1})} 
                className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold shadow-md shadow-orange-200 flex items-center justify-center"
              >+</button>
            </div>
          </div>
        ))}
      </main>

      {totalPrice > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
          <button 
            disabled={isOrdering}
            onClick={handleOrder}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold flex justify-between px-6 shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:bg-gray-400"
          >
            <span className="uppercase tracking-wide">{isOrdering ? 'Đang gửi...' : 'Xác nhận đặt'}</span>
            <span className="text-lg">{totalPrice.toLocaleString()}đ</span>
          </button>
        </footer>
      )}
    </div>
  )
}