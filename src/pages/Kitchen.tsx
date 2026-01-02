import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Kitchen() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingOrders()
    
    // Đăng ký nhận thông báo realtime khi có đơn mới
    const subscription = supabase
      .channel('kitchen_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchPendingOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchPendingOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'done') // Chỉ lấy đơn chưa hoàn thành
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }

  const markAsDone = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'done' })
      .eq('id', orderId)
    
    if (error) alert("Lỗi: " + error.message)
    else fetchPendingOrders()
  }

  const printKitchenTicket = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map((it: any) => `
      <div style="border-bottom: 1px solid #000; padding: 10px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
          <span>${it.qty} x ${it.name}</span>
          ${it.level !== null ? `<span style="background: #000; color: #fff; padding: 0 5px;">CAY CẤP ${it.level}</span>` : ''}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <body style="font-family: sans-serif; padding: 10px; width: 80mm;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px;">
            <h1 style="margin: 0;">BÀN: ${order.table_number}</h1>
            <p style="margin: 5px 0;">${new Date(order.created_at).toLocaleTimeString()}</p>
          </div>
          <div style="margin: 10px 0;">${itemsHtml}</div>
          ${order.note ? `<div style="font-style: italic; font-weight: bold; margin-top: 10px;">GHI CHÚ: ${order.note}</div>` : ''}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <div className="p-10 text-center font-bold">ĐANG TẢI ĐƠN HÀNG...</div>

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 font-sans text-white">
      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 tracking-tighter">KITCHEN DASHBOARD 👨‍🍳</h1>
          <p className="text-slate-400 text-sm">Đang có {orders.length} đơn chờ chế biến</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-500 uppercase">Trạng thái hệ thống</p>
          <div className="flex items-center gap-2 text-green-400 font-bold">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Trực tuyến
          </div>
        </div>
      </header>

      {/* GRID ĐƠN HÀNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
            {/* Header đơn hàng */}
            <div className="bg-slate-700 p-4 flex justify-between items-center">
              <span className="text-2xl font-black text-white">BÀN: {order.table_number}</span>
              <span className="text-xs bg-slate-600 px-2 py-1 rounded-lg text-slate-300 font-bold">
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Danh sách món */}
            <div className="p-4 flex-1 space-y-4">
              {order.items.map((it: any, i: number) => (
                <div key={i} className="flex flex-col border-b border-slate-700/50 pb-2">
                  <div className="flex justify-between items-start">
                    <span className="text-lg font-bold text-slate-100"><span className="text-orange-500 mr-2">{it.qty}x</span> {it.name}</span>
                    {it.level !== null && (
                      <span className="bg-red-600 text-[10px] font-black px-2 py-1 rounded">CẤP {it.level}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Ghi chú khách hàng */}
              {order.note && (
                <div className="bg-orange-900/30 border border-orange-500/30 p-3 rounded-xl">
                  <p className="text-xs font-bold text-orange-400 uppercase mb-1">Ghi chú:</p>
                  <p className="text-sm text-orange-200 italic">"{order.note}"</p>
                </div>
              )}
            </div>

            {/* Nút thao tác */}
            <div className="p-4 bg-slate-800/50 flex gap-2">
              <button 
                onClick={() => printKitchenTicket(order)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                IN PHIẾU
              </button>
              <button 
                onClick={() => markAsDone(order.id)}
                className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-95"
              >
                HOÀN THÀNH
              </button>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💤</div>
          <p className="text-slate-500 font-bold text-xl">Hiện không có đơn hàng nào cần chế biến.</p>
        </div>
      )}
    </div>
  )
}