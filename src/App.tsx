import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [menu, setMenu] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [spicyLevels, setSpicyLevels] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableNum = params.get('table') || 'Mang đi'
    setTable(tableNum)

    const fetchData = async () => {
      // Lấy menu
      const { data: menuData } = await supabase.from('menu_items').select('*').eq('is_available', true)
      setMenu(menuData || [])
      
      // Lấy đơn của bàn này
      const { data: orderData } = await supabase.from('orders')
        .select('*')
        .eq('table_number', tableNum)
        .order('created_at', { ascending: false })
      setMyOrders(orderData || [])
    }

    fetchData()

    // Realtime cập nhật khi bếp làm xong món
    const channel = supabase.channel('order-update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalPrice = menu.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0)

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return alert('Giỏ hàng trống!')
    setIsOrdering(true)
    try {
      const { error } = await supabase.from('orders').insert([{
        table_number: table,
        total: totalPrice,
        status: 'pending',
        items: menu.filter(p => cart[p.id]).map(p => ({
          name: p.name, qty: cart[p.id], price: p.price, level: spicyLevels[p.id] || 0
        }))
      }])
      if (error) throw error
      alert('🚀 Đã gửi đơn! Chờ xíu nhé.')
      setCart({}); setSpicyLevels({})
    } catch (err: any) { alert(err.message) } finally { setIsOrdering(false) }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32 font-sans">
      <header className="p-4 bg-white sticky top-0 flex justify-between items-center z-20 border-b">
        <h1 className="font-black text-orange-600 italic text-xl">MÌ CAY 🌶️</h1>
        <button onClick={() => setShowHistory(true)} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
          Lịch sử ({myOrders.length})
        </button>
      </header>

      <main className="p-4 space-y-4">
        {menu.map(p => (
          <div key={p.id} className="bg-white p-3 rounded-3xl shadow-sm border flex flex-col gap-3">
            <div className="flex gap-4">
              <img src={p.image_url} className="w-20 h-20 object-cover rounded-2xl bg-gray-100" alt="" />
              <div className="flex-1">
                <p className="font-bold text-gray-800">{p.name}</p>
                <p className="text-orange-600 font-black">{p.price.toLocaleString()}đ</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-2 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Chọn cấp độ:</p>
              <div className="flex justify-between gap-1">
                {[0,1,2,3,4,5,6,7].map(l => (
                  <button key={l} onClick={() => setSpicyLevels({...spicyLevels, [p.id]: l})} 
                    className={`flex-1 h-7 rounded-lg text-xs font-bold ${ (spicyLevels[p.id] || 0) === l ? 'bg-red-600 text-white' : 'bg-white text-gray-400 border'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
               <button onClick={() => setCart({...cart, [p.id]: (cart[p.id]||0)+1})} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md">+ Thêm món</button>
            </div>
          </div>
        ))}
      </main>

      {/* Popup xem đơn hàng */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-black text-lg mb-4">ĐƠN CỦA BẠN (BÀN {table})</h2>
            <div className="space-y-4 overflow-y-auto max-h-60">
              {myOrders.map((o, idx) => (
                <div key={idx} className="border-b pb-2">
                  <div className="flex justify-between text-sm">
                    <span className={o.status === 'done' ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}>
                      {o.status === 'done' ? '✓ Đã xong' : '● Chờ bếp...'}
                    </span>
                    <span className="text-gray-400">{new Date(o.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {totalPrice > 0 && (
        <footer className="fixed bottom-6 left-4 right-4">
          <button onClick={handleOrder} disabled={isOrdering} className="w-full bg-black text-white py-4 rounded-2xl font-black flex justify-between px-8">
            <span>{isOrdering ? 'ĐANG GỬI...' : 'ĐẶT NGAY'}</span>
            <span>{totalPrice.toLocaleString()}đ</span>
          </button>
        </footer>
      )}
    </div>
  )
}