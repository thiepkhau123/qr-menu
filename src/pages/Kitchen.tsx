import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom';

type OrderStatus = 'pending' | 'done' | 'all';
type ReportPeriod = 'day' | 'week' | 'month' | 'all';

interface ProductForm {
  id: string;
  name: string;
  price: number;
  image_url: string;
  note: string;
  is_available: boolean;
  category: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'report'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<OrderStatus>('pending')
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('day')
  const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0, reportData: [] as any[] })
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>({
    id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: 'Nhập Loại Sản Phẩm'
  })
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [audio] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  // --- KIỂM TRA QUYỀN TRUY CẬP ---
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/admin-login');
    } else {
      setIsAuthorized(true);
    }
  }, [navigate]);

  // --- CÁC HÀM FETCH DỮ LIỆU (Đã bọc useCallback để hết báo đỏ) ---
  const fetchReport = useCallback(async () => {
    const now = new Date();
    let query = supabase.from('orders').select('*').eq('status', 'done');
    if (reportPeriod !== 'all') {
      let startDate = new Date();
      if (reportPeriod === 'day') startDate.setHours(0, 0, 0, 0);
      else if (reportPeriod === 'week') startDate.setDate(now.getDate() - 7);
      else if (reportPeriod === 'month') startDate.setMonth(now.getMonth() - 1);
      query = query.gte('created_at', startDate.toISOString());
    }
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setStats(prev => ({ ...prev, totalRevenue: data.reduce((acc, o) => acc + o.total, 0), reportData: data }));
  }, [reportPeriod]);

  const fetchOrders = useCallback(async () => {
    let query = supabase.from('orders').select('*')
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    const { data } = await query.order('created_at', { ascending: false })
    if (data) {
      setOrders(data)
      const { data: allData } = await supabase.from('orders').select('status')
      if (allData) setStats(prev => ({ ...prev, pendingCount: allData.filter(o => o.status === 'pending').length }));
    }
  }, [filterStatus])

  const fetchMenu = useCallback(async () => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false })
    if (data) setMenuItems(data)
  }, [])

  // --- REALTIME SYNC (Chỉ dùng 1 useEffect duy nhất) ---
  useEffect(() => {
    if (!isAuthorized) return;

    // Load dữ liệu lần đầu
    fetchOrders();
    fetchMenu();
    fetchReport();

    const channel = supabase.channel('admin_sync_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT' && isSoundEnabled) {
          audio.play().catch(() => console.log("Yêu cầu tương tác để phát nhạc"));
        }
        fetchOrders();
        fetchReport();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [isAuthorized, fetchOrders, fetchMenu, fetchReport, isSoundEnabled, audio]);

  // --- XỬ LÝ NGHIỆP VỤ ---
  const handlePrint = (order: any) => {
    const BANK_ID = 'vcb';
    const ACCOUNT_NO = '1014363257';
    const ACCOUNT_NAME = 'KHAU TRAN NGOC THIEP';
    const description = encodeURIComponent(`Ban ${order.table_number} thanh toan`);
    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${order.total}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map((it: any) => {
      // Kiểm tra nếu tên món có chữ "Mì cay"
      const isMiCay = it.name.toLowerCase().includes('mì cay');
      // Chỉ hiển thị cấp nếu là mì cay và giá trị level hợp lệ
      const levelDisplay = (isMiCay && it.level !== undefined && it.level !== null)
        ? `(Cấp ${it.level})`
        : '';

      return `
    <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; font-family: sans-serif;">
      <span>${it.qty}x ${it.name} ${levelDisplay}</span>
      <span>${(it.price * it.qty).toLocaleString()}đ</span>
    </div>
  `;
    }).join('');

    printWindow.document.write(`
      <html>
      <head>
        <title>Bill Bàn ${order.table_number}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 10px; width: 280px; margin: auto; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .shop-name { font-size: 18px; font-weight: 900; margin: 0; }
          .info-line { font-size: 11px; margin: 2px 0; }
          .title { font-size: 14px; margin: 10px 0; text-transform: uppercase; font-weight: bold; }
          .table-header { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; font-weight: bold; }
          .total-section { border-top: 1px dashed #000; margin-top: 10px; padding-top: 8px; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 3px; }
          .final-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 11px; font-style: italic; }
          .qr-container { text-align: center; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px; }
          .qr-code { width: 130px; filter: grayscale(100%); }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="shop-name">NHƯ NGỌC QUÁN</div>
          <div class="info-line">ĐC: 42 Phạm Văn Đồng, Bình Sơn, Quảng Ngãi</div>
          <div class="info-line">SĐT: 0862210623</div>
          <div class="title">HOÁ ĐƠN THANH TOÁN</div>
          <div class="info-line">Ngày: ${new Date().toLocaleDateString('vi-VN')} - Giờ: ${new Date().toLocaleTimeString('vi-VN')}</div>
          <div class="info-line bold">Bàn: ${order.table_number}</div>
        </div>

        <div class="table-header">
          <div style="flex: 1;">Tên món</div>
          <div style="width: 30px; text-align: center;">SL</div>
          <div style="width: 70px; text-align: right;">T.Tiền</div>
        </div>

        <div>${itemsHtml}</div>

        <div class="total-section">
          <div class="total-row">
            <span>Tổng thành tiền:</span>
            <span>${order.total.toLocaleString()}</span>
          </div>
          <div class="final-total">
            <span>TỔNG CỘNG:</span>
            <span>${order.total.toLocaleString()}đ</span>
          </div>
        </div>

        <div class="qr-container">
          <img src="${qrUrl}" class="qr-code" />
          <div style="font-size: 10px; margin-top: 5px; font-weight: bold;">QUÉT MÃ ĐỂ THANH TOÁN</div>
        </div>

        <div class="footer">
          Xin cảm ơn, hẹn gặp lại quý khách!<br>
          WIFI: nhu-ngoc-quan / MK: 88888888
        </div>

        <script>
          window.onload = () => { 
            window.print(); 
            setTimeout(() => window.close(), 500); 
          }
        </script>
      </body>
    </html>
    `);
    printWindow.document.close();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, ...dataToSave } = productForm;
      const finalPayload = {
        name: dataToSave.name.trim(),
        price: Number(dataToSave.price) || 0,
        category: dataToSave.category || 'Nhập Loại Sản Phẩm',
        image_url: dataToSave.image_url || '',
        note: dataToSave.note || '',
        is_available: dataToSave.is_available ?? true
      };

      if (isEditing) {
        const { error } = await supabase.from('menu_items').update(finalPayload).eq('id', id);
        if (error) throw error;
        alert('Đã cập nhật!');
      } else {
        const { error } = await supabase.from('menu_items').insert([finalPayload]);
        if (error) throw error;
        alert('Đã thêm món mới!');
      }

      setProductForm({ id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: 'Nhập Loại Sản Phẩm' });
      setIsEditing(false);
      fetchMenu();
    } catch (error: any) {
      alert('Lỗi: ' + error.message);
    }
  };

  const markAsDone = async (orderId: string) => {
    await supabase.from('orders').update({ status: 'done' }).eq('id', orderId);
    fetchOrders();
    fetchReport();
  }

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id);
    fetchMenu();
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/admin-login');
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 pb-20 font-sans">
      <nav className="bg-white border-b sticky top-0 z-50 p-2 md:p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col gap-2 md:flex-row md:justify-between md:items-center">

          {/* Dòng 1: Logo và Tabs (Tối ưu để không bị tràn) */}
          <div className="flex items-center justify-between md:justify-start gap-2">
            <h1 className="font-black text-orange-600 text-xl sm:text-2xl md:text-4xl uppercase italic tracking-tighter shrink-0 leading-none">
              NHƯ NGỌC ADMIN
            </h1>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(['orders', 'menu'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1.5 sm:px-3 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
                    }`}
                >
                  {tab === 'orders' ? 'Đơn Hàng' : 'Thực Đơn'}
                </button>
              ))}
            </div>
          </div>

          {/* Dòng 2: Doanh thu và Tiện ích (Tự động canh lề theo màn hình) */}
          <div className="flex items-center justify-between md:justify-end gap-3 border-t pt-2 md:border-none md:pt-0">
            <div
              className="flex items-center gap-2 cursor-pointer bg-green-50 px-3 py-1 rounded-xl"
              onClick={() => setActiveTab('report')}
            >
              <p className="text-[8px] font-bold text-green-600 uppercase leading-none">Doanh thu:</p>
              <p className="text-sm md:text-lg font-black text-green-700 leading-none">
                {stats.totalRevenue.toLocaleString()}đ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`p-2 rounded-xl transition-all ${isSoundEnabled ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {isSoundEnabled ? "🔔" : "🔕"}
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-500 py-2 px-3 rounded-xl flex items-center gap-2 hover:bg-red-500 hover:text-white active:scale-95 transition-all shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>

                {/* Đã xóa hidden để chữ luôn xuất hiện */}
                <span className="text-[11px] font-black uppercase tracking-tighter">
                  Đăng xuất
                </span>
              </button>
            </div>
          </div>

        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4">
        {activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-2">
                {(['pending', 'done', 'all'] as OrderStatus[]).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                    {s === 'pending' ? `Chờ (${stats.pendingCount})` : s === 'done' ? 'Đã xong' : 'Tất cả'}
                  </button>
                ))}
              </div>
              <button onClick={() => setHiddenOrderIds(prev => [...prev, ...orders.filter(o => o.status === 'done').map(o => o.id)])}
                className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase">
                👁️ Ẩn đơn cũ
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {orders.filter(o => !hiddenOrderIds.includes(o.id)).map(o => (
                <div key={o.id} className={`bg-white rounded-[2rem] hover-card duration-300 hover:shadow-xl hover:-translate-y-1 border-2 flex flex-col overflow-hidden transition-all ${o.status === 'pending' ? 'border-orange-500 shadow-md scale-[1.01]' : 'border-gray-100 opacity-60'}`}>
                  <div className={`p-4 flex justify-between items-center ${o.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white'}`}>
                    <b className="italic font-black uppercase tracking-tighter text-base">Bàn {o.table_number}</b>
                    <span className="text-[10px] font-bold bg-black/10 px-2 py-1 rounded-lg">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="p-4 flex-1 space-y-2">
                    {o.items?.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs font-bold border-b border-gray-50 pb-1.5">
                        <span className="text-gray-700">{it.qty}x {it.name} {it.level && <span className="text-red-500">🌶️{it.level}</span>}</span>
                        <span className="text-gray-400">{(it.price * it.qty).toLocaleString()}đ</span>
                      </div>
                    ))}
                    {o.note && <p className="text-[10px] bg-amber-50 p-2 rounded-lg text-amber-700 italic border border-amber-100">Ghi chú: {o.note}</p>}
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400 uppercase text-[9px] font-bold">Tổng tiền</span>
                      <span className="font-black text-lg text-orange-600">{o.total.toLocaleString()}đ</span>
                    </div>
                    <button onClick={() => handlePrint(o)} className="w-full py-3 bg-white border-2 border-orange-200 rounded-xl text-[11px] font-black uppercase text-orange-600 shadow-sm hover:bg-orange-50 hover:border-orange-400 transition-colors">
                      🖨️ In Hóa Đơn
                    </button>
                    {o.status === 'pending' && (
                      <button onClick={() => markAsDone(o.id)} className="w-full py-3 rounded-xl text-[11px] font-black uppercase bg-orange-600 text-white shadow-lg">
                        Hoàn thành
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'report' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-center gap-2">
              {[{ id: 'day', label: 'Hôm nay' }, { id: 'week', label: '7 Ngày qua' }, { id: 'month', label: 'Tháng này' }, { id: 'all', label: 'Tất cả' }].map((p) => (
                <button key={p.id} onClick={() => setReportPeriod(p.id as ReportPeriod)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${reportPeriod === p.id ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-[2.5rem] p-6 border-2 border-gray-100 shadow-sm overflow-x-auto">
              <div className="flex justify-between items-end mb-8 border-b pb-4">
                <h2 className="text-lg font-black uppercase italic tracking-tighter">Doanh thu chi tiết</h2>
                <div className="text-right font-black text-green-600 text-3xl">{stats.totalRevenue.toLocaleString()}đ</div>
              </div>
              <table className="w-full text-left">
                <thead><tr className="text-[10px] font-black text-gray-400 uppercase border-b"><th className="pb-4">Ngày giờ</th><th className="pb-4">Bàn</th><th className="pb-4">Nội dung</th><th className="pb-4 text-right">Tiền</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.reportData.map((o) => (
                    <tr key={o.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                      <td className="py-4 text-gray-400 font-normal">{new Date(o.created_at).toLocaleString()}</td>
                      <td className="py-4 text-orange-600">Bàn {o.table_number}</td>
                      <td className="py-4 text-gray-600 truncate max-w-[200px]">{o.items.map((it: any) => `${it.qty}${it.name}`).join(', ')}</td>
                      <td className="py-4 text-right font-black">{o.total.toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <form
                onSubmit={handleSave}
                className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-gray-100 shadow-sm md:sticky md:top-24"
              >
                <h2 className="text-base md:text-lg font-black uppercase mb-4 md:mb-6 italic tracking-tighter">
                  {isEditing ? 'Cập nhật món' : 'Thêm món mới'}
                </h2>

                <div className="space-y-3 md:space-y-4">
                  {/* Tất cả các ô nhập liệu được đổi từ text-sm sang text-base (16px) 
         để ngăn iPhone tự động zoom gây vỡ layout 
      */}
                  <input
                    type="text"
                    placeholder="Tên món"
                    className="w-full h-12 p-3.5 bg-gray-50 border-none rounded-2xl text-base md:text-sm font-bold focus:ring-2 focus:ring-orange-500 appearance-none"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />

                  <input
                    type="number"
                    placeholder="Giá tiền"
                    className="w-full h-12 p-3.5 bg-gray-50 border-none rounded-2xl text-base md:text-sm font-bold focus:ring-2 focus:ring-orange-500 appearance-none"
                    value={productForm.price || ''}
                    onChange={e => setProductForm({ ...productForm, price: parseInt(e.target.value) })}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Nhóm"
                    className="w-full h-12 p-3.5 bg-gray-50 border-none rounded-2xl text-base md:text-sm font-bold appearance-none"
                    value={productForm.category}
                    onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Link ảnh"
                    className="w-full h-12 p-3.5 bg-gray-50 border-none rounded-2xl text-base md:text-sm font-bold appearance-none"
                    value={productForm.image_url}
                    onChange={e => setProductForm({ ...productForm, image_url: e.target.value })}
                  />

                  <textarea
                    placeholder="Ghi chú"
                    className="w-full p-3.5 bg-gray-50 border-none rounded-2xl text-base md:text-sm font-bold min-h-[80px] appearance-none"
                    value={productForm.note}
                    onChange={e => setProductForm({ ...productForm, note: e.target.value })}
                  />

                  <button
                    type="submit"
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-xs md:text-[11px] uppercase shadow-lg active:scale-95 transition-transform"
                  >
                    {isEditing ? 'LƯU THAY ĐỔI' : 'THÊM VÀO MENU'}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setProductForm({ id: '', name: '', price: 0, image_url: '', note: '', is_available: true, category: '(Nhập Loại Sản Phẩm)' });
                      }}
                      className="w-full py-2 text-[10px] font-black text-gray-400 uppercase underline"
                    >
                      Hủy bỏ
                    </button>
                  )}
                </div>
              </form>
            </div>
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.map(p => (
                  <div key={p.id} className={`bg-white p-3 rounded-[2rem] border-2 flex gap-4 items-center ${p.is_available ? 'border-gray-50 shadow-sm' : 'grayscale opacity-60 bg-gray-50'}`}>
                    <img src={p.image_url || 'https://via.placeholder.com/100'} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase truncate">{p.name}</h4>
                      <p className="text-orange-600 font-black text-xs">{p.price.toLocaleString()}đ</p>
                      <div className="flex gap-3 mt-2">
                        <button onClick={() => { setIsEditing(true); setProductForm(p); }} className="text-[10px] font-black text-blue-500 uppercase underline">Sửa</button>
                        <button onClick={() => toggleAvailability(p.id, p.is_available)} className={`text-[10px] font-black uppercase underline ${p.is_available ? 'text-amber-500' : 'text-green-600'}`}>{p.is_available ? 'Hết' : 'Mở'}</button>
                        <button onClick={() => { if (confirm('Xóa?')) supabase.from('menu_items').delete().eq('id', p.id).then(() => fetchMenu()) }} className="text-[10px] font-black text-red-500 uppercase underline ml-auto">Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}