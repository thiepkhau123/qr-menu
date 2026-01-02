import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminConsole() {
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'report'>('orders')
  const [isSoundOn, setIsSoundOn] = useState(true)
  const [newItem, setNewItem] = useState({ name: '', price: 0, image_url: '', description: '' })

  const loadData = async () => {
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(o || [])
    const { data: m } = await supabase.from('menu_items').select('*').order('name')
    setMenuItems(m || [])
  }

  useEffect(() => {
    loadData()
    const channel = supabase.channel('admin-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (isSoundOn) {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {})
        }
        setOrders(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isSoundOn])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('menu_items').insert([newItem])
    if (!error) {
      alert("Đã thêm món!");
      setNewItem({ name: '', price: 0, image_url: '', description: '' })
      loadData()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black">QUẢN LÝ 🏪</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsSoundOn(!isSoundOn)} className="bg-white p-2 rounded-xl shadow-sm border text-sm">
            {isSoundOn ? '🔔 Chuông: Bật' : '🔕 Tắt'}
          </button>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border">
            <button onClick={() => setTab('orders')} className={`px-4 py-1 rounded-lg text-sm font-bold ${tab === 'orders' ? 'bg-orange-600 text-white' : ''}`}>Đơn</button>
            <button onClick={() => setTab('menu')} className={`px-4 py-1 rounded-lg text-sm font-bold ${tab === 'menu' ? 'bg-orange-600 text-white' : ''}`}>Món</button>
          </div>
        </div>
      </header>

      {tab === 'menu' && (
        <div className="space-y-6">
          <form onSubmit={handleAddItem} className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
            <h3 className="font-bold text-sm uppercase">Thêm món mới</h3>
            <input type="text" placeholder="Tên món" className="w-full p-2 border rounded-lg text-sm" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input type="number" placeholder="Giá" className="w-full p-2 border rounded-lg text-sm" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
            <input type="text" placeholder="Link ảnh" className="w-full p-2 border rounded-lg text-sm" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
            <button type="submit" className="w-full bg-black text-white py-2 rounded-lg font-bold">LƯU MÓN</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-3 border shadow-sm">
                <img src={item.image_url} className="w-12 h-12 object-cover rounded-lg" />
                <div className="flex-1 font-bold text-sm">{item.name}</div>
                <button 
                  onClick={() => supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id).then(loadData)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {item.is_available ? 'ĐANG BÁN' : 'HẾT'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.filter(o => o.status !== 'done').map(o => (
            <div key={o.id} className="bg-white p-4 rounded-3xl border-2 border-orange-100 shadow-sm relative">
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl font-black">BÀN {o.table_number}</span>
                <button onClick={() => supabase.from('orders').update({ status: 'done' }).eq('id', o.id).then(loadData)} className="bg-green-600 text-white px-4 py-1 rounded-lg font-bold text-sm">XONG</button>
              </div>
              <div className="space-y-1">
                {o.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm bg-gray-50 p-2 rounded-lg">
                    <span>{it.name} x{it.qty}</span>
                    <span className="font-black text-red-600">CẤP {it.level}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}