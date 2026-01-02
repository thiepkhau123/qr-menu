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

  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Config VietQR
    const MY_BANK_ID = "Vietcombank"; 
    const MY_ACCOUNT_NO = "1014363257"; 
    const MY_NAME = "Chu quan Nhu Ngoc Quan"; 
    const qrUrl = `https://img.vietqr.io/image/${MY_BANK_ID}-${MY_ACCOUNT_NO}-compact2.jpg?amount=${order.total}&addInfo=Thanh toan ban ${order.table_number}&accountName=${MY_NAME}`;

    printWindow.document.write(`
      <html>
        <head><style>
          body { font-family: sans-serif; width: 75mm; padding: 10px; }
          .header { text-align: center; border-bottom: 2px solid #000; }
          .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ccc; }
          .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 10px; }
          .qr { text-align: center; margin-top: 15px; }
        </style></head>
        <body>
          <div class="header"><h2>NHƯ NGỌC QUÁN</h2><p>BÀN: ${order.table_number}</p></div>
          ${order.items.map((it: any) => `<div class="item"><span>${it.qty}x ${it.name}</span><span>${(it.price * it.qty).toLocaleString()}đ</span></div>`).join('')}
          <div class="total">TỔNG: ${order.total.toLocaleString()}đ</div>
          <div class="qr"><img src="${qrUrl}" width="160" /></div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-10 text-slate-900">
      {/* HEADER GỌN GÀNG */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-orange-600 flex items-center gap-2">
              QUẢN LÝ ĐƠN HÀNG <span className="text-xs bg-orange-100 px-2 py-1 rounded-full uppercase tracking-tighter">Live</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Như Ngọc Quán Control Panel</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right border-r border-slate-200 pr-6">
              <p className="text-[10px] font-black text-slate-400 uppercase">Doanh thu (Đã xong)</p>
              <p className="text-xl font-black text-green-600">{stats.totalRevenue.toLocaleString()}đ</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['pending', 'done', 'all'].map((s) => (
                <button 
                  key={s} onClick={() => setFilterStatus(s as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all uppercase ${filterStatus === s ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Xong' : 'Tất cả'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              
              {/* TRẠNG THÁI & BÀN */}
              <div className={`px-5 py-4 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-50/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${o.status === 'pending' ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></span>
                  <span className="text-xl font-black">BÀN {o.table_number}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">#{o.id.slice(-4)} | {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>

              {/* DANH SÁCH MÓN - DỄ NHÌN HƠN */}
              <div className="p-5 flex-1 space-y-3">
                {o.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-start border-b border-slate-50 pb-2 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center bg-slate-900 text-white text-[10px] font-bold h-5 w-5 rounded-md">{it.qty}</span>
                        <span className="text-sm font-bold text-slate-700">{it.name}</span>
                      </div>
                      {it.level !== null && <span className="text-[9px] font-black text-red-500 ml-7">🔥 CẤP ĐỘ: {it.level}</span>}
                    </div>
                    <span className="text-xs font-medium text-slate-400">{(it.price * it.qty).toLocaleString()}đ</span>
                  </div>
                ))}

                {o.note && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mt-2">
                    <p className="text-[10px] font-black text-amber-600 uppercase">Ghi chú từ khách:</p>
                    <p className="text-xs text-amber-800 italic font-medium leading-relaxed">{o.note}</p>
                  </div>
                )}
              </div>

              {/* TỔNG TIỀN & THAO TÁC */}
              <div className="p-5 bg-slate-50/50 border-t border-slate-100 mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Thanh toán</span>
                  <span className="text-xl font-black text-slate-900">{o.total.toLocaleString()}đ</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => printOrder(o)}
                    className="h-11 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    📄 IN BILL
                  </button>
                  {o.status === 'pending' ? (
                    <button 
                      onClick={() => updateStatus(o.id, 'done')}
                      className="h-11 bg-orange-600 text-white rounded-xl text-[11px] font-black hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all uppercase tracking-tight"
                    >
                      Xong & Thu tiền
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateStatus(o.id, 'pending')}
                      className="h-11 bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black hover:bg-slate-300 transition-all uppercase"
                    >
                      Mở lại đơn
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
        
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-slate-300">
            <div className="text-5xl mb-4">☁️</div>
            <p className="font-bold uppercase tracking-widest text-sm">Hiện không có đơn hàng nào</p>
          </div>
        )}
      </main>
    </div>
  )
}