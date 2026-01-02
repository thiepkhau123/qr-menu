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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableNum = params.get('table') || 'Mang đi'
    setTable(tableNum)

    const fetchData = async () => {
      const { data: menuData } = await supabase.from('menu_items').select('*').eq('is_available', true).order('name')
      if (menuData) {
        setMenu(menuData)
        const uniqueCats = ['Tất cả', ...new Set(menuData.map((item: any) => item.category || 'Khác'))]
        setCategories(uniqueCats)
      }
      const { data: orderData } = await supabase.from('orders').select('*').eq('table_number', tableNum).order('created_at', { ascending: false })
      setMyOrders(orderData || [])
    }
    fetchData()
  }, [])

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
      alert('🚀 Gửi đơn thành công!')
      setCart({}); setSpicyLevels({}); setOrderNote('');
      const { data: newData } = await supabase.from('orders').select('*').eq('table_number', table).order('created_at', { ascending: false })
      setMyOrders(newData || [])
    } catch (err: any) { alert(err.message) } finally { setIsOrdering(false) }
  }

return (
    // Sử dụng flex-col để quản lý chiều cao tốt hơn
    <div className="max-w-5xl mx-auto min-h-screen bg-gray-50 font-sans relative flex flex-col">
      
      {/* NỘI DUNG CHÍNH - Thêm flex-1 để tự co giãn */}
      <div className="flex-1 p-4 pb-40 md:pb-24"> 
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-6 gap-4 sticky top-0 bg-gray-50/95 backdrop-blur-md z-40 py-2">
          <div className="flex flex-col">
            <h1 className="font-black text-orange-600 italic text-xl md:text-3xl tracking-tighter uppercase">NHƯ NGỌC QUÁN 🌶️</h1>
            <span className="text-[10px] font-bold text-gray-400 bg-white w-fit px-2 py-0.5 rounded-full shadow-sm border border-gray-100 uppercase">Bàn: {table}</span>
          </div>
          <button 
            onClick={() => setShowHistory(true)} 
            className="bg-gray-900 text-white px-4 py-2 rounded-2xl shadow-lg text-[10px] md:text-sm font-black active:scale-95 transition-all"
          >
            ĐƠN ĐÃ ĐẶT ({myOrders.length})
          </button>
        </header>

        {/* SEARCH BAR - Sửa lỗi bị che khi gõ */}
        <div className="relative mb-6 text-gray-400 focus-within:text-orange-500 z-30">
          <input 
            type="text" placeholder="Tìm món ăn nhanh..." 
            className="w-full p-4 pl-12 bg-white rounded-2xl shadow-sm border-none text-sm focus:ring-2 focus:ring-orange-500 text-gray-800 appearance-none"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-4 top-4 text-lg pointer-events-none">🔍</span>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all uppercase ${selectedCat === cat ? 'bg-orange-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* MENU LIST */}
        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenu.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full">
              {/* Hình ảnh và thông tin món (giữ nguyên logic cũ) */}
              <div className="flex gap-4 mb-4">
                <img src={p.image_url} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-[2rem]" alt="" />
                <div className="flex-1">
                  <p className="font-extrabold text-gray-800 leading-tight">{p.name}</p>
                  <p className="text-orange-600 font-black text-lg mt-1">{p.price.toLocaleString()}đ</p>
                </div>
              </div>

              {/* Nút Tăng/Giảm (giữ nguyên logic cũ) */}
              <div className="mt-auto flex items-center gap-2">
                {cart[p.id] > 0 && (
                  <button 
                    onClick={() => { /* Logic trừ món */ }}
                    className="w-12 h-12 rounded-xl bg-gray-100 font-black text-xl flex items-center justify-center border"
                  >−</button>
                )}
                <button 
                  onClick={() => { /* Logic thêm món */ }}
                  className={`flex-1 h-12 rounded-xl font-black text-sm shadow-md ${cart[p.id] > 0 ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}
                >
                  {cart[p.id] > 0 ? `SỐ LƯỢNG: ${cart[p.id]}` : 'THÊM VÀO GIỎ'}
                </button>
              </div>
            </div>
          ))}
        </main>
      </div>

      {/* FOOTER ĐẶT HÀNG - FIX LỖI VỠ LAYOUT MOBILE */}
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 rounded-t-[2.5rem] safe-bottom">
          <div className="max-w-5xl mx-auto">
            {/* Ghi chú: Sử dụng h-12 để tránh choán chỗ quá nhiều khi bàn phím hiện */}
            <textarea 
              placeholder="Ghi chú (Không hành, thêm đũa...)"
              className="w-full p-3 bg-gray-100 rounded-xl text-sm border-none mb-3 focus:ring-1 focus:ring-orange-500 resize-none h-12 md:h-16 transition-all"
              value={orderNote} onChange={(e) => setOrderNote(e.target.value)}
            />
            <button 
              onClick={handleOrder} 
              disabled={isOrdering} 
              className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 active:scale-95 transition-all shadow-lg"
            >
              <span>{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
              <span>{totalPrice.toLocaleString()}đ</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP HISTORY - FIX LỖI CUỘN TRÊN MOBILE */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end md:items-center justify-center transition-opacity" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             {/* Nội dung history... */}
             <button onClick={() => setShowHistory(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black mt-4">QUAY LẠI</button>
          </div>
        </div>
      )}
    </div>
  );
}