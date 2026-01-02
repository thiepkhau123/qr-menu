import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [menu, setMenu] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [spicyLevels, setSpicyLevels] = useState<Record<string, number>>({})
  const [table, setTable] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTable(params.get('table') || 'Mang đi')

    const fetchMenu = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
        if (error) throw error
        setMenu(data || [])
      } catch (err) {
        console.error("Lỗi:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [])

  const totalPrice = menu.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0)

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return alert('Giỏ hàng trống!')
    setIsOrdering(true)
    try {
      // Gửi trực tiếp lên Supabase (Bỏ qua API trung gian để tránh lỗi 404/500)
      const { error } = await supabase.from('orders').insert([{
        table_number: table,
        total: totalPrice,
        status: 'pending',
        items: menu
          .filter(p => cart[p.id])
          .map(p => ({
            id: p.id,
            name: p.name,
            qty: cart[p.id],
            price: p.price,
            level: spicyLevels[p.id] || 0 // Lưu cấp độ cay
          }))
      }])

      if (error) throw error
      alert('🎉 Đơn hàng đã được gửi! Chờ xíu mì tới liền nha.')
      setCart({})
    } catch (err: any) {
      alert('Lỗi đặt món: ' + err.message)
    } finally {
      setIsOrdering(false)
    }
  }

  if (loading) return <div className="p-10 text-center animate-pulse text-orange-600 font-bold">Đang tải thực đơn...</div>

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32 font-sans">
      <header className="p-4 bg-white/80 backdrop-blur-md shadow-sm sticky top-0 flex justify-between items-center z-20">
        <h1 className="font-black text-orange-600 text-xl tracking-tighter">MÌ CAY 7 CẤP ĐỘ 🌶️</h1>
        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-red-200">BÀN {table}</span>
      </header>

      <main className="p-4 space-y-4">
        {menu.map(p => (
          <div key={p.id} className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex gap-4">
              <img 
                src={p.image_url || 'https://via.placeholder.com/150'} 
                className="w-24 h-24 object-cover rounded-2xl bg-gray-100 shadow-inner"
                alt={p.name}
              />
              <div className="flex-1 py-1">
                <div className="font-bold text-gray-800 text-lg leading-tight">{p.name}</div>
                <div className="text-gray-400 text-xs line-clamp-2 mt-1">{p.description}</div>
                <div className="text-orange-600 font-black text-lg mt-1">{Number(p.price).toLocaleString()}đ</div>
              </div>
            </div>

            {/* PHẦN CHỌN CẤP ĐỘ */}
            <div className="bg-gray-50 p-3 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Chọn cấp độ cay (0-7)</p>
              <div className="flex justify-between gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(level => (
                  <button
                    key={level}
                    onClick={() => setSpicyLevels({...spicyLevels, [p.id]: level})}
                    className={`flex-1 h-8 rounded-lg font-bold text-sm transition-all ${
                      (spicyLevels[p.id] || 0) === level 
                      ? 'bg-red-600 text-white scale-110 shadow-md' 
                      : 'bg-white text-gray-400 border border-gray-100'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* NÚT TĂNG GIẢM */}
            <div className="flex justify-end items-center gap-4 pt-1">
              {cart[p.id] > 0 && (
                <div className="flex items-center gap-4 bg-gray-100 rounded-full px-1">
                  <button onClick={() => setCart({...cart, [p.id]: cart[p.id] - 1})} className="w-8 h-8 rounded-full bg-white text-gray-500 font-bold shadow-sm">-</button>
                  <span className="font-black text-gray-800">{cart[p.id]}</span>
                  <button onClick={() => setCart({...cart, [p.id]: (cart[p.id] || 0) + 1})} className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold shadow-md">+</button>
                </div>
              ) || (
                <button 
                  onClick={() => setCart({...cart, [p.id]: 1})}
                  className="bg-orange-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-orange-100"
                >
                  Thêm món
                </button>
              )}
            </div>
          </div>
        ))}
      </main>

      {totalPrice > 0 && (
        <footer className="fixed bottom-6 left-4 right-4 z-30">
          <button 
            disabled={isOrdering}
            onClick={handleOrder}
            className="w-full bg-gray-900 text-white py-4 rounded-3xl font-black flex justify-between px-8 shadow-2xl active:scale-95 transition-all disabled:bg-gray-400"
          >
            <span className="uppercase tracking-widest">{isOrdering ? 'Đang gửi...' : 'Đặt đơn ngay'}</span>
            <span className="text-orange-500">{totalPrice.toLocaleString()}đ</span>
          </button>
        </footer>
      )}
    </div>
  )
}