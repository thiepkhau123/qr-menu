import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminConsole() {
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'report'>('orders')
  const [isSoundOn, setIsSoundOn] = useState(true)
  
  // State quản lý Form (dùng chung cho cả Thêm và Sửa)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', price: 0, image_url: '', description: '' })

  const loadData = async () => {
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(o || [])
    const { data: m } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false })
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

  // Xử lý Thêm hoặc Cập nhật món
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.name || itemForm.price <= 0) return alert("Vui lòng nhập tên và giá!")

    const payload = {
      name: itemForm.name,
      price: itemForm.price,
      image_url: itemForm.image_url,
      description: itemForm.description,
      is_available: true,
      category_id: null // Đảm bảo không lỗi nếu DB yêu cầu category
    }

    if (editingId) {
      // Chế độ SỬA
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editingId)
      if (!error) alert("Đã cập nhật món!")
    } else {
      // Chế độ THÊM
      const { error } = await supabase.from('menu_items').insert([payload])
      if (!error) alert("Đã thêm món mới!")
    }

    setEditingId(null)
    setItemForm({ name: '', price: 0, image_url: '', description: '' })
    loadData()
  }

  // Xử lý XÓA món
  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa món này không?")) {
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) alert("Không thể xóa: " + error.message)
      else loadData()
    }
  }

  // Đổ dữ liệu vào form để sửa
  const startEdit = (item: any) => {
    setEditingId(item.id)
    setItemForm({ 
        name: item.name, 
        price: item.price, 
        image_url: item.image_url || '', 
        description: item.description || '' 
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const todayRevenue = orders
    .filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (Number(o.total) || 0), 0)

  return (
    <div className="max-w-5xl mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-800 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl font-black text-gray-900">ADMIN DASHBOARD 🍜</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSoundOn(!isSoundOn)} className={`p-2 px-4 rounded-xl border font-bold text-xs ${isSoundOn ? 'bg-orange-100 text-orange-700' : 'bg-gray-200'}`}>
            {isSoundOn ? '🔔 Chuông: Bật' : '🔕 Tắt'}
          </button>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border">
            {(['orders', 'menu', 'report'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${tab === t ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>
                {t === 'orders' ? 'ĐƠN HÀNG' : t === 'menu' ? 'THỰC ĐƠN' : 'BÁO CÁO'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* TAB MENU: THÊM - SỬA - XÓA */}
      {tab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form nhập liệu */}
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border shadow-sm h-fit space-y-4 sticky top-24">
            <h3 className="font-black text-gray-900 uppercase">{editingId ? '✍️ Chỉnh sửa món' : '➕ Thêm món mới'}</h3>
            <input type="text" placeholder="Tên món (Mì cay...)" className="w-full p-3 bg-gray-50 rounded-xl text-sm border" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            <input type="number" placeholder="Giá tiền" className="w-full p-3 bg-gray-50 rounded-xl text-sm border" value={itemForm.price || ''} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})} />
            <input type="text" placeholder="Link ảnh (từ Google/Facebook)" className="w-full p-3 bg-gray-50 rounded-xl text-sm border" value={itemForm.image_url} onChange={e => setItemForm({...itemForm, image_url: e.target.value})} />
            <textarea placeholder="Mô tả món" className="w-full p-3 bg-gray-50 rounded-xl text-sm border" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
            
            <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">
                    {editingId ? 'CẬP NHẬT' : 'THÊM VÀO MENU'}
                </button>
                {editingId && (
                    <button type="button" onClick={() => {setEditingId(null); setItemForm({name:'', price:0, image_url:'', description:''})}} className="bg-gray-200 px-4 rounded-xl font-bold text-xs">HỦY</button>
                )}
            </div>
          </form>

          {/* Danh sách hiển thị */}
          <div className="lg:col-span-2 space-y-3">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 border hover:border-orange-200 transition-all group">
                <img src={item.image_url || 'https://via.placeholder.com/100'} className="w-16 h-16 object-cover rounded-xl bg-gray-50" alt="" />
                <div className="flex-1">
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs font-black text-orange-600">{item.price.toLocaleString()}đ</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">Sửa</button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Xóa</button>
                </div>
                <button 
                  onClick={() => supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id).then(loadData)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {item.is_available ? 'Bán' : 'Hết'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: ĐƠN HÀNG (Giữ nguyên logic cũ nhưng UI sạch hơn) */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.filter(o => o.status !== 'done').map(o => (
            <div key={o.id} className="bg-white p-5 rounded-3xl border-2 border-orange-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-3xl font-black">BÀN {o.table_number}</span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <button onClick={() => supabase.from('orders').update({ status: 'done' }).eq('id', o.id).then(loadData)} className="bg-green-600 text-white px-5 py-2 rounded-2xl font-black text-xs">XONG</button>
              </div>
              <div className="space-y-2">
                {o.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-dashed">
                    <span className="font-bold text-sm">{it.name} <b className="text-orange-600">x{it.qty}</b></span>
                    {it.level !== null && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black">CẤP {it.level}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {orders.filter(o => o.status !== 'done').length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 font-bold italic">Chưa có đơn hàng nào đang chờ...</div>
          )}
        </div>
      )}

      {/* TAB 3: BÁO CÁO (Giữ nguyên) */}
      {tab === 'report' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[40px] border-4 border-orange-50 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-black uppercase mb-4 tracking-widest">Doanh thu hôm nay</p>
            <h2 className="text-6xl font-black text-gray-900 tracking-tighter">{todayRevenue.toLocaleString()}đ</h2>
            <div className="mt-6 inline-block bg-orange-100 text-orange-700 px-6 py-2 rounded-full font-bold text-sm">
              {orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length} đơn đã hoàn tất
            </div>
          </div>
        </div>
      )}
    </div>
  )
}