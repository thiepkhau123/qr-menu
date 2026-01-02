import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Dùng useNavigate thay cho useRouter

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin@123') {
      localStorage.setItem('isAdmin', 'true');
      navigate('/kitchen'); // Chuyển hướng
    } else {
      alert('Sai mật khẩu rồi bạn ơi! ❌');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm border-2 border-orange-500">
        <h1 className="text-xl font-black text-center uppercase italic text-orange-600 mb-6 tracking-tighter">NHƯ NGỌC ADMIN</h1>
        <input 
          type="password" 
          placeholder="Nhập mã xác thực" 
          className="w-full p-4 bg-gray-100 border-none rounded-2xl mb-4 font-bold focus:ring-2 focus:ring-orange-500 text-center"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">
          Đăng nhập
        </button>
      </form>
    </div>
  );
}