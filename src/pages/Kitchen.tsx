import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase' // Kiểm tra kỹ đường dẫn này

// Định nghĩa kiểu dữ liệu
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

export default function AdminConsole() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tab, setTab] = useState<'orders' | 'menu'>('orders')

  // 1. Tải dữ liệu ban đầu
  const loadData = async () => {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(ordersData || [])

    const { data: menuData } = await supabase
      .from('menu_items')
      .select('*')
      .order('name')
    setMenuItems(menuData || [])
  }

  useEffect(() => {
    loadData()

    // 2. Thiết lập Realtime (Nghe đơn hàng mới)
    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // Phát tiếng chuông báo hiệu
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
          audio.play().catch(() => console.log("Yêu cầu tương tác để phát nhạc"))
          
          setOrders(prev => [payload.new as Order, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items' },
        () => loadData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // 3. Các hàm xử lý
  const markAsDone = async (id: string) => {
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'done' } : o))
  }

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
  // 1. Gửi lệnh cập nhật lên Supabase
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: !currentStatus })
    .eq('id', id);

  if (error) {
    // Nếu lỗi (ví dụ do thiếu cột hoặc quyền), nó sẽ báo ở đây
    alert("Lỗi lưu trạng thái: " + error.message);
    return;
  }

  // 2. Chỉ khi lưu thành công mới cập nhật giao diện (State)
  setMenuItems(prev => prev.map(item => 
    item.id === id ? { ...item, is_available: !currentStatus } : item
  ));
};

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-orange-600">Quản Lý Quán 🏪</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setTab('orders')}
            className={`px-4 py-2 rounded-full ${tab === 'orders' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}
          >
            Đơn hàng
          </button>
          <button 
            onClick={() => setTab('menu')}
            className={`px-4 py-2 rounded-full ${tab === 'menu' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}
          >
            Menu
          </button>
        </div>
      </header>

      {/* TAB 1: DANH SÁCH ĐƠN HÀNG */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 && <p className="text-center text-gray-500">Chưa có đơn hàng nào.</p>}
          {orders.map(o => (
            <div key={o.id} className={`border-2 p-4 rounded-xl shadow-sm ${o.status === 'done' ? 'bg-gray-50 border-gray-100' : 'bg-white border-orange-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-lg font-bold text-gray-800">Bàn {o.table_number}</span>
                  <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <span className="font-bold text-orange-600">{o.total.toLocaleString()}đ</span>
              </div>
              
              <div className="bg-orange-50 p-2 rounded mb-3">
                {o.items?.map((item: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    • {item.name} <span className="font-bold">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {o.status !== 'done' ? (
                <button 
                  onClick={() => markAsDone(o.id)}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition"
                >
                  Hoàn thành món
                </button>
              ) : (
                <div className="text-center text-green-600 font-bold py-1 italic">✓ Đã phục vụ</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: QUẢN LÝ CÒN / HẾT MÓN */}
      {tab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {menuItems.map(item => (
            <div key={item.id} className="flex justify-between items-center p-4 border rounded-xl bg-white">
              <div>
                <p className="font-bold text-gray-700">{item.name}</p>
                <p className="text-sm text-gray-400">{item.price.toLocaleString()}đ</p>
              </div>
              <button 
                onClick={() => toggleAvailability(item.id, item.is_available)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {item.is_available ? 'Đang bán' : 'Hết hàng'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}