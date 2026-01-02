import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminConsole() {
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'report'>('orders')
  const [isSoundOn, setIsSoundOn] = useState(true)
  const [newItem, setNewItem] = useState({ name: '', price: 0, image_url: '', description: '' })

  const loadData = async () => {
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(o || [])
    const { data: m } = await supabase.from('menu_items').select('*').order('name')
    setMenuItems(m || [])
  }

  useEffect(() => {
    loadData()
    const channel = supabase.channel('admin-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (isSoundOn) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {})
        }
        setOrders(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isSoundOn])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name || newItem.price <= 0) return alert("Vui lòng nhập tên và giá món!")
    const { error } = await supabase.from('menu_items').insert([newItem])
    if (!error) {
      alert("Đã thêm món mới thành công!");
      setNewItem({ name: '', price: 0, image_url: '', description: '' })
      loadData()
    }
  }

  // Tính toán doanh thu hôm nay
  const todayRevenue = orders
    .filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (Number(o.total) || 0), 0)

  return (
    <div className="max-w-5xl mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-800">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl font-black tracking-tighter text-gray-900">QUẢN TRỊ CỬA HÀNG 🍜</h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSoundOn(!isSoundOn)}
            className={`p-2 px-4 rounded-2xl border transition-all font-bold text-sm ${isSoundOn ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-gray-100 text-gray-400 grayscale'}`}
          >
            {isSoundOn ? '🔔 Chuông: Bật' : '🔕 Chuông: Tắt'}
          </button>
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
            {(['orders', 'menu', 'report'] as const).map(t => (
              <button 
                key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${tab === t ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400'}`}
              >
                {t === 'orders' ? 'ĐƠN HÀNG' : t === 'menu' ? 'MÓN ĂN' : 'BÁO CÁO'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* TAB 1: ĐƠN HÀNG */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.filter(o => o.status !== 'done').map(o => (
            <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-orange-100 relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-3xl font-black text-gray-900">BÀN {o.table_number}</span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <button 
                  onClick={() => supabase.from('orders').update({ status: 'done' }).eq('id', o.id).then(loadData)}
                  className="bg-green-600 text-white px-5 py-2 rounded-2xl font-black text-xs shadow-lg shadow-green-100"
                >
                  XONG
                </button>
              </div>
              <div className="space-y-2">
                {o.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                    <span className="font-bold text-sm">{it.name} <b className="text-orange-600">x{it.qty}</b></span>
                    <span className="bg-red-600 text-white px-2 py-1 rounded-lg font-black text-[10px]">CẤP {it.level}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: THỰC ĐƠN */}
      {tab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleAddItem} className="bg-white p-6 rounded-3xl border shadow-sm h-fit space-y-4">
            <h3 className="font-black text-gray-900 uppercase">Thêm món mới</h3>
            <input type="text" placeholder="Tên món" className="w-full p-3 bg-gray-50 border-none rounded-2xl text-sm" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input type="number" placeholder="Giá tiền" className="w-full p-3 bg-gray-50 border-none rounded-2xl text-sm" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
            <input type="text" placeholder="Link hình ảnh" className="w-full p-3 bg-gray-50 border-none rounded-2xl text-sm" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
            <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Lưu vào menu</button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 border shadow-sm">
                <img src={item.image_url || 'https://via.placeholder.com/100'} className="w-16 h-16 object-cover rounded-xl bg-gray-100" alt="" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs font-black text-orange-600">{item.price.toLocaleString()}đ</p>
                </div>
                <button 
                  onClick={() => supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id).then(loadData)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {item.is_available ? 'Đang bán' : 'Hết hàng'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BÁO CÁO DOANH THU */}
      {tab === 'report' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-10 rounded-[40px] border-4 border-orange-50 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Tổng doanh thu hôm nay</p>
            <h2 className="text-6xl font-black text-gray-900 tracking-tighter">
              {todayRevenue.toLocaleString()}<span className="text-orange-500 text-3xl ml-1">đ</span>
            </h2>
            <div className="mt-6 inline-block bg-orange-100 text-orange-700 px-6 py-2 rounded-full font-bold text-sm">
              {orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length} đơn hàng đã nhận
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b font-bold text-sm text-gray-400 uppercase tracking-widest">Lịch sử đơn hàng gần đây</div>
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {orders.slice(0, 20).map((o, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-black text-gray-800">BÀN {o.table_number}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-orange-600">{o.total.toLocaleString()}đ</p>
                    <span className={`text-[10px] font-bold uppercase ${o.status === 'done' ? 'text-green-500' : 'text-orange-400'}`}>
                      {o.status === 'done' ? 'Hoàn tất' : 'Đang xử lý'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}