import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  is_available: boolean;
  category: string;
}

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCat, setSelectedCat] = useState('Tất cả')
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [spicyLevels, setSpicyLevels] = useState<Record<string, number>>({})
  const [orderNote, setOrderNote] = useState('')
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // 1. Lấy dữ liệu khi load trang
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableNum = params.get('table') || 'Mang đi'
    setTable(tableNum)

    const fetchData = async () => {
      // Lấy menu
      const { data: menuData } = await supabase.from('menu_items').select('*').eq('is_available', true).order('name')
      if (menuData) {
        setMenu(menuData)
        const uniqueCats = ['Tất cả', ...new Set(menuData.map((item: any) => item.category || 'Khác'))]
        setCategories(uniqueCats)
      }

      // Lấy lịch sử đơn hàng
      const { data: orderData } = await supabase.from('orders').select('*').eq('table_number', tableNum).order('created_at', { ascending: false })
      setMyOrders(orderData || [])
    }
    fetchData()
  }, [])

  // 2. Logic lọc món ăn
  const filteredMenu = menu.filter(item => {
    const matchCat = selectedCat === 'Tất cả' || item.category === selectedCat
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  const totalPrice = menu.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0)

  // 3. Logic đặt hàng
  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return alert('Giỏ hàng trống!')
    setIsOrdering(true)
    try {
      const orderItems = menu.filter(p => cart[p.id]).map(p => ({
        name: p.name,
        qty: cart[p.id],
        price: p.price,
        level: (p.name.toLowerCase().includes('mì') || p.name.toLowerCase().includes('mỳ')) ? (spicyLevels[p.id] || 0) : null
      }))

      const { error } = await supabase.from('orders').insert([{
        table_number: table,
        total: totalPrice,
        status: 'pending',
        note: orderNote,
        items: orderItems
      }])

      if (error) throw error
      
      alert('🚀 Đã gửi đơn thành công!')
      setCart({}); setSpicyLevels({}); setOrderNote(''); setSearchTerm('')
      
      // Cập nhật lại danh sách lịch sử ngay lập tức
      const { data: newData } = await supabase.from('orders').select('*').eq('table_number', table).order('created_at', { ascending: false })
      setMyOrders(newData || [])
      
    } catch (err: any) { 
      alert(err.message) 
    } finally { 
      setIsOrdering(false) 
    }
  }

  // 4. Giao diện chính (Chỉ duy nhất 1 lệnh return)
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-44 font-sans p-4 relative">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h1 className="font-black text-orange-600 italic text-2xl tracking-tighter leading-none">NHƯ NGỌC QUÁN 🌶️</h1>
          <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Bàn: {table}</span>
        </div>
        <button 
          onClick={() => setShowHistory(true)} 
          className="bg-white px-4 py-2 rounded-2xl shadow-sm text-xs font-black border border-gray-100 text-gray-700 active:scale-95 transition-all"
        >
          ĐƠN ĐÃ ĐẶT ({myOrders.length})
        </button>
      </header>

      {/* SEARCH BAR */}
      <div className="relative mb-4 text-gray-400 focus-within:text-orange-500">
        <input 
          type="text" placeholder="Tìm món ăn..." 
          className="w-full p-4 pl-12 bg-white rounded-2xl shadow-sm border-none text-sm focus:ring-2 focus:ring-orange-500 text-gray-800"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-4 text-lg">🔍</span>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${selectedCat === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* MENU LIST */}
      <main className="space-y-4">
        {filteredMenu.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex gap-4 mb-3">
              <img src={p.image_url} className="w-24 h-24 object-cover rounded-3xl bg-gray-50 shadow-inner" alt="" />
              <div className="flex-1">
                <p className="font-bold text-gray-800 leading-tight text-lg">{p.name}</p>
                <p className="text-orange-600 font-black text-xl mt-1">{p.price.toLocaleString()}đ</p>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">{p.category}</span>
              </div>
            </div>

            {/* CHỌN ĐỘ CAY */}
            {(p.name.toLowerCase().includes('mì') || p.name.toLowerCase().includes('mỳ')) && (
              <div className="bg-orange-50/50 p-3 rounded-2xl mb-3 border border-orange-100">
                <p className="text-[10px] font-black text-orange-400 mb-2 uppercase tracking-widest text-center">Chọn độ cay</p>
                <div className="flex justify-between gap-1">
                  {[0,1,2,3,4,5,6,7].map(l => (
                    <button key={l} onClick={() => setSpicyLevels({...spicyLevels, [p.id]: l})} 
                      className={`flex-1 h-8 rounded-lg text-xs font-black transition-all ${(spicyLevels[p.id] || 0) === l ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-white border text-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* NÚT TĂNG GIẢM */}
            <div className="flex items-center gap-2">
              {cart[p.id] > 0 && (
                <button 
                  onClick={() => {
                    const newQty = cart[p.id] - 1;
                    if (newQty <= 0) {
                      const newCart = { ...cart };
                      delete newCart[p.id];
                      setCart(newCart);
                    } else {
                      setCart({ ...cart, [p.id]: newQty });
                    }
                  }}
                  className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 font-black text-xl flex items-center justify-center border border-gray-200 active:scale-90 transition-all"
                >−</button>
              )}

              <button 
                onClick={() => setCart({...cart, [p.id]: (cart[p.id]||0)+1})} 
                className={`flex-1 py-3 h-12 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                  cart[p.id] > 0 ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-orange-500 text-white shadow-lg'
                } active:scale-95`}
              >
                {cart[p.id] > 0 ? `ĐÃ CHỌN: ${cart[p.id]}` : '+ THÊM VÀO GIỎ'}
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* FOOTER ĐẶT HÀNG */}
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t rounded-t-[2.5rem] shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
          <textarea 
            placeholder="Ghi chú (Ví dụ: Không hành, lấy thêm đũa...)"
            className="w-full p-3 bg-gray-50 rounded-xl text-sm border-none mb-3 focus:ring-1 focus:ring-orange-200"
            rows={2} value={orderNote} onChange={(e) => setOrderNote(e.target.value)}
          />
          <button onClick={handleOrder} disabled={isOrdering} className="w-full bg-orange-600 text-white py-5 rounded-[2rem] font-black flex justify-between px-10 shadow-xl shadow-orange-200 active:scale-95 transition-all">
            <span className="tracking-widest">{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
            <span>{totalPrice.toLocaleString()}đ</span>
          </button>
        </div>
      )}

      {/* POPUP LỊCH SỬ (Nằm trong cùng 1 return) */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end animate-in fade-in duration-300" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full rounded-t-[2.5rem] p-8 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl uppercase italic">Lịch sử đặt món 📋</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 font-bold p-2">ĐÓNG</button>
            </div>

            {myOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 italic font-medium border-2 border-dashed border-gray-100 rounded-3xl">
                Bạn chưa có đơn hàng nào tại bàn này.
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((o, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${o.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {o.status === 'done' ? '● Hoàn tất' : '● Đang làm'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="space-y-1 border-t border-gray-100 pt-2 mt-2">
                      {o.items?.map((it: any, i: number) => (
                        <p key={i} className="text-sm font-bold text-gray-700">
                          <span className="text-orange-600">{it.qty}x</span> {it.name} 
                          {it.level !== null && <span className="text-red-500 text-[10px] ml-1 bg-red-50 px-1 rounded">CẤP {it.level}</span>}
                        </p>
                      ))}
                    </div>
                    {o.note && <p className="text-[11px] text-gray-400 italic mt-2">Ghi chú: {o.note}</p>}
                    <p className="mt-2 text-right font-black text-orange-600 border-t border-gray-100 pt-2">{o.total.toLocaleString()}đ</p>
                  </div>
                ))}
              </div>
            )}
            <button 
              onClick={() => setShowHistory(false)} 
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black mt-6"
            >
              QUAY LẠI MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}