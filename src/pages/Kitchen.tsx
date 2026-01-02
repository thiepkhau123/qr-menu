import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Order = {
  id: string
  table_number: string
  total: number
  status: string
  items: any[]
  created_at: string
}

type MenuItem = {
  id: string
  name: string
  price: number
  is_available: boolean
}

export default function AdminFullConsole() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'report'>('orders')

  const loadData = async () => {
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(ordersData || [])

    const { data: menuData } = await supabase.from('menu_items').select('*').order('name')
    setMenuItems(menuData || [])
  }

  useEffect(() => {
    loadData()
    const channel = supabase.channel('admin-full-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {})
        setOrders(prev => [payload.new as Order, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Xử lý đơn hàng
  const markAsDone = async (id: string) => {
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'done' } : o))
  }

  // Xóa đơn đã xong (Dọn màn hình)
  const clearDoneOrders = async () => {
    if (confirm("Bạn có muốn ẩn tất cả đơn đã hoàn thành không?")) {
      const { error } = await supabase.from('orders').delete().eq('status', 'done')
      if (!error) setOrders(orders.filter(o => o.status !== 'done'))
    }
  }

  // Quản lý món
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id)
    if (!error) {
      setMenuItems(menuItems.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item))
    }
  }

  // Tính toán thống kê
  const todayRevenue = orders
    .filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 font-sans text-gray-800">
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-black text-orange-600">HỆ THỐNG QUẢN LÝ 🏪</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['orders', 'menu', 'report'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === t ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
              {t === 'orders' ? 'Đơn hàng' : t === 'menu' ? 'Món ăn' : 'Báo cáo'}
            </button>
          ))}
        </div>
      </header>

      {/* TAB 1: ĐƠN HÀNG */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <button onClick={clearDoneOrders} className="text-sm text-gray-500 underline mb-2">Dọn dẹp đơn đã xong</button>
          {orders.filter(o => o.status !== 'deleted').map(o => (
            <div key={o.id} className={`p-4 rounded-2xl border-2 transition ${o.status === 'done' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-orange-200 shadow-md'}`}>
              <div className="flex justify-between mb-2">
                <span className="text-lg font-black">BÀN {o.table_number}</span>
                <span className="font-bold text-orange-600">{o.total.toLocaleString()}đ</span>
              </div>
              <div className="space-y-1 mb-3 bg-gray-50 p-3 rounded-xl text-sm">
                {o.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name} <b className="text-orange-600">x{item.quantity || item.qty}</b></span>
                    <span>{(item.price * (item.quantity || item.qty)).toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
              {o.status !== 'done' && (
                <button onClick={() => markAsDone(o.id)} className="w-full bg-orange-500 text-white py-3 rounded-xl font-black shadow-lg shadow-orange-100 uppercase tracking-tighter">Hoàn thành & Giao món</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: MENU */}
      {tab === 'menu' && (
        <div className="grid grid-cols-1 gap-3">
          {menuItems.map(item => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-white border rounded-2xl shadow-sm">
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-orange-600 font-bold">{item.price.toLocaleString()}đ</p>
              </div>
              <button onClick={() => toggleAvailability(item.id, item.is_available)} className={`px-6 py-2 rounded-xl font-bold transition ${item.is_available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {item.is_available ? 'Đang bán' : 'Hết hàng'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: BÁO CÁO */}
      {tab === 'report' && (
        <div className="space-y-6 text-center">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-3xl text-white shadow-xl">
            <p className="opacity-80 uppercase text-xs font-bold tracking-widest mb-2">Doanh thu hôm nay</p>
            <h2 className="text-4xl font-black">{todayRevenue.toLocaleString()} VNĐ</h2>
            <p className="mt-2 text-sm italic">{orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length} đơn hàng</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold mb-4 text-left">💡 Mẹo quản lý</h3>
            <ul className="text-left text-sm text-gray-500 space-y-2">
              <li>• Kiểm tra đơn hàng thường xuyên để đảm bảo món ra đúng bàn.</li>
              <li>• Cập nhật trạng thái "Hết hàng" ngay khi bếp hết nguyên liệu.</li>
              <li>• Cuối ngày nên dùng nút "Dọn dẹp đơn" để trang web chạy nhanh hơn.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}