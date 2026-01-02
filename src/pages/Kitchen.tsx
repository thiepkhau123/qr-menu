import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  const [isEditing, setIsEditing] = useState(false)
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    price: 0,
    image_url: '',
    note: '',
    is_available: true,
    category: 'Món chính'
  })

  // --- LẤY ĐƠN HÀNG (Sử dụng useCallback để hết cảnh báo vàng) ---
  const fetchOrders = useCallback(async () => {
    let query = supabase.from('orders').select('*')
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      setStats({
        totalRevenue: data.reduce((acc, o) => acc + (o.status === 'done' ? o.total : 0), 0),
        pendingCount: data.filter(o => o.status === 'pending').length
      })
    }
  }, [filterStatus])

  // --- LẤY MENU (Sử dụng đúng bảng menu_items) ---
  const fetchMenu = useCallback(async () => {
    const { data } = await supabase
      .from('menu_items') // Đồng bộ tên bảng với App khách hàng
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setMenuItems(data)
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchMenu()
    
    // Realtime lắng nghe cả 2 bảng
    const channel = supabase.channel('admin_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenu())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, fetchMenu])

  // --- THAO TÁC MENU ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: productForm.name,
      price: productForm.price,
      image_url: productForm.image_url,
      note: productForm.note,
      is_available: productForm.is_available,
      category: productForm.category
    }

    if (isEditing) {
      await supabase.from('menu_items').update(payload).eq('id', productForm.id)
    } else {
      await supabase.from('menu_items').insert([payload])
    }
    
    setProductForm({ id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: 'Món chính' })
    setIsEditing(false)
    fetchMenu()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Xóa món này vĩnh viễn?')) {
      await supabase.from('menu_items').delete().eq('id', id)
      fetchMenu()
    }
  }

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    fetchMenu()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 pb-20 font-sans">
      <nav className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <h1 className="font-black text-orange-600 text-xl tracking-tighter uppercase italic">NHƯ NGỌC ADMIN</h1>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('orders')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Đơn hàng</button>
              <button onClick={() => setActiveTab('menu')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Menu món</button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-gray-400 uppercase">Doanh thu</p>
            <p className="text-lg font-black text-green-600 leading-none">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex justify-center gap-2">
              {['pending', 'done', 'all'].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s as any)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                  {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Xong' : 'Tất cả'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {orders.map(o => (
                <div key={o.id} className={`bg-white rounded-[2rem] border-2 flex flex-col overflow-hidden transition-all ${o.status === 'pending' ? 'border-orange-500 shadow-xl' : 'border-gray-200 opacity-60'}`}>
                  <div className={`p-4 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white'}`}>
                    <b className="italic font-black uppercase tracking-tighter">Bàn {o.table_number}</b>
                    <span className="text-[10px] opacity-80">{new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="p-4 flex-1 space-y-2">
                    {o.items?.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] font-bold border-b border-gray-50 pb-1">
                        <span className="text-gray-700">{it.qty}x {it.name}</span>
                        <span className="text-gray-400">{(it.price * it.qty).toLocaleString()}đ</span>
                      </div>
                    ))}
                    {o.note && <p className="text-[10px] bg-amber-50 p-2 rounded-lg text-amber-700 italic border border-amber-100">Note: {o.note}</p>}
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex flex-col gap-3">
                    <div className="flex justify-between items-center font-black text-sm">
                      <span className="text-gray-400 uppercase text-[9px]">Tổng cộng</span>
                      <span>{o.total.toLocaleString()}đ</span>
                    </div>
                    <button onClick={() => supabase.from('orders').update({status: o.status === 'pending' ? 'done' : 'pending'}).eq('id', o.id)} 
                      className={`w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all ${o.status === 'pending' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-gray-800 text-white'}`}>
                      {o.status === 'pending' ? 'HOÀN TẤT' : 'MỞ LẠI'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FORM THÊM MÓN */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSave} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm sticky top-24">
                <h2 className="text-lg font-black uppercase mb-6 italic tracking-tighter">{isEditing ? 'Cập nhật món 📝' : 'Thêm món mới 🍜'}</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Tên món" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                  <input type="number" placeholder="Giá tiền (VNĐ)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: parseInt(e.target.value)})} required />
                  <input type="text" placeholder="Nhóm (Category)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} required />
                  <input type="text" placeholder="Link ảnh (URL)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} />
                  <textarea placeholder="Ghi chú món ăn..." className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold h-20" value={productForm.note} onChange={e => setProductForm({...productForm, note: e.target.value})} />
                  
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Trạng thái:</span>
                    <button type="button" onClick={() => setProductForm({...productForm, is_available: !productForm.is_available})} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${productForm.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {productForm.is_available ? 'Đang bán' : 'Hết hàng'}
                    </button>
                  </div>

                  <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-orange-100 active:scale-95 transition-all">
                    {isEditing ? 'LƯU THAY ĐỔI' : 'THÊM VÀO MENU'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => {setIsEditing(false); setProductForm({id:'', name:'', price:0, image_url:'', note:'', is_available:true, category:'Món chính'})}} className="w-full text-[10px] font-black text-gray-400 uppercase pt-2">Hủy bỏ</button>
                  )}
                </div>
              </form>
            </div>

            {/* DANH SÁCH MENU MÓN */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.map(p => (
                  <div key={p.id} className={`bg-white p-3 rounded-[2rem] border-2 flex gap-4 items-center transition-all ${p.is_available ? 'border-gray-50 shadow-sm' : 'border-red-100 bg-red-50/20 grayscale'}`}>
                    <img src={p.image_url || 'https://via.placeholder.com/100'} alt={p.name} className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter">{p.name}</h4>
                        {!p.is_available && <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black">HẾT</span>}
                      </div>
                      <p className="text-orange-600 font-black text-xs leading-none mt-1">{p.price.toLocaleString()}đ</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{p.category}</p>
                      
                      <div className="flex gap-4 mt-3">
                        <button onClick={() => {setIsEditing(true); setProductForm(p); window.scrollTo({top:0, behavior:'smooth'})}} className="text-[10px] font-black text-blue-500 uppercase underline">Sửa</button>
                        <button onClick={() => toggleStatus(p.id, p.is_available)} className={`text-[10px] font-black uppercase underline ${p.is_available ? 'text-orange-500' : 'text-green-600'}`}>
                          {p.is_available ? 'Báo hết' : 'Mở bán'}
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-[10px] font-black text-red-500 uppercase underline ml-auto">Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}