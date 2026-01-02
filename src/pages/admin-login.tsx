import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

export default function AdminLogin() {
  const [inputOtp, setInputOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // THÔNG TIN EMAILJS CỦA BẠN (Thay bằng mã bạn lấy ở Bước 1)
  const SERVICE_ID = 'service_vdc7gns';
  const TEMPLATE_ID = 'template_ylhdo06';
  const PUBLIC_KEY = 'BBGCJGfkvK-BZ-Rry';

  const handleSendCode = () => {
    setLoading(true);
    
    // 1. Tạo mã 6 số ngẫu nhiên
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    // 2. Gửi qua EmailJS
    const templateParams = {
      otp_code: code,
      to_email: 'ngocthiep234@gmail.com', // Email nhận thông báo (Email chủ quán)
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
      .then(() => {
        setIsSent(true);
        setLoading(false);
        alert('Mã xác thực đã được gửi về Email của bạn!');
      })
      .catch((err) => {
        setLoading(false);
        console.error('Lỗi EmailJS:', err);
        alert('Không gửi được mã. Kiểm tra lại cấu hình EmailJS.');
      });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputOtp === generatedOtp && generatedOtp !== '') {
      localStorage.setItem('isAdmin', 'true');
      navigate('/kitchen');
    } else {
      alert('Mã xác thực không chính xác!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl border-4 border-orange-500">
        <div className="text-center mb-8">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
            NHƯ NGỌC ADMIN
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase mt-1">
            Khu vực hạn chế truy cập
          </p>
        </div>

        {!isSent ? (
          <button
            onClick={handleSendCode}
            disabled={loading}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:bg-gray-400"
          >
            {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực về điện thoại'}
          </button>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nhập mã xác nhận</label>
              <input
                type="text"
                maxLength={6}
                placeholder="------"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center text-3xl font-black tracking-[10px] focus:border-orange-500 focus:outline-none transition-all"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-200 active:scale-95 transition-all"
            >
              Xác nhận & Vào Bếp
            </button>
            <button 
              type="button"
              onClick={() => setIsSent(false)}
              className="w-full text-[10px] font-black text-gray-400 uppercase underline"
            >
              Gửi lại mã khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
}