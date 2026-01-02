import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  is_available: boolean;
  category: string; // Cột danh mục mới
}

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([]) // Danh sách các loại món
  const [selectedCat, setSelectedCat] = useState('Tất cả') // Danh mục đang chọn
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [spicyLevels, setSpicyLevels] = useState<Record<string, number>>({})
  const [orderNote, setOrderNote] = useState('')
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTable(params.get('table') || 'Mang đi')

    const fetchData = async () => {
      const { data: menuData } = await supabase.from('menu_items').select('*').eq('is_available', true).order('name')
      if (menuData) {
        setMenu(menuData)
        // Tự động trích xuất danh sách danh mục duy nhất từ menu
        const uniqueCats = ['Tất cả', ...new Set(menuData.map((item: any) => item.category || 'Khác'))]
        setCategories(uniqueCats)
      }
      
      const { data: orderData } = await supabase.from('orders').select('*').eq('table_number', params.get('table') || 'Mang đi').order('created_at', { ascending: false })
      setMyOrders(orderData || [])
    }
    fetchData()
  }, [])

  // Logic lọc kép: Theo Danh mục + Theo Tìm kiếm
  const filteredMenu = menu.filter(item => {
    const matchCat = selectedCat === 'Tất cả' || item.category === selectedCat
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

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
      alert('🚀 Đã gửi đơn thành công!')
      setCart({}); setSpicyLevels({}); setOrderNote(''); setSearchTerm('')
    } catch (err: any) { alert(err.message) } finally { setIsOrdering(false) }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-44 font-sans p-4">
      {/* HEADER & HISTORY */}
      <header className="flex justify-between items-center mb-4">
        <h1 className="font-black text-orange-600 italic text-2xl tracking-tighter">NHƯ NGỌC QUÁN 🌶️</h1>
        <button onClick={() => setShowHistory(true)} className="bg-white px-4 py-2 rounded-2xl shadow-sm text-xs font-bold border">
          ĐƠN ĐÃ ĐẶT ({myOrders.length})
        </button>
      </header>

      {/* SEARCH BAR */}
      <div className="relative mb-4">
        <input 
          type="text" placeholder="Bạn muốn ăn gì hôm nay?" 
          className="w-full p-4 pl-10 bg-white rounded-2xl shadow-sm border-none text-sm focus:ring-2 focus:ring-orange-500"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-4">🔍</span>
      </div>

      {/* CATEGORY TABS (MỚI) */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${selectedCat === cat ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-500 border'}`}
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
              <img src={p.image_url} className="w-20 h-20 object-cover rounded-2xl bg-gray-50" alt="" />
              <div className="flex-1">
                <p className="font-bold text-gray-800 leading-tight">{p.name}</p>
                <p className="text-orange-600 font-black text-lg">{p.price.toLocaleString()}đ</p>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">{p.category}</span>
              </div>
            </div>

            {(p.name.toLowerCase().includes('mì') || p.name.toLowerCase().includes('mỳ')) && (
              <div className="bg-orange-50/50 p-3 rounded-2xl mb-3 border border-orange-100">
                <div className="flex justify-between gap-1">
                  {[0,1,2,3,4,5,6,7].map(l => (
                    <button key={l} onClick={() => setSpicyLevels({...spicyLevels, [p.id]: l})} 
                      className={`flex-1 h-8 rounded-lg text-xs font-black ${(spicyLevels[p.id] || 0) === l ? 'bg-red-600 text-white' : 'bg-white border text-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setCart({...cart, [p.id]: (cart[p.id]||0)+1})} 
              className={`w-full py-3 rounded-xl font-black text-orange-600 text-sm transition-all ${cart[p.id] > 0 ? 'bg-green-600 text-white' : 'bg-gray-900 text-white'}`}
            >
              {cart[p.id] > 0 ? `ĐÃ THÊM (${cart[p.id]})` : '+ THÊM VÀO GIỎ HÀNG'}
            </button>
          </div>
        ))}
      </main>

      {/* BOTTOM ORDER PANEL */}
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t rounded-t-[2.5rem] shadow-2xl z-50">
          <textarea 
            placeholder="Ghi chú (Ví dụ: Không hành, lấy thêm đũa...)"
            className="w-full p-3 bg-gray-50 rounded-xl text-sm border-none mb-3 focus:ring-1 focus:ring-orange-200"
            rows={2} value={orderNote} onChange={(e) => setOrderNote(e.target.value)}
          />
          <button onClick={handleOrder} disabled={isOrdering} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-lg shadow-orange-200">
            <span>{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
            <span>{totalPrice.toLocaleString()}đ</span>
          </button>
        </div>
      )}
    </div>
  )
  {/* Giao diện Popup Lịch sử đơn hàng */}
{showHistory && (
  <div className="fixed inset-0 bg-black/60 z-[60] flex items-end animate-in fade-in duration-300" onClick={() => setShowHistory(false)}>
    <div 
      className="bg-white w-full rounded-t-[2.5rem] p-8 max-h-[85vh] overflow-y-auto shadow-2xl" 
      onClick={e => e.stopPropagation()}
    >
      <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-black text-2xl uppercase tracking-tighter">Đơn đã đặt 📋</h2>
        <button onClick={() => setShowHistory(false)} className="text-gray-400 text-xl">✕</button>
      </div>

      {myOrders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 italic">Bạn chưa có đơn hàng nào tại bàn này.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myOrders.map((o, idx) => (
            <div key={idx} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                    o.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {o.status === 'done' ? '● Đã hoàn thành' : '● Đang chế biến'}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">
                    {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <p className="font-black text-orange-600">{o.total.toLocaleString()}đ</p>
              </div>

              <div className="space-y-1 border-t border-dashed border-gray-200 pt-3">
                {o.items?.map((it: any, i: number) => (
                  <p key={i} className="text-sm font-medium text-gray-700">
                    <span className="text-orange-600 font-bold">{it.qty}x</span> {it.name}
                    {it.level !== null && <span className="ml-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-black">CẤP {it.level}</span>}
                  </p>
                ))}
              </div>
              
              {o.note && (
                <p className="mt-3 text-[11px] text-gray-500 italic bg-white p-2 rounded-xl">
                  " {o.note} "
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => setShowHistory(false)} 
        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black mt-8 shadow-lg active:scale-95 transition-all"
      >
        QUAY LẠI MENU
      </button>
    </div>
  </div>
)}
}