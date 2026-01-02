import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Định nghĩa kiểu dữ liệu để hết báo lỗi màu vàng
interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  is_available: boolean;
}

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [searchTerm, setSearchTerm] = useState('') // State cho tìm kiếm
  const [cart, setCart] = useState<Record<string, number>>({})
  const [spicyLevels, setSpicyLevels] = useState<Record<string, number>>({})
  const [orderNote, setOrderNote] = useState('')
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableNum = params.get('table') || 'Mang đi'
    setTable(tableNum)

    const fetchData = async () => {
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name')
      setMenu(menuData || [])

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('table_number', tableNum)
        .order('created_at', { ascending: false })
      setMyOrders(orderData || [])
    }
    fetchData()
  }, [])

  // Logic lọc món ăn theo thanh tìm kiếm
  const filteredMenu = menu.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPrice = menu.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0)

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return alert('Giỏ hàng trống!')
    setIsOrdering(true)
    try {
      const { error } = await supabase.from('orders').insert([{
        table_number: table,
        total: totalPrice,
        status: 'pending',
        note: orderNote,
        items: menu.filter(p => cart[p.id]).map(p => ({
          name: p.name, 
          qty: cart[p.id], 
          price: p.price, 
          level: (p.name.toLowerCase().includes('mì') || p.name.toLowerCase().includes('mỳ')) ? (spicyLevels[p.id] || 0) : null
        }))
      }])
      if (error) throw error
      alert('🚀 Đã gửi đơn thành công! Chờ bếp xíu nhé.')
      setCart({}); setSpicyLevels({}); setOrderNote(''); setSearchTerm('')
    } catch (err: any) { alert(err.message) } finally { setIsOrdering(false) }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-44 font-sans p-4 relative">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="font-black text-orange-600 italic text-2xl tracking-tighter">MÌ CAY 🌶️</h1>
        <button 
          onClick={() => setShowHistory(true)} 
          className="bg-orange-100 text-orange-700 px-4 py-2 rounded-2xl text-xs font-black shadow-sm"
        >
          ĐƠN ĐÃ ĐẶT ({myOrders.length})
        </button>
      </header>

      {/* THANH TÌM KIẾM */}
      <div className="relative mb-6">
        <input 
          type="text"
          placeholder="Tìm món ăn ngon tại đây..."
          className="w-full p-4 pl-12 bg-white rounded-3xl shadow-sm border-none text-sm focus:ring-2 focus:ring-orange-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-4 opacity-30">🔍</span>
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-4 text-gray-400 font-bold"
          >✕</button>
        )}
      </div>

      {/* DANH SÁCH MÓN ĂN (ĐÃ LỌC) */}
      <main className="space-y-4">
        {filteredMenu.length > 0 ? filteredMenu.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-4 mb-3">
              <img src={p.image_url || 'https://via.placeholder.com/150'} className="w-24 h-24 object-cover rounded-3xl bg-gray-50 shadow-inner" alt="" />
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg leading-tight">{p.name}</p>
                <p className="text-orange-600 font-black text-xl mt-1">{p.price.toLocaleString()}đ</p>
              </div>
            </div>

            {(p.name.toLowerCase().includes('mì') || p.name.toLowerCase().includes('mỳ')) && (
              <div className="bg-orange-50/50 p-3 rounded-2xl mb-3 border border-orange-100">
                <p className="text-[10px] font-black text-orange-400 mb-2 uppercase tracking-widest">Chọn cấp độ cay:</p>
                <div className="flex justify-between gap-1">
                  {[0,1,2,3,4,5,6,7].map(l => (
                    <button key={l} onClick={() => setSpicyLevels({...spicyLevels, [p.id]: l})} 
                      className={`flex-1 h-8 rounded-lg text-xs font-black transition-all ${(spicyLevels[p.id] || 0) === l ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-white border border-gray-100 text-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
               {cart[p.id] > 0 && (
                 <button 
                  onClick={() => setCart({...cart, [p.id]: cart[p.id] - 1})}
                  className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 font-bold text-xl"
                 >-</button>
               )}
               <button 
                onClick={() => setCart({...cart, [p.id]: (cart[p.id]||0)+1})} 
                className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 active:scale-95 transition-all"
               >
                 {cart[p.id] > 0 ? `ĐÃ THÊM ${cart[p.id]}` : '+ THÊM VÀO GIỎ'}
               </button>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 text-gray-400 italic">Không tìm thấy món bạn yêu cầu 😢</div>
        )}
      </main>

      {/* GIỎ HÀNG & GHI CHÚ */}
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t rounded-t-[2.5rem] shadow-2xl z-50">
          <textarea 
            placeholder="Ghi chú cho bếp (Ví dụ: Không hành, ít cay, xin thêm đũa...)"
            className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none mb-3 focus:ring-1 focus:ring-orange-200"
            rows={2}
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
          />
          <button 
            onClick={handleOrder} 
            disabled={isOrdering} 
            className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black flex justify-between px-10 shadow-xl active:scale-95 disabled:bg-gray-400 transition-all"
          >
            <span className="uppercase tracking-widest">{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
            <span className="text-orange-400 text-lg">{totalPrice.toLocaleString()}đ</span>
          </button>
        </div>
      )}

      {/* POPUP LỊCH SỬ (Nếu cần hiển thị chi tiết) */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full rounded-t-[2.5rem] p-8 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="font-black text-xl mb-6 uppercase">Đơn của bạn 📋</h2>
            {myOrders.length === 0 ? <p className="text-gray-400 text-center py-10">Chưa có đơn nào.</p> : 
              myOrders.map((o, idx) => (
                <div key={idx} className="mb-4 p-4 bg-gray-50 rounded-2xl">
                   <div className="flex justify-between text-xs font-bold mb-2">
                     <span className={o.status === 'done' ? 'text-green-600' : 'text-orange-500'}>● {o.status === 'done' ? 'Đã xong' : 'Đang làm'}</span>
                     <span className="text-gray-400">{new Date(o.created_at).toLocaleTimeString()}</span>
                   </div>
                   {o.items?.map((it: any, i: number) => (
                     <p key={i} className="text-sm">{it.name} x{it.qty} {it.level !== null && <span className="text-red-500 font-bold">- Cấp {it.level}</span>}</p>
                   ))}
                </div>
              ))
            }
            <button onClick={() => setShowHistory(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black mt-4">ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  )
}