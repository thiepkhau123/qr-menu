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

  const filteredMenu = menu
    .filter(item => {
      const matchCat = selectedCat === 'Tất cả' || item.category === selectedCat
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchCat && matchSearch
    })
    .sort((a, b) => {
      // Nếu đang chọn một danh mục cụ thể (không phải 'Tất cả'), không cần sắp xếp lại
      if (selectedCat !== 'Tất cả') return 0;

      // Định nghĩa các danh mục ưu tiên
      const priority = ['mì cay', 'lẩu',];

      const aCat = a.category?.toLowerCase() || '';
      const bCat = b.category?.toLowerCase() || '';

      const aIsPriority = priority.some(p => aCat.includes(p));
      const bIsPriority = priority.some(p => bCat.includes(p));

      // Đưa các món ưu tiên lên trước
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });

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
    // Max-w-5xl cho phép hiển thị rộng hơn trên PC
    <div className="max-w-5xl mx-auto min-h-screen bg-gray-50 pb-60 font-sans p-4 relative transition-all">

      {/* HEADER: Gọn gàng trên Mobile, rộng rãi trên Web */}
      <header className="flex flex-row justify-between items-center mb-6 gap-4 sticky top-0 bg-gray-50/80 backdrop-blur-md z-40 py-2">
        <div className="flex flex-col">
          <h1 className="font-black text-orange-600 italic text-xl md:text-3xl tracking-tighter leading-none uppercase">NHƯ NGỌC QUÁN 🌶️</h1>
          <span className="text-[10px] md:text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest bg-white w-fit px-2 py-0.5 rounded-full shadow-sm">Bàn: {table}</span>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="bg-gray-900 text-white px-3 py-2 md:px-6 md:py-3 rounded-2xl shadow-lg text-[10px] md:text-sm font-black active:scale-95 transition-all flex items-center gap-2"
        >
          <span>ĐƠN ĐÃ ĐẶT</span>
          <span className="bg-orange-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]">{myOrders.length}</span>
        </button>
      </header>

      {/* SEARCH & CATEGORY: Group lại cho PC dễ nhìn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1 relative text-gray-400 focus-within:text-orange-500">
          <input
            type="text" placeholder="Tìm món ăn nhanh..."
            className="w-full p-4 pl-12 bg-white rounded-2xl shadow-sm border-none text-sm focus:ring-2 focus:ring-orange-500 text-gray-800"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-4 top-4 text-lg">🔍</span>
        </div>

        <div className="md:col-span-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all uppercase ${selectedCat === cat ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MENU LIST: 1 cột trên Mobile, 2 cột trên Tablet, 3 cột trên Desktop */}
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredMenu.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex gap-4 mb-4">
              <img src={p.image_url} className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-[2rem] bg-gray-50 shadow-inner" alt={p.name} />
              <div className="flex-1">
                <p className="font-extrabold text-gray-800 leading-tight text-base md:text-lg">{p.name}</p>
                <p className="text-orange-600 font-black text-xl mt-1">{p.price.toLocaleString()}đ</p>
                <span className="text-[9px] bg-orange-50 text-orange-400 px-2 py-0.5 rounded-lg font-bold uppercase mt-2 inline-block italic tracking-wider">{p.category}</span>
              </div>
            </div>

            {/* BOX ĐỘ CAY: Tối ưu nút bấm to hơn */}
            {(p.name.toLowerCase().includes('mì') || p.name.toLowerCase().includes('mỳ')) && (
              <div className="bg-orange-50/50 p-3 rounded-[1.5rem] mb-4 border border-orange-100">
                <p className="text-[10px] font-black text-orange-400 mb-2 uppercase tracking-widest text-center">Chọn độ cay (0-7)</p>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(l => (
                    <button key={l} onClick={() => setSpicyLevels({ ...spicyLevels, [p.id]: l })}
                      className={`h-9 rounded-xl text-xs font-black transition-all ${(spicyLevels[p.id] || 0) === l ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-orange-100 text-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto flex items-center gap-2">
              {cart[p.id] > 0 && (
                <button
                  onClick={() => {
                    const newQty = cart[p.id] - 1;
                    if (newQty <= 0) {
                      const newCart = { ...cart }; delete newCart[p.id]; setCart(newCart);
                    } else { setCart({ ...cart, [p.id]: newQty }); }
                  }}
                  className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-600 font-black text-2xl flex items-center justify-center border border-gray-200 active:bg-gray-200 transition-colors"
                >−</button>
              )}

              <button
                onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] || 0) + 1 })}
                className={`flex-1 h-14 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${cart[p.id] > 0 ? 'bg-green-600 text-white' : 'bg-orange-500 text-white shadow-orange-100'
                  } active:scale-95 shadow-lg`}
              >
                {cart[p.id] > 0 ? `SỐ LƯỢNG: ${cart[p.id]}` : 'THÊM VÀO GIỎ'}
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* FOOTER ĐẶT HÀNG: Cố định rộng hết PC nhưng vẫn gọn trên Mobile */}
      {totalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-100 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-3 items-center">
            <textarea
              placeholder="Ghi chú thêm... (ví dụ: Không cay, nhiều hành)"
              className="w-full md:flex-1 p-4 bg-gray-100 rounded-2xl text-sm border-none focus:ring-2 focus:ring-orange-200 resize-none h-14 md:h-16"
              value={orderNote} onChange={(e) => setOrderNote(e.target.value)}
            />
            <button
              onClick={handleOrder}
              disabled={isOrdering}
              className="w-full md:w-auto md:min-w-[300px] bg-orange-600 text-white py-4 md:py-5 rounded-2xl font-black flex justify-between px-8 shadow-xl shadow-orange-200 active:scale-95 transition-all"
            >
              <span className="tracking-widest">{isOrdering ? 'ĐANG GỬI...' : 'XÁC NHẬN ĐẶT'}</span>
              <span className="bg-white/20 px-3 rounded-lg ml-4">{totalPrice.toLocaleString()}đ</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP LỊCH SỬ: Tối ưu hiển thị trung tâm trên Web */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full md:max-w-2xl rounded-t-[3rem] md:rounded-[3rem] p-6 md:p-10 max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-2xl uppercase italic tracking-tighter">Lịch sử đặt món</h2>
              <button onClick={() => setShowHistory(false)} className="bg-gray-100 w-10 h-10 rounded-full font-bold text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
            </div>

            {myOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400 italic bg-gray-50 rounded-[2rem] border-2 border-dashed">
                Chưa có đơn hàng nào tại bàn này.
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((o, idx) => (
                  <div key={idx} className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase shadow-sm ${o.status === 'done' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                        {o.status === 'done' ? '● Hoàn tất' : '● Đang làm'}
                      </span>
                      <span className="text-[11px] text-gray-400 font-bold bg-white px-3 py-1 rounded-lg border border-gray-100">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="space-y-2 border-t border-gray-200 pt-4">
                      {o.items?.map((it: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm md:text-base font-bold text-gray-700">
                          <span>{it.qty}x {it.name} {it.level !== null && <span className="text-red-500 text-[10px] ml-1 bg-red-50 px-2 py-0.5 rounded-full uppercase">Cấp {it.level}</span>}</span>
                          <span className="text-gray-400 font-medium">{(it.price * it.qty).toLocaleString()}đ</span>
                        </div>
                      ))}
                    </div>
                    {o.note && <p className="text-[12px] text-gray-400 italic mt-4 p-3 bg-white rounded-xl border border-gray-50">Ghi chú: {o.note}</p>}
                    <div className="mt-4 text-right font-black text-orange-600 text-lg border-t border-gray-100 pt-3">Tổng: {o.total.toLocaleString()}đ</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}