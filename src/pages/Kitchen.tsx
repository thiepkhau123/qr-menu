import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0 })

  // 1. Khởi tạo và Đăng ký Realtime
  useEffect(() => {
    fetchOrders()
    
    const subscription = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [filterStatus])

  // 2. Các hàm xử lý dữ liệu
  const fetchOrders = async () => {
    let query = supabase.from('orders').select('*')
    
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }
    
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      // Thống kê nhanh
      const total = data.reduce((acc, o) => acc + (o.status === 'done' ? o.total : 0), 0)
      const pending = data.filter(o => o.status === 'pending').length
      setStats({ totalRevenue: total, pendingCount: pending })
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (error) alert(error.message)
    else fetchOrders()
  }

  const deleteOrder = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa đơn này không?')) {
      await supabase.from('orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  // 3. Hàm in hóa đơn kèm VietQR
  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // CẤU HÌNH NGÂN HÀNG
    const MY_BANK_ID = "MB"; 
    const MY_ACCOUNT_NO = "123456789"; 
    const MY_NAME = "CHU QUAN NHU NGOC"; 

    const qrUrl = `https://img.vietqr.io/image/${MY_BANK_ID}-${MY_ACCOUNT_NO}-compact2.jpg?amount=${order.total}&addInfo=Thanh toan Ban ${order.table_number}&accountName=${MY_NAME}`;

    const itemsHtml = order.items.map((it: any) => `
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding:5px 0; font-size: 14px;">
        <span>${it.qty}x ${it.name} ${it.level !== null ? `<b>(C${it.level})</b>` : ''}</span>
        <span>${(it.price * it.qty).toLocaleString()}đ</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn - Bàn ${order.table_number}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Arial', sans-serif; width: 75mm; margin: 0 auto; padding: 10px; color: #333; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .qr-box { text-align: center; margin-top: 15px; padding: 10px; border: 1px solid #eee; border-radius: 10px; }
            .qr-img { width: 160px; height: 160px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
            .footer { text-align: center; font-size: 11px; margin-top: 15px; color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;">NHƯ NGỌC QUÁN</h2>
            <p style="font-size:12px; margin:5px 0;">HÓA ĐƠN THANH TOÁN</p>
          </div>
          <div style="font-size:13px; margin-bottom: 10px;">
            <div><b>BÀN: ${order.table_number}</b></div>
            <div>Giờ: ${new Date(order.created_at).toLocaleString('vi-VN')}</div>
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="total-row">
            <span>TỔNG CỘNG:</span>
            <span>${order.total.toLocaleString()}đ</span>
          </div>
          <div class="qr-box">
            <p style="margin:0 0 5px 0; font-size:12px; font-weight:bold; color: #e63946;">QUÉT MÃ CHUYỂN KHOẢN</p>
            <img src="${qrUrl}" class="qr-img" />
            <p style="margin:5px 0 0 0; font-size:10px;">${MY_BANK_ID} - ${MY_ACCOUNT_NO}</p>
            <p style="margin:2px 0 0 0; font-size:10px; font-weight:bold;">${MY_NAME}</p>
          </div>
          <div class="footer">Cảm ơn Quý khách! Hẹn gặp lại.</div>
          <script>
            window.onload = function() { 
              setTimeout(() => { window.print(); window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // 4. Giao diện Admin
  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      {/* THANH ĐIỀU HƯỚNG & THỐNG KÊ */}
      <nav className="bg-white shadow-md p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-orange-600 uppercase italic leading-none">Admin Dashboard 👨‍🍳</h1>
            <span className="text-[10px] text-gray-400 font-bold tracking-widest mt-1 uppercase">Hệ thống quản lý Như Ngọc Quán</span>
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            {(['pending', 'done', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase ${
                  filterStatus === status 
                  ? 'bg-white shadow-sm text-orange-600' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {status === 'pending' ? 'Đang chờ' : status === 'done' ? 'Đã xong' : 'Tất cả'}
              </button>
            ))}
          </div>

          <div className="bg-green-50 px-4 py-2 rounded-2xl border border-green-100 text-right">
            <p className="text-[9px] text-green-600 font-black uppercase leading-none">Doanh thu đơn xong</p>
            <p className="text-xl font-black text-green-700">{stats.totalRevenue.toLocaleString()}đ</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((o) => (
            <div 
              key={o.id} 
              className={`bg-white rounded-[2.5rem] shadow-sm border-2 flex flex-col overflow-hidden transition-all ${
                o.status === 'done' ? 'border-gray-100 opacity-75' : 'border-orange-200 ring-8 ring-orange-50'
              }`}
            >
              {/* Header Card */}
              <div className={`p-5 flex justify-between items-center ${o.status === 'done' ? 'bg-gray-50' : 'bg-orange-50'}`}>
                <div>
                  <span className="text-2xl font-black text-gray-800">BÀN: {o.table_number}</span>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                    ID: #{o.id.slice(0, 5)}
                  </p>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                    {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>

              {/* Danh sách món ăn */}
              <div className="p-6 flex-1">
                <div className="space-y-4">
                  {o.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start group">
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-gray-800 group-hover:text-orange-600 transition-colors">
                          <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-lg mr-2">{it.qty}x</span> 
                          {it.name}
                        </span>
                        {it.level !== null && (
                          <span className="text-[10px] text-white font-black uppercase mt-1 bg-red-500 w-fit px-2 py-0.5 rounded-full">
                            🔥 Cấp độ: {it.level}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-bold italic">{(it.price * it.qty).toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>

                {o.note && (
                  <div className="mt-5 p-4 bg-yellow-50 rounded-2xl border border-yellow-100 relative">
                    <span className="absolute -top-2 left-4 bg-yellow-400 text-white text-[8px] font-black px-2 py-0.5 rounded-full">GHI CHÚ</span>
                    <p className="text-xs text-yellow-800 font-medium">"{o.note}"</p>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thành tiền</span>
                  <span className="text-2xl font-black text-orange-600 leading-none">{o.total.toLocaleString()}đ</span>
                </div>
              </div>

              {/* Nút bấm thao tác */}
              <div className="p-5 bg-gray-50/50 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => printOrder(o)}
                  className="bg-white text-gray-700 py-3.5 rounded-2xl font-black text-[10px] border border-gray-200 shadow-sm hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  📄 IN PHIẾU
                </button>
                
                {o.status === 'pending' ? (
                  <button 
                    onClick={() => updateStatus(o.id, 'done')}
                    className="bg-green-600 text-white py-3.5 rounded-2xl font-black text-[10px] shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all uppercase tracking-tighter"
                  >
                    Thu Tiền & Xong
                  </button>
                ) : (
                  <button 
                    onClick={() => deleteOrder(o.id)}
                    className="bg-red-50 text-red-500 py-3.5 rounded-2xl font-black text-[10px] hover:bg-red-100 active:scale-95 transition-all"
                  >
                    XÓA LỊCH SỬ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
            <p className="text-gray-300 font-black text-2xl italic uppercase">Không có đơn hàng nào!</p>
          </div>
        )}
      </main>
    </div>
  )
}