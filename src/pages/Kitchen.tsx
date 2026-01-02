import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminFullConsole() {
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'report'>('orders')
  const [isSoundOn, setIsSoundOn] = useState(true) // Bật/tắt chuông
  const [newItem, setNewItem] = useState({ name: '', price: 0, image_url: '', description: '' })

  const loadData = async () => {
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(o || [])
    const { data: m } = await supabase.from('menu_items').select('*').order('name')
    setMenuItems(m || [])
  }

  useEffect(() => {
    loadData()
    const channel = supabase.channel('chef-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (isSoundOn) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {})
        }
        setOrders(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isSoundOn])

  const addNewItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name || !newItem.price) return alert("Nhập tên và giá!")
    const { error } = await supabase.from('menu_items').insert([newItem])
    if (!error) {
      alert("Đã thêm món mới!");
      setNewItem({ name: '', price: 0, image_url: '', description: '' })
    }
  }

  const deleteItem = async (id: string) => {
    if (confirm("Xóa vĩnh viễn món này?")) await supabase.from('menu_items').delete().eq('id', id)
  }

  // Các hàm cũ markAsDone, toggleMenu giữ nguyên...
  const markAsDone = async (id: string) => {
    await supabase.from('orders').update({ status: 'done' }).eq('id', id)
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'done' } : o))
  }

  return (
    <div className="max-w-5xl mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black">QUẢN LÝ 🏪</h1>
        <div className="flex gap-2">
          {/* NÚT BẬT TẮT CHUÔNG */}
          <button 
            onClick={() => setIsSoundOn(!isSoundOn)}
            className={`p-2 rounded-xl border transition ${isSoundOn ? 'bg-orange-100 border-orange-200' : 'bg-gray-100 border-gray-200 grayscale'}`}
          >
            {isSoundOn ? '🔔 Chuông: Bật' : '🔕 Chuông: Tắt'}
          </button>
          <div className="bg-white p-1 rounded-xl border flex">
            <button onClick={() => setTab('orders')} className={`px-4 py-1 rounded-lg font-bold ${tab === 'orders' ? 'bg-orange-600 text-white' : ''}`}>Đơn</button>
            <button onClick={() => setTab('menu')} className={`px-4 py-1 rounded-lg font-bold ${tab === 'menu' ? 'bg-orange-600 text-white' : ''}`}>Món</button>
          </div>
        </div>
      </header>

      {tab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FORM THÊM MÓN MỚI */}
          <form onSubmit={addNewItem} className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200 h-fit">
            <h2 className="font-bold mb-4 uppercase text-sm">Thêm món mới</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Tên món (Mì cay bò...)" className="w-full p-2 border rounded-lg" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <input type="number" placeholder="Giá tiền" className="w-full p-2 border rounded-lg" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
              <input type="text" placeholder="Link ảnh (https://...)" className="w-full p-2 border rounded-lg" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
              <button type="submit" className="w-full bg-black text-white py-2 rounded-lg font-bold">LƯU MÓN</button>
            </div>
          </form>

          {/* DANH SÁCH MÓN ĐỂ QUẢN LÝ */}
          <div className="md:col-span-2 space-y-2">
            {menuItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border">
                <img src={item.image_url} className="w-12 h-12 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs text-orange-600">{item.price.toLocaleString()}đ</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => deleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-500">🗑️</button>
                   <button 
                    onClick={() => supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id).then(loadData)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {item.is_available ? 'CÒN' : 'HẾT'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Orders giữ nguyên logic hiển thị đơn hàng như trước... */}
      {tab === 'orders' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {orders.filter(o => o.status !== 'done').map(o => (
               <div key={o.id} className="bg-white p-4 rounded-2xl border-2 border-orange-100">
                  <div className="flex justify-between mb-4">
                     <span className="text-2xl font-black">BÀN {o.table_number}</span>
                     <button onClick={() => markAsDone(o.id)} className="bg-green-600 text-white px-4 py-1 rounded-lg font-bold">XONG</button>
                  </div>
                  {o.items.map((it: any, i: number) => (
                     <p key={i} className="text-sm border-b py-1 flex justify-between">
                        <span>{it.name} x{it.qty}</span>
                        <span className="font-black text-red-600">CẤP {it.level}</span>
                     </p>
                  ))}
               </div>
            ))}
         </div>
      )}
    </div>
  )
}