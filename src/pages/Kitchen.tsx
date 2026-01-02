import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  useEffect(() => {
    fetchOrders()
    const subscription = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(subscription) }
  }, [filterStatus])

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

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    fetchOrders()
  }

  const deleteOrder = async (id: string) => {
    if (window.confirm('Xóa đơn này?')) {
      await supabase.from('orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const qrUrl = `https://img.vietqr.io/image/Vietcombank-1014363257-compact2.jpg?amount=${order.total}&addInfo=Ban ${order.table_number}`;
    
    printWindow.document.write(`
      <html>
        <head><style>
          body { font-family: sans-serif; width: 75mm; padding: 5px; text-align: center; }
          .item { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px dashed #ccc; padding: 4px 0; }
        </style></head>
        <body>
          <h3>NHƯ NGỌC QUÁN</h3>
          <p>BÀN: ${order.table_number}</p>
          ${order.items.map((it: any) => `<div class="item"><span>${it.qty}x ${it.name}</span><span>${(it.price * it.qty).toLocaleString()}đ</span></div>`).join('')}
          <h4>TỔNG: ${order.total.toLocaleString()}đ</h4>
          <img src="${qrUrl}" width="150" />
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-10">
      {/* HEADER TỐI GIẢN */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-black tracking-tight">NHƯ NGỌC <span className="text-orange-600 font-medium">ADMIN</span></h1>
          
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
            {['pending', 'done', 'all'].map((s) => (
              <button 
                key={s} onClick={() => setFilterStatus(s as any)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                  filterStatus === s ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Xong' : 'Tất cả'}
              </button>
            ))}
          </div>

          <div className="text-right leading-tight">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((o) => (
            <div 
              key={o.id} 
              className={`group bg-white rounded-xl flex flex-col transition-all duration-200 border-2 relative hover:shadow-md
                ${o.status === 'pending' ? 'border-orange-500 ring-2 ring-orange-50' : 'border-green-500 opacity-90 hover:opacity-100'}
              `}
            >
              {/* Header card nhỏ gọn */}
              <div className={`px-4 py-2.5 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                <span className="text-base font-black tracking-tighter">BÀN {o.table_number}</span>
                <span className="text-[9px] font-medium opacity-80 uppercase tracking-widest italic">
                  {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Danh sách món ăn */}
              <div className="p-4 flex-1">
                <div className="space-y-2">
                  {o.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start text-[11px] leading-tight text-slate-600">
                      <span className="font-semibold flex-1 pr-2 uppercase">
                        <b className="text-slate-900 mr-1 font-black">{it.qty}x</b> {it.name}
                        {it.level !== null && <span className="text-red-500 ml-1 font-bold italic">C{it.level}</span>}
                      </span>
                      <span className="font-medium whitespace-nowrap">{(it.price * it.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                
                {o.note && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-md border border-slate-100 italic">
                    <p className="text-[9px] text-slate-500 leading-snug">Note: {o.note}</p>
                  </div>
                )}
              </div>

              {/* Footer thanh toán & nút */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Thành tiền</span>
                  <span className="text-base font-black text-slate-800 leading-none">{o.total.toLocaleString()}đ</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => printOrder(o)} className="py-1.5 bg-white border border-slate-300 rounded-md text-[9px] font-black text-slate-500 hover:border-slate-400 active:bg-slate-50 transition-colors uppercase">In Bill</button>
                  {o.status === 'pending' ? (
                    <button onClick={() => updateStatus(o.id, 'done')} className="py-1.5 bg-orange-600 text-white rounded-md text-[9px] font-black hover:bg-orange-700 shadow-sm active:translate-y-0.5 transition-all uppercase tracking-wider">Xong</button>
                  ) : (
                    <button onClick={() => deleteOrder(o.id)} className="py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-md text-[9px] font-black hover:bg-red-100 transition-colors uppercase">Xóa</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {orders.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Không có đơn hàng nào</p>
          </div>
        )}
      </main>
    </div>
  )
}