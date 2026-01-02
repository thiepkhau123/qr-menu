import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Định nghĩa kiểu dữ liệu chuẩn để hết cảnh báo vàng
type OrderStatus = 'pending' | 'done' | 'all';

interface ProductForm {
  id: string;
  name: string;
  price: number;
  image_url: string;
  note: string;
  is_available: boolean;
  category: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<OrderStatus>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  const [isEditing, setIsEditing] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>({
    id: '',
    name: '',
    price: 0,
    image_url: '',
    note: '',
    is_available: true,
    category: 'Món chính'
  })

  // --- HÀM IN BILL CHUYÊN NGHIỆP ---
  const handlePrint = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const itemsHtml = order.items.map((it: any) => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; font-family: sans-serif;">
        <span>${it.qty}x ${it.name} ${it.level !== null ? `(Cấp ${it.level})` : ''}</span>
        <span>${(it.price * it.qty).toLocaleString()}đ</span>
      </div>
    `).join('');
    printWindow.document.write(`
      <html>
        <head><title>Bill Bàn ${order.table_number}</title><style>body{font-family:sans-serif;padding:20px;color:#333;}.header{text-align:center;border-bottom:1px dashed #ccc;padding-bottom:10px;margin-bottom:10px;}.total{border-top:1px dashed #ccc;padding-top:10px;margin-top:10px;font-weight:bold;text-align:right;}</style></head>
        <body>
          <div class="header"><h2>NHƯ NGỌC QUÁN</h2><p>Bàn: ${order.table_number}</p><p style="font-size:10px">${new Date(order.created_at).toLocaleString()}</p></div>
          ${itemsHtml}
          ${order.note ? `<p style="font-size: 12px; font-style: italic; border-top: 1px solid #eee; pt: 5px;">Ghi chú: ${order.note}</p>` : ''}
          <div class="total">Tổng: ${order.total.toLocaleString()}đ</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- LẤY ĐƠN HÀNG (Realtime & Filter) ---
  const fetchOrders = useCallback(async () => {
    let query = supabase.from('orders').select('*')
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      // Tính toán thống kê nhanh
      const { data: allData } = await supabase.from('orders').select('total, status')
      if (allData) {
        setStats({
          totalRevenue: allData.reduce((acc, o) => acc + (o.status === 'done' ? o.total : 0), 0),
          pendingCount: allData.filter(o => o.status === 'pending').length
        })
      }
    }
  }, [filterStatus])

  // --- LẤY MENU (Đúng bảng menu_items) ---
  const fetchMenu = useCallback(async () => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false })
    if (data) setMenuItems(data)
  }, [])

  useEffect(() => {
    fetchOrders(); fetchMenu();
    const channel = supabase.channel('admin_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenu())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, fetchMenu])

  // --- THAO TÁC LƯU MÓN (Sửa lỗi đỏ TypeScript) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Dùng destructuring để loại bỏ id khi thêm mới, tránh lỗi operand delete
    const { id, ...payload } = productForm;
    
    if (isEditing) { 
      await supabase.from('menu_items').update(payload).eq('id', id) 
    } else { 
      await supabase.from('menu_items').insert([payload]) 
    }
    
    // Reset Form
    setProductForm({ id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: 'Món chính' });
    setIsEditing(false); 
    fetchMenu();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 pb-20 font-sans">
      {/* HEADER & STATS */}
      <nav className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <h1 className="font-black text-orange-600 text-xl uppercase italic tracking-tighter">NHƯ NGỌC ADMIN</h1>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('orders')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Đơn hàng</button>
              <button onClick={() => setActiveTab('menu')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Thực đơn</button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-gray-400 uppercase">Doanh thu xong</p>
            <p className="text-lg font-black text-green-600 leading-none">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {activeTab === 'orders' ? (
          <div className="space-y-6">
            {/* FILTER TABS - Đã ép kiểu để hết lỗi vàng */}
            <div className="flex justify-center gap-2">
              {(['pending', 'done', 'all'] as OrderStatus[]).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                  {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Đã xong' : 'Tất cả'}
                </button>
              ))}
            </div>

            {/* ORDER GRID */}
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
                        <span className="text-gray-700">{it.qty}x {it.name} {it.level !== null && <span className="text-red-500 ml-1">🌶️{it.level}</span>}</span>
                        <span className="text-gray-400">{(it.price * it.qty).toLocaleString()}đ</span>
                      </div>
                    ))}
                    {o.note && <p className="text-[10px] bg-amber-50 p-2 rounded-lg text-amber-700 italic border border-amber-100">Note: {o.note}</p>}
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex flex-col gap-3">
                    <div className="flex justify-between items-center font-black text-sm">
                      <span className="text-gray-400 uppercase text-[9px]">Tổng đơn</span>
                      <span>{o.total.toLocaleString()}đ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handlePrint(o)} className="py-2.5 bg-white border-2 border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-500 active:scale-95 transition-all">In Bill</button>
                      <button onClick={() => supabase.from('orders').update({status: o.status === 'pending' ? 'done' : 'pending'}).eq('id', o.id)} 
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${o.status === 'pending' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-gray-800 text-white'}`}>
                        {o.status === 'pending' ? 'Xong' : 'Mở lại'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FORM QUẢN LÝ MÓN */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSave} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm sticky top-24">
                <h2 className="text-lg font-black uppercase mb-6 italic tracking-tighter">{isEditing ? 'Cập nhật món 📝' : 'Thêm món mới 🍜'}</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Tên món" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                  <input type="number" placeholder="Giá (VNĐ)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: parseInt(e.target.value)})} required />
                  <input type="text" placeholder="Nhóm (Ví dụ: Mì cay, Đồ uống)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} required />
                  <input type="text" placeholder="Link hình ảnh" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-orange-500 transition-all" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} />
                  <textarea placeholder="Ghi chú món..." className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold h-20" value={productForm.note} onChange={e => setProductForm({...productForm, note: e.target.value})} />
                  
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái:</span>
                    <button type="button" onClick={() => setProductForm({...productForm, is_available: !productForm.is_available})} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${productForm.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {productForm.is_available ? 'Còn hàng' : 'Hết hàng'}
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

            {/* DANH SÁCH MENU HIỆN TẠI */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.map(p => (
                  <div key={p.id} className={`bg-white p-3 rounded-[2rem] border-2 flex gap-4 items-center transition-all ${p.is_available ? 'border-gray-50 shadow-sm hover:border-orange-200' : 'border-red-100 bg-red-50/20 grayscale opacity-70'}`}>
                    <img src={p.image_url || 'https://via.placeholder.com/100'} alt="" className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter">{p.name}</h4>
                      <p className="text-orange-600 font-black text-xs mt-1">{p.price.toLocaleString()}đ</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 italic">{p.category}</p>
                      
                      <div className="flex gap-4 mt-3">
                        <button onClick={() => {setIsEditing(true); setProductForm(p); window.scrollTo({top:0, behavior:'smooth'})}} className="text-[10px] font-black text-blue-500 uppercase underline">Sửa</button>
                        <button onClick={() => supabase.from('menu_items').update({ is_available: !p.is_available }).eq('id', p.id)} className={`text-[10px] font-black uppercase underline ${p.is_available ? 'text-orange-500' : 'text-green-600'}`}>
                          {p.is_available ? 'Báo hết' : 'Mở bán'}
                        </button>
                        <button onClick={() => {if(confirm('Xóa món này vĩnh viễn?')) supabase.from('menu_items').delete().eq('id', p.id)}} className="text-[10px] font-black text-red-500 uppercase underline ml-auto">Xóa</button>
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