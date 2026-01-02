import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  // 1. Khởi tạo & Realtime cập nhật đơn hàng
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
    if (window.confirm('Bạn có chắc muốn xóa lịch sử đơn hàng này?')) {
      await supabase.from('orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  // 2. Hàm in hóa đơn chuyên nghiệp kèm QR Ngân hàng
  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // THÔNG TIN NGÂN HÀNG (Hãy sửa đúng số của bạn ở đây)
    const MY_BANK_ID = "Vietcombank"; 
    const MY_ACCOUNT_NO = "1014363257"; 
    const MY_NAME = "CHU QUAN NHU NGOC QUAN"; 
    const qrUrl = `https://img.vietqr.io/image/${MY_BANK_ID}-${MY_ACCOUNT_NO}-compact2.jpg?amount=${order.total}&addInfo=Thanh toan ban ${order.table_number}&accountName=${MY_NAME}`;

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: sans-serif; width: 75mm; margin: 0 auto; padding: 10px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ccc; font-size: 14px; }
            .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 15px; border-top: 1px solid #000; padding-top: 5px; }
            .qr-box { text-align: center; margin-top: 15px; padding: 10px; border: 1px solid #eee; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;">NHƯ NGỌC QUÁN</h2>
            <p style="margin:5px 0;">BÀN: ${order.table_number}</p>
            <p style="font-size:11px;">${new Date(order.created_at).toLocaleString('vi-VN')}</p>
          </div>
          ${order.items.map((it: any) => `
            <div class="item">
              <span>${it.qty}x ${it.name} ${it.level !== null ? `(C${it.level})` : ''}</span>
              <span>${(it.price * it.qty).toLocaleString()}đ</span>
            </div>
          `).join('')}
          <div class="total">TỔNG: ${order.total.toLocaleString()}đ</div>
          <div class="qr-box">
            <p style="font-size:12px; font-weight:bold; color:red; margin-bottom:5px;">QUÉT MÃ CHUYỂN KHOẢN</p>
            <img src="${qrUrl}" width="160" />
            <p style="font-size:10px; margin-top:5px;">${MY_BANK_ID} - ${MY_ACCOUNT_NO}</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans pb-20">
      {/* NAVBAR TỔNG QUAN */}
      <nav className="bg-white border-b-4 border-orange-500 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">ADMIN DASHBOARD</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống đang chạy</span>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {['pending', 'done', 'all'].map((s) => (
              <button 
                key={s} onClick={() => setFilterStatus(s as any)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase ${
                  filterStatus === s ? 'bg-white text-orange-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s === 'pending' ? `Đang chờ (${stats.pendingCount})` : s === 'done' ? 'Đã xong' : 'Tất cả'}
              </button>
            ))}
          </div>

          <div className="hidden md:flex flex-col items-end bg-green-50 px-5 py-2 rounded-2xl border-2 border-green-200">
            <span className="text-[9px] font-black text-green-600 uppercase">Doanh thu hôm nay</span>
            <span className="text-xl font-black text-green-700">{stats.totalRevenue.toLocaleString()}đ</span>
          </div>
        </div>
      </nav>

      {/* DANH SÁCH ĐƠN HÀNG */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orders.map((o) => (
            <div 
              key={o.id} 
              className={`bg-white rounded-[2.5rem] flex flex-col transition-all duration-300 relative
                ${o.status === 'pending' 
                  ? 'border-[4px] border-orange-500 shadow-2xl scale-[1.02] z-10' 
                  : 'border-2 border-slate-200 opacity-90 shadow-sm'
                }`}
            >
              {/* Card Header */}
              <div className={`px-6 py-5 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500' : 'bg-slate-100'}`}>
                <div>
                  <h3 className={`text-2xl font-black ${o.status === 'pending' ? 'text-white' : 'text-slate-800'}`}>
                    BÀN {o.table_number}
                  </h3>
                  <p className={`text-[10px] font-bold ${o.status === 'pending' ? 'text-orange-100' : 'text-slate-400'}`}>
                    #{o.id.slice(-5).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-full bg-white/20 text-current ${o.status === 'pending' ? 'text-white border border-white/30' : 'text-slate-500 border border-slate-200'}`}>
                    {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1">
                <div className="space-y-4">
                  {o.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
                      <div className="flex items-center gap-4">
                        <span className="bg-slate-900 text-white text-xs font-black h-7 w-7 flex items-center justify-center rounded-lg shadow-sm">
                          {it.qty}
                        </span>
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase leading-none">{it.name}</p>
                          {it.level !== null && (
                            <p className="text-[10px] font-black text-red-600 mt-1 uppercase tracking-tighter italic">🔥 Cay cấp độ: {it.level}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400 italic">{(it.price * it.qty).toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>

                {o.note && (
                  <div className="mt-6 p-4 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-200 relative">
                    <span className="absolute -top-2 left-4 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Lưu ý của khách</span>
                    <p className="text-xs text-amber-900 font-bold italic leading-tight">"{o.note}"</p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-6 bg-slate-50 border-t-2 border-slate-100 rounded-b-[2.5rem]">
                <div className="flex justify-between items-end mb-5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền cần thu</span>
                  <span className="text-3xl font-black text-slate-900 leading-none">{o.total.toLocaleString()}đ</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => printOrder(o)}
                    className="h-14 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    📄 IN HÓA ĐƠN
                  </button>
                  
                  {o.status === 'pending' ? (
                    <button 
                      onClick={() => updateStatus(o.id, 'done')}
                      className="h-14 bg-green-600 text-white rounded-2xl text-[11px] font-black hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-100 uppercase"
                    >
                      Thu Tiền & Xong
                    </button>
                  ) : (
                    <button 
                      onClick={() => deleteOrder(o.id)}
                      className="h-14 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl text-[11px] font-black hover:bg-red-100 active:scale-95 transition-all uppercase"
                    >
                      Xóa đơn cũ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 border-4 border-dashed border-slate-200 rounded-[3rem]">
            <div className="text-7xl mb-4 grayscale opacity-30 text-slate-400">🍜</div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-xl">Không có đơn hàng nào!</p>
          </div>
        )}
      </main>
    </div>
  )
}