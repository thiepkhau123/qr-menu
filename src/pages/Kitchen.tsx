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
    if (window.confirm('Xóa đơn này khỏi lịch sử?')) {
      await supabase.from('orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const MY_BANK_ID = "Vietcombank"; 
    const MY_ACCOUNT_NO = "1014363257"; 
    const MY_NAME = "CHU QUAN NHU NGOC QUAN"; 
    const qrUrl = `https://img.vietqr.io/image/${MY_BANK_ID}-${MY_ACCOUNT_NO}-compact2.jpg?amount=${order.total}&addInfo=Thanh toan ban ${order.table_number}&accountName=${MY_NAME}`;

    printWindow.document.write(`
      <html>
        <head><style>
          body { font-family: sans-serif; width: 75mm; padding: 10px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; }
          .item { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; border-bottom: 1px dashed #eee; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
          .qr { text-align: center; margin-top: 10px; }
        </style></head>
        <body>
          <div class="header"><h2>NHƯ NGỌC QUÁN</h2><p>BÀN: ${order.table_number}</p></div>
          ${order.items.map((it: any) => `<div class="item"><span>${it.qty}x ${it.name}</span><span>${(it.price * it.qty).toLocaleString()}đ</span></div>`).join('')}
          <div class="total">TỔNG: ${order.total.toLocaleString()}đ</div>
          <div class="qr"><img src="${qrUrl}" width="140" /></div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      {/* NAVBAR GỌN NHẸ */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-black text-slate-800">NHƯ NGỌC <span className="text-orange-600 font-black">ADMIN</span></h1>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 scale-90">
            {['pending', 'done', 'all'].map((s) => (
              <button 
                key={s} onClick={() => setFilterStatus(s as any)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
                  filterStatus === s ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'
                }`}
              >
                {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Xong' : 'Tất cả'}
              </button>
            ))}
          </div>

          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase">Doanh thu</p>
            <p className="text-sm font-black text-green-600 leading-none">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* GRID CARD NHỎ LẠI (Grid 4 cột trên màn hình lớn) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((o) => (
            <div 
              key={o.id} 
              className={`bg-white rounded-2xl flex flex-col transition-all overflow-hidden border-[3px] shadow-sm
                ${o.status === 'pending' ? 'border-orange-500 ring-4 ring-orange-50' : ''}
                ${o.status === 'done' ? 'border-green-500 opacity-90' : ''}
                ${filterStatus === 'all' && o.status === 'done' ? 'border-green-500' : ''}
              `}
            >
              {/* Card Header Nhỏ */}
              <div className={`px-4 py-3 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-700'}`}>
                <span className="text-lg font-black">BÀN {o.table_number}</span>
                <span className="text-[10px] font-bold opacity-70">
                  {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Items Danh sách món thu gọn */}
              <div className="p-4 flex-1 space-y-2">
                {o.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-start text-xs border-b border-slate-50 pb-1.5 last:border-0">
                    <span className="font-bold text-slate-700">
                      <span className="text-orange-600">{it.qty}x</span> {it.name}
                      {it.level !== null && <span className="text-[9px] text-red-500 font-black ml-1">C{it.level}</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">{(it.price * it.qty).toLocaleString()}</span>
                  </div>
                ))}
                
                {o.note && (
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">
                    <p className="text-[9px] text-amber-700 leading-tight"><b>Lưu ý:</b> {o.note}</p>
                  </div>
                )}
              </div>

              {/* Footer Tổng tiền & Nút nhỏ */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Tổng</span>
                  <span className="text-lg font-black text-slate-800">{o.total.toLocaleString()}đ</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => printOrder(o)} className="py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all">IN BILL</button>
                  {o.status === 'pending' ? (
                    <button onClick={() => updateStatus(o.id, 'done')} className="py-2 bg-green-600 text-white rounded-lg text-[10px] font-black hover:bg-green-700 transition-all shadow-sm">XONG</button>
                  ) : (
                    <button onClick={() => deleteOrder(o.id)} className="py-2 bg-red-50 text-red-500 border border-red-100 rounded-lg text-[10px] font-black hover:bg-red-100 transition-all">XÓA</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}