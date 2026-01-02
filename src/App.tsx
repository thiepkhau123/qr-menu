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
      // Lấy danh sách món ăn
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name')
      setMenu(menuData || [])
      
      // Lấy lịch sử đơn của bàn
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('table_number', tableNum)
        .order('created_at', { ascending: false })
      setMyOrders(orderData || [])
    }

    fetchData()

    // Realtime: Cập nhật đơn hàng khi có thay đổi từ DB
    const channel = supabase.channel('order-update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const totalPrice = menu.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0)

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return alert('Giỏ hàng đang trống!')
    setIsOrdering(true)
    try {
      const { error } = await supabase.from('orders').insert([{
        table_number: table,
        total: totalPrice,
        status: 'pending',
        items: menu
          .filter(p => cart[p.id])
          .map(p => ({
            name: p.name, 
            qty: cart[p.id], 
            price: p.price, 
            // Chỉ gửi cấp độ nếu món đó là Mì Cay
            level: p.name.toLowerCase().includes('mì cay') ? (spicyLevels[p.id] || 0) : null
          }))
      }])
      if (error) throw error
      alert('🚀 Đơn hàng đã được gửi! Chờ bếp xíu nhé.')
      setCart({}); setSpicyLevels({})
    } catch (err: any) { 
      alert('Lỗi: ' + err.message) 
    } finally { 
      setIsOrdering(false) 
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32 font-sans relative">
      {/* HEADER */}
      <header className="p-4 bg-white sticky top-0 flex justify-between items-center z-20 border-b shadow-sm">
        <h1 className="font-black text-orange-600 italic text-xl tracking-tighter">MÌ CAY 🌶️</h1>
        <button 
          onClick={() => setShowHistory(true)} 
          className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-black shadow-sm"
        >
          ĐƠN ĐÃ ĐẶT ({myOrders.length})
        </button>
      </header>

      {/* DANH SÁCH MÓN ĂN */}
      <main className="p-4 space-y-4">
        {menu.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex gap-4">
              <img 
                src={p.image_url || 'https://via.placeholder.com/150'} 
                className="w-24 h-24 object-cover rounded-2xl bg-gray-50 shadow-inner" 
                alt={p.name} 
              />
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg leading-tight">{p.name}</p>
                <p className="text-orange-600 font-black text-xl mt-1">{p.price.toLocaleString()}đ</p>
              </div>
            </div>

            {/* CHỈ HIỆN CẤP ĐỘ NẾU TÊN MÓN CÓ CHỮ "MÌ CAY" */}
            {p.name.toLowerCase().includes('mì cay') && (
              <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                <p className="text-[10px] text-orange-400 font-black mb-2 uppercase tracking-widest">Chọn mức độ cay:</p>
                <div className="flex justify-between gap-1">
                  {[0,1,2,3,4,5,6,7].map(l => (
                    <button 
                      key={l} 
                      onClick={() => setSpicyLevels({...spicyLevels, [p.id]: l})} 
                      className={`flex-1 h-8 rounded-lg text-xs font-black transition-all ${ 
                        (spicyLevels[p.id] || 0) === l 
                        ? 'bg-red-600 text-white shadow-md scale-110' 
                        : 'bg-white text-gray-400 border border-gray-100'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-1">
               <span className="text-xs text-gray-400 italic">
                {cart[p.id] > 0 ? `Đang chọn: ${cart[p.id]}` : ''}
               </span>
               <div className="flex items-center gap-2">
                 {cart[p.id] > 0 && (
                    <button 
                      onClick={() => setCart({...cart, [p.id]: cart[p.id] - 1})}
                      className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-xl"
                    >-</button>
                 )}
                 <button 
                  onClick={() => setCart({...cart, [p.id]: (cart[p.id]||0)+1})} 
                  className="bg-orange-600 text-white px-6 py-2 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 active:scale-95 transition-transform"
                 >
                  {cart[p.id] > 0 ? cart[p.id] : '+ THÊM'}
                 </button>
               </div>
            </div>
          </div>
        ))}
      </main>

      {/* POPUP LỊCH SỬ ĐƠN HÀNG */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-in fade-in duration-300" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full rounded-t-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="font-black text-xl mb-6 flex justify-between items-center">
              <span>ĐƠN CỦA BẠN 📋</span>
              <span className="text-sm bg-gray-100 px-3 py-1 rounded-lg">BÀN {table}</span>
            </h2>
            <div className="space-y-6 overflow-y-auto max-h-[50vh] pr-2">
              {myOrders.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Bạn chưa đặt món nào.</p>
              ) : myOrders.map((o, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-2xl relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-black uppercase tracking-widest ${o.status === 'done' ? 'text-green-600' : 'text-orange-500 animate-pulse'}`}>
                      {o.status === 'done' ? '✓ Đã hoàn thành' : '● Bếp đang làm...'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">{new Date(o.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {o.items?.map((it: any, i: number) => (
                      <p key={i} className="text-gray-600 flex justify-between">
                        <span>{it.name} x{it.qty}</span>
                        {it.level !== null && <span className="font-bold text-red-500">Cấp {it.level}</span>}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowHistory(false)}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black mt-6"
            >ĐÓNG</button>
          </div>
        </div>
      )}

      {/* NÚT THANH TOÁN TẠM TÍNH */}
      {totalPrice > 0 && (
        <footer className="fixed bottom-6 left-4 right-4 z-40">
          <button 
            onClick={handleOrder} 
            disabled={isOrdering} 
            className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black flex justify-between px-10 shadow-2xl shadow-black/20 active:scale-95 transition-all disabled:bg-gray-400"
          >
            <span className="uppercase tracking-widest">{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
            <span className="text-orange-400 text-lg">{totalPrice.toLocaleString()}đ</span>
          </button>
        </footer>
      )}
    </div>
  )
}