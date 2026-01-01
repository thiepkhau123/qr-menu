import { QRCodeSVG } from 'qrcode.react'

const TABLES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function PrintQR() {
  const baseUrl = window.location.origin

  return (
    <div className="p-6 grid grid-cols-2 gap-6 print:grid-cols-3">
      {TABLES.map(t => (
        <div
          key={t}
          className="border p-4 flex flex-col items-center"
        >
          <h2 className="font-bold text-lg mb-2">BÀN {t}</h2>

          <QRCodeSVG
            value={`${baseUrl}/?table=${t}`}
            size={180}
          />

          <p className="mt-2 text-sm">
            Quét QR để gọi món
          </p>
        </div>
      ))}
    </div>
  )
}
