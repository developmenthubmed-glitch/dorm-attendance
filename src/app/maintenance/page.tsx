export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/30 p-8 text-center shadow-xl backdrop-blur-md border border-white/40">
        <div className="text-5xl mb-4">🛠️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">ขณะนี้ระบบปิดปรับปรุง</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          ขออภัยในความไม่สะดวก อาจารย์และผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบหอพัก กรุณาเข้าใช้งานใหม่ใหม่อีกครั้งในภายหลัง
        </p>
      </div>
    </div>
  );
}