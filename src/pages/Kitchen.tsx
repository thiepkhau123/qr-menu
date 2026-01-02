import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminConsole() {
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'report'>('orders')

  const loadData = async () => {
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(o || [])
    const { data: m } = await supabase.from('menu_items').select('*').order('name')
    setMenuItems(m || [])
  }

  useEffect(() => {
    loadData()
    const channel = supabase.channel('chef-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const markAsDone = async (id: string) => {
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
  }

  const deleteOrder = async (id: string) => {
    if(confirm("Xóa đơn này?")) await supabase.from('orders').delete().eq('id', id)
  }

  const toggleMenu = async (id: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_available: !current }).eq( 'id', id)
  }

  const todayRevenue = orders
    .filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + o.total, 0)

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter">QUẢN TRỊ CỬA HÀNG 🍜</h1>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
          {(['orders', 'menu', 'report'] as const).map(t => (
            <button 
              key={t} onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400'}`}
            >
              {t === 'orders' ? 'Đơn hàng' : t === 'menu' ? 'Thực đơn' : 'Doanh thu'}
            </button>
          ))}
        </div>
      </header>

      {tab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.filter(o => o.status !== 'done').map(o => (
            <div key={o.id} className="bg-white p-5 rounded-3xl shadow-md border-2 border-orange-100 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-3xl font-black text-gray-900">BÀN {o.table_number}</span>
                  <p className="text-xs text-gray-400 font-medium uppercase mt-1">{new Date(o.created_at).toLocaleTimeString()}</p>
                </div>
                <button onClick={() => deleteOrder(o.id)} className="text-gray-300 hover:text-red-500">✕</button>
              </div>

              <div className="space-y-3 mb-6">
                {o.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-orange-50/50 p-3 rounded-2xl border border-orange-50">
                    <div>
                      <span className="font-bold text-gray-800">{item.name}</span>
                      <span className="ml-2 text-orange-600 font-black text-lg">x{item.qty}</span>
                    </div>
                    <div className="bg-red-600 text-white px-3 py-1 rounded-lg font-black text-sm shadow-sm animate-pulse">
                      CẤP {item.level}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => markAsDone(o.id)}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
              >
                Hoàn thành
              </button>
            </div>
          ))}
          {orders.filter(o => o.status !== 'done').length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-bold">Hiện không có đơn hàng mới nào.</div>
          )}
        </div>
      )}

      {tab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {menuItems.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-3 bg-white border rounded-2xl shadow-sm">
              <img src={item.image_url} className="w-16 h-16 object-cover rounded-xl" />
              <div className="flex-1">
                <p className="font-bold text-gray-800 leading-none">{item.name}</p>
                <p className="text-sm font-black text-orange-600 mt-1">{item.price.toLocaleString()}đ</p>
              </div>
              <button 
                onClick={() => toggleMenu(item.id, item.is_available)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {item.is_available ? 'Đang bán' : 'Hết hàng'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white p-8 rounded-3xl border-2 border-orange-50 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Doanh thu hôm nay</p>
            <h2 className="text-5xl font-black text-gray-900">{todayRevenue.toLocaleString()}<span className="text-orange-500">đ</span></h2>
          </div>
          <div className="bg-white rounded-3xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 font-bold text-gray-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Bàn</th>
                  <th className="p-4 text-left">Thời gian</th>
                  <th className="p-4 text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).map(o => (
                  <tr key={o.id}>
                    <td className="p-4 font-bold">Bàn {o.table_number}</td>
                    <td className="p-4 text-gray-400">{new Date(o.created_at).toLocaleTimeString()}</td>
                    <td className="p-4 text-right font-black text-orange-600">{o.total.toLocaleString()}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}