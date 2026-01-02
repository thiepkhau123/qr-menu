import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminConsole() {
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tab, setTab] = useState<'orders' | 'menu'>('orders')
  const [itemForm, setItemForm] = useState({ id: '', name: '', price: 0, image_url: '' })

  const loadData = async () => {
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(o || [])
    const { data: m } = await supabase.from('menu_items').select('*').order('name')
    setMenuItems(m || [])
  }

  useEffect(() => { loadData() }, [])

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name: itemForm.name, price: itemForm.price, image_url: itemForm.image_url, is_available: true }
    
    if (itemForm.id) {
      await supabase.from('menu_items').update(payload).eq('id', itemForm.id)
    } else {
      await supabase.from('menu_items').insert([payload])
    }
    setItemForm({ id: '', name: '', price: 0, image_url: '' })
    loadData()
  }

  return (
    <div className="max-w-5xl mx-auto p-4 bg-gray-50 min-h-screen">
      <nav className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit">
        <button onClick={() => setTab('orders')} className={`px-6 py-2 rounded-xl font-bold ${tab === 'orders' ? 'bg-orange-600 text-white' : ''}`}>ĐƠN HÀNG</button>
        <button onClick={() => setTab('menu')} className={`px-6 py-2 rounded-xl font-bold ${tab === 'menu' ? 'bg-orange-600 text-white' : ''}`}>THỰC ĐƠN</button>
      </nav>

      {tab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.filter(o => o.status !== 'done').map(o => (
            <div key={o.id} className="bg-white p-6 rounded-[2rem] border-2 border-orange-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-black italic">BÀN {o.table_number}</h2>
                <button onClick={() => supabase.from('orders').update({ status: 'done' }).eq('id', o.id).then(loadData)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold">HOÀN TẤT</button>
              </div>
              <div className="space-y-2 mb-4">
                {o.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between bg-gray-50 p-2 rounded-lg text-sm">
                    <span>{it.name} <b>x{it.qty}</b></span>
                    {it.level !== null && <span className="font-black text-red-600">Cấp {it.level}</span>}
                  </div>
                ))}
              </div>
              {/* HIỂN THỊ GHI CHÚ CỦA KHÁCH */}
              {o.note && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-[10px] font-black text-yellow-600 uppercase">📝 Ghi chú:</p>
                  <p className="text-sm italic font-bold text-gray-700">"{o.note}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSaveItem} className="bg-white p-6 rounded-3xl shadow-sm border h-fit space-y-4">
            <h3 className="font-black uppercase">{itemForm.id ? 'Sửa món' : 'Thêm món mới'}</h3>
            <input type="text" placeholder="Tên món" className="w-full p-3 bg-gray-50 rounded-xl" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            <input type="number" placeholder="Giá" className="w-full p-3 bg-gray-50 rounded-xl" value={itemForm.price || ''} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})} />
            <input type="text" placeholder="Link ảnh" className="w-full p-3 bg-gray-50 rounded-xl" value={itemForm.image_url} onChange={e => setItemForm({...itemForm, image_url: e.target.value})} />
            <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black">LƯU MÓN</button>
          </form>
          <div className="lg:col-span-2 space-y-2">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 border">
                <img src={item.image_url} className="w-12 h-12 object-cover rounded-lg" alt="" />
                <div className="flex-1 font-bold text-sm">{item.name}</div>
                <button onClick={() => setItemForm(item)} className="text-blue-600 font-bold text-xs">Sửa</button>
                <button onClick={() => { if(confirm('Xóa?')) supabase.from('menu_items').delete().eq('id', item.id).then(loadData)}} className="text-red-500 font-bold text-xs">Xóa</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}