import './index.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Kitchen from './pages/Kitchen'
import PrintQR from './pages/PrintQR'
import AdminLogin from './pages/admin-login' // Thêm dòng này

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/kitchen" element={<Kitchen />} />
      <Route path="/admin-login" element={<AdminLogin />} /> {/* Thêm dòng này */}
      <Route path="/print-qr" element={<PrintQR />} />
    </Routes>
  </BrowserRouter>
)