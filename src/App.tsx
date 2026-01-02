import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [menu, setMenu] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [spicyLevels, setSpicyLevels] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myOrders, setMyOrders] = useState<any[]>([]) // Lưu đơn đã đặt
  const [showOrderHistory, setShowOrderHistory] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableNum = params.get('table') || 'Mang đi'
    setTable(tableNum)

    const fetchMenu = async () => {
      try {
        const { data } = await supabase.from('menu_items').select('*').eq('is_available', true)
        setMenu(data || [])
      } finally { setLoading(false) }
    }

    // Lấy đơn hàng hiện tại của bàn này
    const fetchMyOrders = async () => {
      const { data } = await supabase.from('orders')
        .select('*')
        .eq('table_number', tableNum)
        .order('created_at', { ascending: false })
        .limit(5)
      setMyOrders(data || [])
    }

    fetchMenu()
    fetchMyOrders()

    // Realtime cập nhật trạng thái đơn hàng cho khách
    const channel = supabase.channel('order-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `table_number=eq.${tableNum}` }, fetchMyOrders)
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
      alert('🚀 Đơn hàng đã gửi thành công!')
      setCart({}); setSpicyLevels({})
    } catch (err: any) { alert(err.message) } finally { setIsOrdering(false) }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32 font-sans relative">
      <header className="p-4 bg-white shadow-sm sticky top-0 flex justify-between items-center z-20">
        <h1 className="font-black text-orange-600">MÌ CAY 🌶️</h1>
        <button 
          onClick={() => setShowOrderHistory(true)}
          className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600"
        >
          📋 Đơn đã đặt ({myOrders.length})
        </button>
      </header>

      {/* Danh sách món ăn giữ nguyên như bản trước... */}
      <main className="p-4 space-y-4">
        {menu.map(p => (
           <div key={p.id} className="bg-white p-3 rounded-3xl shadow-sm border flex flex-col gap-3">
             <div className="flex gap-4">
               <img src={p.image_url} className="w-20 h-20 object-cover rounded-2xl" />
               <div className="flex-1">
                 <p className="font-bold">{p.name}</p>
                 <p className="text-orange-600 font-black">{p.price.toLocaleString()}đ</p>
               </div>
             </div>
             <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {[...Array(8)].map((_, i) => (
                    <button key={i} onClick={() => setSpicyLevels({...spicyLevels, [p.id]: i})} className={`w-6 h-6 rounded text-[10px] font-bold ${ (spicyLevels[p.id] || 0) === i ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>{i}</button>
                  ))}
                </div>
                <button onClick={() => setCart({...cart, [p.id]: (cart[p.id]||0)+1})} className="bg-orange-500 text-white w-8 h-8 rounded-full font-bold">+</button>
             </div>
           </div>
        ))}
      </main>

      {/* Popup xem lịch sử đơn hàng */}
      {showOrderHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="font-black text-xl">ĐƠN CỦA BẠN</h2>
              <button onClick={() => setShowOrderHistory(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            {myOrders.map((o, idx) => (
              <div key={idx} className="border-b py-4">
                <div className="flex justify-between">
                  <span className={`font-bold ${o.status === 'done' ? 'text-green-600' : 'text-orange-500'}`}>
                    ● {o.status === 'done' ? 'Đã phục vụ' : 'Đang làm...'}
                  </span>
                  <span className="text-gray-400 text-xs">{new Date(o.created_at).toLocaleTimeString()}</span>
                </div>
                {o.items.map((it: any, i: number) => (
                  <p key={i} className="text-sm text-gray-600">• {it.name} (Cấp {it.level}) x{it.qty}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPrice > 0 && (
        <footer className="fixed bottom-6 left-4 right-4 z-30">
          <button onClick={handleOrder} disabled={isOrdering} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex justify-between px-8">
            <span>{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
            <span>{totalPrice.toLocaleString()}đ</span>
          </button>
        </footer>
      )}
    </div>
  )
}