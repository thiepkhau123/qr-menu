import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  const [isEditing, setIsEditing] = useState(false)
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    price: 0,
    image_url: '',
    note: '',
    is_available: true
  })

  // --- HÀM LẤY DỮ LIỆU ---
  // Dùng useCallback để hàm không bị tạo lại sau mỗi lần render
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
  }, [filterStatus]); // Chỉ chạy lại khi filterStatus thay đổi

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
  }, []);

  // --- EFFECT THEO DÕI REALTIME ---
  useEffect(() => {
    fetchOrders()
    fetchProducts()
    
    const orderSub = supabase.channel('orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    
    const productSub = supabase.channel('products_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe()

    return () => {
      supabase.removeChannel(orderSub)
      supabase.removeChannel(productSub)
    }
  }, [fetchOrders, fetchProducts]) // Đưa 2 hàm đã bọc useCallback vào đây

  // --- THAO TÁC ĐƠN HÀNG ---
  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    fetchOrders()
  }

  // --- THAO TÁC SẢN PHẨM ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: productForm.name,
      price: productForm.price,
      image_url: productForm.image_url,
      note: productForm.note,
      is_available: productForm.is_available
    }

    if (isEditing) {
      await supabase.from('products').update(payload).eq('id', productForm.id)
    } else {
      await supabase.from('products').insert([payload])
    }
    
    setProductForm({ id: '', name: '', price: 0, image_url: '', note: '', is_available: true })
    setIsEditing(false)
    fetchProducts()
  }

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Xóa món này khỏi menu?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    await supabase.from('products').update({ is_available: !currentStatus }).eq('id', id)
    fetchProducts()
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-black text-xl tracking-tighter text-orange-600">NHƯ NGỌC</div>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button onClick={() => setActiveTab('orders')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Đơn hàng</button>
              <button onClick={() => setActiveTab('menu')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Sản phẩm</button>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Doanh thu xong</span>
            <span className="text-lg font-black text-green-600 leading-none">{stats.totalRevenue.toLocaleString()}đ</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {activeTab === 'orders' && (
          <>
            <div className="flex justify-center mb-6">
               <div className="bg-white p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
                  {['pending', 'done', 'all'].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s as any)} 
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                      {s === 'pending' ? `Đang chờ (${stats.pendingCount})` : s === 'done' ? 'Đã xong' : 'Tất cả'}
                    </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {orders.map((o) => (
                <div key={o.id} className={`bg-white rounded-[2rem] border-[3px] flex flex-col transition-all overflow-hidden ${o.status === 'pending' ? 'border-orange-500 shadow-xl ring-4 ring-orange-50' : 'border-green-500 opacity-80'}`}>
                  <div className={`px-5 py-3 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                    <b className="text-lg italic font-black uppercase tracking-tighter">Bàn {o.table_number}</b>
                    <span className="text-[10px] font-bold">{new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="p-5 flex-1 space-y-2">
                    {o.items?.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] font-bold border-b border-slate-50 pb-2 last:border-0">
                        <span className="text-slate-700 truncate pr-2"><b className="text-orange-600 mr-1">{it.qty}x</b> {it.name}</span>
                        <span className="text-slate-400 whitespace-nowrap">{(it.price * it.qty).toLocaleString()}đ</span>
                      </div>
                    ))}
                    {o.note && <div className="text-[10px] bg-amber-50 p-2 rounded-xl border border-amber-100 italic text-amber-800 mt-2">"{o.note}"</div>}
                  </div>
                  <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng thu</span>
                      <span className="text-xl font-black text-slate-800 tracking-tighter">{o.total.toLocaleString()}đ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="py-2.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 active:scale-95 transition-all">Bill</button>
                      {o.status === 'pending' ? (
                        <button onClick={() => updateOrderStatus(o.id, 'done')} className="py-2.5 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-100 active:scale-95 transition-all">Xong</button>
                      ) : (
                        <button onClick={() => updateOrderStatus(o.id, 'pending')} className="py-2.5 bg-slate-800  rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all text-white">Mở lại</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-sm sticky top-24">
                <h2 className="text-lg font-black uppercase mb-6 text-slate-800 tracking-tighter italic">
                  {isEditing ? 'Sửa món ăn 📝' : 'Thêm món mới 🍜'}
                </h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Tên món" className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 transition-all outline-none" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                  <input type="number" placeholder="Giá (VNĐ)" className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 transition-all outline-none" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: parseInt(e.target.value)})} required />
                  <input type="text" placeholder="Link ảnh URL" className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold focus:border-orange-500 transition-all outline-none" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} />
                  <textarea placeholder="Ghi chú món ăn..." className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold h-24 focus:border-orange-500 transition-all outline-none" value={productForm.note} onChange={e => setProductForm({...productForm, note: e.target.value})} />
                  
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Tình trạng:</span>
                    <button type="button" onClick={() => setProductForm({...productForm, is_available: !productForm.is_available})} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${productForm.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {productForm.is_available ? 'Đang bán' : 'Hết hàng'}
                    </button>
                  </div>

                  <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-orange-100 active:scale-95 transition-all">
                    {isEditing ? 'Lưu cập nhật' : 'Thêm món'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => {setIsEditing(false); setProductForm({id:'', name:'', price:0, image_url:'', note:'', is_available:true})}} className="w-full text-[10px] font-black text-slate-400 uppercase pt-2">Hủy</button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p) => (
                  <div key={p.id} className={`bg-white p-3 rounded-[2rem] border-2 transition-all flex gap-4 items-center group ${p.is_available ? 'border-slate-100 shadow-sm' : 'border-red-100 bg-red-50/20 grayscale'}`}>
                    <img src={p.image_url || 'https://via.placeholder.com/100'} alt={p.name} className="w-20 h-20 rounded-2xl object-cover bg-slate-100" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter">{p.name}</h4>
                        {!p.is_available && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black">HẾT</span>}
                      </div>
                      <p className="text-orange-600 font-black text-xs">{p.price.toLocaleString()}đ</p>
                      <p className="text-[10px] text-slate-400 italic truncate mt-1">{p.note || '...'}</p>
                      
                      <div className="flex gap-3 mt-3">
                        <button onClick={() => {setIsEditing(true); setProductForm(p); window.scrollTo({top: 0, behavior:'smooth'})}} className="text-[10px] font-black text-blue-500 uppercase underline">Sửa</button>
                        <button onClick={() => toggleAvailability(p.id, p.is_available)} className={`text-[10px] font-black uppercase underline ${p.is_available ? 'text-orange-500' : 'text-green-600'}`}>
                          {p.is_available ? 'Báo hết' : 'Mở bán'}
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-[10px] font-black text-red-500 uppercase underline ml-auto">Xóa</button>
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