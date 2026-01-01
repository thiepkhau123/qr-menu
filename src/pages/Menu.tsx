import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Category = {
  id: string
  name: string
}

type MenuItem = {
  id: string
  name: string
  price: number
  description: string
  category_id: string
}

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort')

    const { data: menu } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)

    setCategories(cats || [])
    setItems(menu || [])
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>📋 Menu</h1>

      {categories.map(cat => (
        <div key={cat.id}>
          <h2>{cat.name}</h2>

          {items
            .filter(i => i.category_id === cat.id)
            .map(i => (
              <div
                key={i.id}
                style={{
                  borderBottom: '1px solid #eee',
                  padding: '8px 0'
                }}
              >
                <strong>{i.name}</strong> – {i.price.toLocaleString()}đ
                <div style={{ fontSize: 13, color: '#666' }}>
                  {i.description}
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
