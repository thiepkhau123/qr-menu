import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Định nghĩa kiểu dữ liệu chuẩn
type OrderStatus = 'pending' | 'done' | 'all';
type ReportPeriod = 'day' | 'week' | 'month';

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
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'report'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<OrderStatus>('pending')
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('day')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0, reportData: [] as any[] })

  const [isEditing, setIsEditing] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>({
    id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: 'Món chính'
  })

  // --- HÀM IN BILL ---
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

  // --- LẤY DỮ LIỆU BÁO CÁO ---
  const fetchReport = useCallback(async () => {
    const now = new Date();
    let startDate = new Date();
    if (reportPeriod === 'day') startDate.setHours(0, 0, 0, 0);
    else if (reportPeriod === 'week') startDate.setDate(now.getDate() - 7);
    else if (reportPeriod === 'month') startDate.setMonth(now.getMonth() - 1);

    const { data } = await supabase.from('orders')
      .select('*')
      .eq('status', 'done')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setStats(prev => ({ 
        ...prev, 
        totalRevenue: data.reduce((acc, o) => acc + o.total, 0), 
        reportData: data 
      }));
    }
  }, [reportPeriod]);

  // --- LẤY ĐƠN HÀNG ---
  const fetchOrders = useCallback(async () => {
    let query = supabase.from('orders').select('*')
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      const { data: allData } = await supabase.from('orders').select('status')
      if (allData) {
        setStats(prev => ({ ...prev, pendingCount: allData.filter(o => o.status === 'pending').length }));
      }
    }
  }, [filterStatus])

  // --- LẤY MENU ---
  const fetchMenu = useCallback(async () => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false })
    if (data) setMenuItems(data)
  }, [])

  // --- REALTIME SYNC (ĐÃ FIX LỖI ĐỎ Ở ẢNH 2) ---
  useEffect(() => {
    fetchOrders(); fetchMenu(); fetchReport();
    const channel = supabase.channel('admin_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders(); fetchReport(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenu())
      .subscribe();
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, fetchMenu, fetchReport])

  // --- THAO TÁC LƯU MÓN (ĐÃ FIX LỖI ĐỎ Ở ẢNH 1) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...payload } = productForm; // Dùng destructuring thay vì delete

    if (isEditing) {
      await supabase.from('menu_items').update(payload).eq('id', id)
    } else {
      await supabase.from('menu_items').insert([payload])
    }

    setProductForm({ id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: 'Món chính' });
    setIsEditing(false);
    fetchMenu();
  }

  const deleteDoneOrders = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tất cả đơn đã hoàn thành?')) {
      await supabase.from('orders').delete().eq('status', 'done');
      fetchOrders();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 pb-20 font-sans">
      <nav className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <h1 className="font-black text-orange-600 text-xl uppercase italic tracking-tighter">NHƯ NGỌC ADMIN</h1>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('orders')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Đơn hàng</button>
              <button onClick={() => setActiveTab('menu')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Thực đơn</button>
              <button onClick={() => setActiveTab('report')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'report' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Báo cáo</button>
            </div>
          </div>
          <div className="text-right cursor-pointer" onClick={() => setActiveTab('report')}>
            <p className="text-[8px] font-bold text-gray-400 uppercase">Doanh thu</p>
            <p className="text-lg font-black text-green-600 leading-none">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4">
        {activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-2">
                {(['pending', 'done', 'all'] as OrderStatus[]).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                    {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Đã xong' : 'Tất cả'}
                  </button>
                ))}
              </div>
              <button onClick={deleteDoneOrders} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
                🗑️ Xóa tất cả đơn xong
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {orders.map(o => (
                <div key={o.id} className={`bg-white rounded-[2rem] border-2 flex flex-col overflow-hidden transition-all ${o.status === 'pending' ? 'border-orange-500 shadow-xl' : 'border-gray-200 opacity-60'}`}>
                  <div className={`p-4 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white'}`}>
                    <b className="italic font-black uppercase tracking-tighter">Bàn {o.table_number}</b>
                    <span className="text-[10px] opacity-80">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                      {o.status === 'pending' && (
                        <button onClick={() => supabase.from('orders').update({ status: 'done' }).eq('id', o.id)} 
                          className="py-2.5 rounded-xl text-[10px] font-black uppercase bg-orange-600 text-white shadow-lg shadow-orange-100 active:scale-95 transition-all">Xong</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'report' ? (
          <div className="space-y-6">
            <div className="flex justify-center gap-2">
              {(['day', 'week', 'month'] as ReportPeriod[]).map((p) => (
                <button key={p} onClick={() => setReportPeriod(p)} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${reportPeriod === p ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                  {p === 'day' ? 'Hôm nay' : p === 'week' ? '7 Ngày qua' : 'Tháng này'}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-[2.5rem] p-6 border-2 border-gray-100 shadow-sm overflow-x-auto">
              <div className="flex justify-between items-end mb-8 border-b pb-4">
                <h2 className="text-lg font-black uppercase italic tracking-tighter">Chi tiết doanh thu</h2>
                <p className="text-2xl font-black text-green-600">{stats.totalRevenue.toLocaleString()}đ</p>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase border-b">
                    <th className="pb-4">Ngày giờ</th>
                    <th className="pb-4">Bàn</th>
                    <th className="pb-4">Nội dung đơn</th>
                    <th className="pb-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.reportData.map((o) => (
                    <tr key={o.id} className="text-xs font-bold">
                      <td className="py-4 text-gray-400 font-normal">{new Date(o.created_at).toLocaleString()}</td>
                      <td className="py-4 text-orange-600">Bàn {o.table_number}</td>
                      <td className="py-4 text-gray-600">{o.items.map((it:any) => `${it.qty} ${it.name}`).join(', ')}</td>
                      <td className="py-4 text-right font-black">{o.total.toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <form onSubmit={handleSave} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm sticky top-24">
                <h2 className="text-lg font-black uppercase mb-6 italic tracking-tighter">{isEditing ? 'Cập nhật món 📝' : 'Thêm món mới 🍜'}</h2>
                <div className="space-y-4">
                  <input type="text" placeholder="Tên món" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required />
                  <input type="number" placeholder="Giá (VNĐ)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500" value={productForm.price || ''} onChange={e => setProductForm({ ...productForm, price: parseInt(e.target.value) })} required />
                  <input type="text" placeholder="Nhóm (Ví dụ: Mì cay, Đồ uống)" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} required />
                  <input type="text" placeholder="Link hình ảnh" className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-[10px] font-bold" value={productForm.image_url} onChange={e => setProductForm({ ...productForm, image_url: e.target.value })} />
                  <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-lg shadow-orange-100 active:scale-95 transition-all">
                    {isEditing ? 'LƯU THAY ĐỔI' : 'THÊM VÀO MENU'}
                  </button>
                  {isEditing && <button type="button" onClick={() => setIsEditing(false)} className="w-full text-[10px] font-black text-gray-400 uppercase pt-2">Hủy bỏ</button>}
                </div>
              </form>
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.map(p => (
                  <div key={p.id} className={`bg-white p-3 rounded-[2rem] border-2 flex gap-4 items-center transition-all ${p.is_available ? 'border-gray-50 shadow-sm' : 'grayscale opacity-60'}`}>
                    <img src={p.image_url || 'https://via.placeholder.com/100'} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tighter truncate">{p.name}</h4>
                      <p className="text-orange-600 font-black text-xs">{p.price.toLocaleString()}đ</p>
                      <div className="flex gap-3 mt-2">
                        <button onClick={() => { setIsEditing(true); setProductForm(p); }} className="text-[10px] font-black text-blue-500 uppercase underline">Sửa</button>
                        <button onClick={() => supabase.from('menu_items').update({ is_available: !p.is_available }).eq('id', p.id)} className="text-[10px] font-black text-gray-500 uppercase underline">{p.is_available ? 'Hết' : 'Mở'}</button>
                        <button onClick={() => { if (confirm('Xóa món này?')) supabase.from('menu_items').delete().eq('id', p.id) }} className="text-[10px] font-black text-red-500 uppercase underline ml-auto">Xóa</button>
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