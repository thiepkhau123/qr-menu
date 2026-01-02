import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  useEffect(() => {
    fetchOrders()
    // Realtime cập nhật đơn hàng mới
    const subscription = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [filterStatus])

  const fetchOrders = async () => {
    let query = supabase.from('orders').select('*')
    
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }
    
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      // Tính toán sơ bộ: Tổng tiền các đơn đã xong và số đơn đang chờ
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
    if (window.confirm('Bạn có chắc muốn xóa đơn này không?')) {
      await supabase.from('orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  // Hàm in hóa đơn/phiếu bếp (giữ nguyên logic chuyên nghiệp)
  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const itemsHtml = order.items.map((it: any) => `
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px 0;">
        <span>${it.qty}x ${it.name} ${it.level !== null ? `<b>(Cấp ${it.level})</b>` : ''}</span>
        <span>${(it.price * it.qty).toLocaleString()}đ</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <body style="font-family:sans-serif; width:80mm; padding:10px;">
          <h2 style="text-align:center;">NHƯ NGỌC QUÁN</h2>
          <p>Bàn: <b>${order.table_number}</b></p>
          <p>Giờ: ${new Date(order.created_at).toLocaleTimeString()}</p>
          <hr/>
          ${itemsHtml}
          <h3 style="text-align:right;">Tổng: ${order.total.toLocaleString()}đ</h3>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* SIDEBAR/HEADER TỔNG HỢP */}
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-xl font-black text-orange-600 uppercase italic">Quản Lý Toàn Diện 🛠️</h1>
          
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'pending' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>ĐANG CHỜ</button>
            <button onClick={() => setFilterStatus('done')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'done' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>HOÀN TẤT</button>
            <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>TẤT CẢ</button>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Doanh thu đơn xong</p>
              <p className="text-lg font-black text-green-600">{stats.totalRevenue.toLocaleString()}đ</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((o) => (
            <div key={o.id} className={`bg-white rounded-[2rem] shadow-sm border-2 flex flex-col transition-all ${o.status === 'done' ? 'border-green-100 opacity-80' : 'border-orange-200 ring-4 ring-orange-50'}`}>
              
              {/* Header: Bàn & Thời gian */}
              <div className={`p-4 rounded-t-[2rem] flex justify-between items-center ${o.status === 'done' ? 'bg-green-50' : 'bg-orange-50'}`}>
                <span className="text-xl font-black text-gray-800">BÀN: {o.table_number}</span>
                <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 rounded-lg">
                  {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Items */}
              <div className="p-5 flex-1">
                <div className="space-y-3">
                  {o.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700 leading-tight">
                          <span className="text-orange-600">{it.qty}x</span> {it.name}
                        </span>
                        {it.level !== null && (
                          <span className="text-[10px] text-red-500 font-black uppercase">🔥 Cấp độ: {it.level}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{(it.price * it.qty).toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>

                {o.note && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <p className="text-[10px] font-black text-yellow-600 uppercase">Ghi chú:</p>
                    <p className="text-xs text-yellow-700 italic">"{o.note}"</p>
                  </div>
                )}
                
                <div className="mt-4 pt-3 border-t border-dashed flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-lg font-black text-orange-600">{o.total.toLocaleString()}đ</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => printOrder(o)}
                  className="bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  IN PHIẾU
                </button>
                
                {o.status === 'pending' ? (
                  <button 
                    onClick={() => updateStatus(o.id, 'done')}
                    className="bg-green-600 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all"
                  >
                    XONG & THU TIỀN
                  </button>
                ) : (
                  <button 
                    onClick={() => deleteOrder(o.id)}
                    className="bg-red-50 text-red-500 py-3 rounded-2xl font-bold text-xs hover:bg-red-100 transition-all"
                  >
                    XÓA ĐƠN
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}