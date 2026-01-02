import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  // State cho Form Sản phẩm
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: '', image_url: '', is_available: true })

  useEffect(() => {
    fetchOrders()
    fetchProducts()
    const subscription = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe()
    return () => { supabase.removeChannel(subscription) }
  }, [filterStatus])

  // --- QUẢN LÝ ĐƠN HÀNG ---
  const fetchOrders = async () => {
    let query = supabase.from('orders').select('*')
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      const total = data.reduce((acc, o) => acc + (o.status === 'done' ? o.total : 0), 0)
      const pending = data.filter(o => o.status === 'pending').length
      setStats({ totalRevenue: total, pendingCount: pending })
    }
  }

  const updateOrderStatus = async (id: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    fetchOrders()
  }

  const deleteOrder = async (id: string) => {
    if (window.confirm('Xóa đơn này?')) {
      await supabase.from('orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  // --- QUẢN LÝ SẢN PHẨM (MENU) ---
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProduct) {
      await supabase.from('products').update(editingProduct).eq('id', editingProduct.id)
      setEditingProduct(null)
    } else {
      await supabase.from('products').insert([newProduct])
      setNewProduct({ name: '', price: 0, category: '', image_url: '', is_available: true })
    }
    fetchProducts()
  }

  const deleteProduct = async (id: string) => {
    if (window.confirm('Xóa món này khỏi menu?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const qrUrl = `https://img.vietqr.io/image/Vietcombank-1014363257-compact2.jpg?amount=${order.total}&addInfo=Ban ${order.table_number}`;
    printWindow.document.write(`<html><head><style>body{font-family:sans-serif;width:75mm;text-align:center;}.item{display:flex;justify-content:space-between;font-size:13px;border-bottom:1px dashed #ccc;padding:4px 0;}</style></head><body><h3>NHƯ NGỌC QUÁN</h3><p>BÀN: ${order.table_number}</p>${order.items.map((it: any) => `<div class="item"><span>${it.qty}x ${it.name}</span><span>${(it.price * it.qty).toLocaleString()}đ</span></div>`).join('')}<h4>TỔNG: ${order.total.toLocaleString()}đ</h4><img src="${qrUrl}" width="150" /><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-10">
      {/* HEADER & TAB NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-black text-orange-600">NHƯ NGỌC ADMIN</h1>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('orders')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Đơn hàng</button>
              <button onClick={() => setActiveTab('menu')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Menu món</button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Doanh thu xong</p>
            <p className="text-sm font-black text-green-600 leading-none">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* --- TAB 1: QUẢN LÝ ĐƠN HÀNG --- */}
        {activeTab === 'orders' && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm scale-90">
                {['pending', 'done', 'all'].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
                    {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Xong' : 'Tất cả'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orders.map((o) => (
                <div key={o.id} className={`bg-white rounded-2xl flex flex-col border-[3px] transition-all ${o.status === 'pending' ? 'border-orange-500 ring-4 ring-orange-50' : 'border-green-500 opacity-90'}`}>
                  <div className={`px-4 py-2 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                    <span className="text-lg font-black italic">BÀN {o.table_number}</span>
                    <span className="text-[10px] font-bold opacity-80">{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="p-4 flex-1 space-y-2">
                    {o.items?.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] border-b border-slate-50 pb-1.5 last:border-0">
                        <span className="font-bold text-slate-700">
                          <b className="text-orange-600">{it.qty}x</b> {it.name} {it.level !== null && <span className="text-red-500 ml-1">C{it.level}</span>}
                        </span>
                        <span className="text-slate-400">{(it.price * it.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    {o.note && <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[9px] text-amber-800 italic">Note: {o.note}</div>}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng</span>
                      <span className="text-lg font-black text-slate-900">{o.total.toLocaleString()}đ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => printOrder(o)} className="py-2 bg-white border border-slate-300 rounded-lg text-[9px] font-black text-slate-500 uppercase">Bill</button>
                      {o.status === 'pending' ? (
                        <button onClick={() => updateOrderStatus(o.id, 'done')} className="py-2 bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase shadow-sm">Xong</button>
                      ) : (
                        <button onClick={() => deleteOrder(o.id)} className="py-2 bg-red-50 text-red-500 border border-red-100 rounded-lg text-[9px] font-black uppercase">Xóa</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- TAB 2: QUẢN LÝ MENU --- */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Thêm/Sửa */}
            <div className="lg:col-span-1">
              <form onSubmit={saveProduct} className="bg-white p-6 rounded-3xl border-2 border-slate-200 sticky top-24">
                <h3 className="text-lg font-black mb-4 uppercase text-slate-700">{editingProduct ? 'Sửa món ăn' : 'Thêm món mới'}</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Tên món" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-orange-500 outline-none transition-all" value={editingProduct ? editingProduct.name : newProduct.name} onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} required />
                  <input type="number" placeholder="Giá tiền" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-orange-500 outline-none transition-all" value={editingProduct ? editingProduct.price : newProduct.price} onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, price: parseInt(e.target.value)}) : setNewProduct({...newProduct, price: parseInt(e.target.value)})} required />
                  <input type="text" placeholder="Danh mục (Ví dụ: Đồ ăn, Đồ uống)" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-orange-500 outline-none transition-all" value={editingProduct ? editingProduct.category : newProduct.category} onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})} />
                  <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">
                    {editingProduct ? 'Cập nhật món' : 'Thêm vào Menu'}
                  </button>
                  {editingProduct && <button type="button" onClick={() => setEditingProduct(null)} className="w-full text-xs font-bold text-slate-400 uppercase">Hủy bỏ</button>}
                </div>
              </form>
            </div>

            {/* Danh sách món ăn hiện có */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 font-black text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Tên món</th>
                      <th className="p-4">Giá</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-800 text-sm">{p.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{p.category || 'Chưa phân loại'}</p>
                        </td>
                        <td className="p-4 font-bold text-orange-600 text-sm">{p.price.toLocaleString()}đ</td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all text-[10px] font-black uppercase underline">Sửa</button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all text-[10px] font-black uppercase underline">Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}