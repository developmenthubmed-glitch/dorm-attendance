"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminSettings() {
  // กล่องความจำสำหรับเก็บค่าตั้งค่าระบบต่างๆ
  const [systemName, setSystemName] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [dormLatitude, setDormLatitude] = useState('');
  const [dormLongitude, setDormLongitude] = useState('');
  const [allowedRadius, setAllowedRadius] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  // 1. ดึงค่าตั้งค่าปัจจุบันจากตาราง system_settings (id = 1)
  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        setSystemName(data.system_name);
        setMaintenanceMode(data.maintenance_mode);
        setMaintenanceMessage(data.maintenance_message);
        setDormLatitude(data.dorm_latitude.toString());
        setDormLongitude(data.dorm_longitude.toString());
        setAllowedRadius(data.allowed_radius_meters.toString());
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. ฟังก์ชันอัปเดตข้อมูลการตั้งค่าและบันทึก Audit Log เพื่อความปลอดภัย
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบผู้ใช้งาน กรุณาล็อกอินใหม่');

      // อัปเดตค่าลงตารางดิบ
      const { error } = await supabase
        .from('system_settings')
        .update({
          system_name: systemName,
          maintenance_mode: maintenanceMode,
          maintenance_message: maintenanceMessage,
          dorm_latitude: parseFloat(dormLatitude),
          dorm_longitude: parseFloat(dormLongitude),
          allowed_radius_meters: parseInt(allowedRadius),
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;

      // บันทึก Audit Log ทุกครั้งที่มีการเปลี่ยนโครงสร้างระบบ
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entity_type: 'system_settings',
        entity_id: null,
        details: `แอดมินแก้ไขการตั้งค่าระบบ: ชื่อระบบ=${systemName}, ปิดปรับปรุง=${maintenanceMode}, รัศมี=${allowedRadius} เมตร`,
        user_agent: navigator.userAgent.substring(0, 100)
      });

      setMessage('✅ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!');
    } catch (err: any) {
      setMessage(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-700 font-medium">กำลังโหลดข้อมูลการตั้งค่าระบบ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* ลิงก์นำทางด้านบน */}
      <div className="max-w-3xl mx-auto mb-4 flex justify-between">
        <a href="/admin/users" className="text-sm font-semibold text-blue-600 hover:underline">
          👥 ไปหน้าจัดการผู้ใช้งาน
        </a>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl bg-white/30 p-8 shadow-xl backdrop-blur-md border border-white/40">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">⚙️ ตั้งค่าระบบส่วนกลาง</h1>
          <p className="text-sm text-gray-600 mb-6">ควบคุมการเปิด/ปิดระบบ พิกัดจีพีเอส และความปลอดภัยของหอพัก</p>

          {message && (
            <div className={`mb-6 p-4 rounded-xl text-center font-semibold ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* ส่วนที่ 1: ตั้งค่าทั่วไป */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">ข้อมูลทั่วไป</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อระบบของวิทยาลัย</label>
                <input type="text" required value={systemName} onChange={(e) => setSystemName(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* ส่วนที่ 2: โหมดปิดปรับปรุงระบบ (Maintenance Mode) */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">🛠️ โหมดปิดปรับปรุงระบบ</h3>
                  <p className="text-xs text-amber-600 mt-0.5">เมื่อเปิดใช้งาน ทุกคนยกเว้นแอดมินจะไม่สามารถใช้งานระบบได้</p>
                </div>
                {/* สวิตช์เปิด/ปิด */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {maintenanceMode && (
                <div>
                  <label className="block text-xs font-medium text-amber-800 mb-1">ข้อความแจ้งเตือนผู้ใช้งาน</label>
                  <textarea required rows={2} value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} className="w-full rounded-xl border-none bg-white/70 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              )}
            </div>

            {/* ส่วนที่ 3: ตั้งค่าพิกัดหอพักและรัศมี GPS */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">📍 พิกัดหอพักและขอบเขตพื้นที่ที่อนุญาต</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ละติจูดหอพัก (Latitude)</label>
                  <input type="number" step="any" required value={dormLatitude} onChange={(e) => setDormLatitude(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ลองจิจูดหอพัก (Longitude)</label>
                  <input type="number" step="any" required value={dormLongitude} onChange={(e) => setDormLongitude(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">รัศมีที่อนุญาตให้กดเช็คชื่อได้ปกติ (หน่วย: เมตร)</label>
                <input type="number" required value={allowedRadius} onChange={(e) => setAllowedRadius(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
            </div>

            {/* ปุ่มกดบันทึก */}
            <button type="submit" disabled={isSaving} className="w-full rounded-xl bg-gray-850 bg-slate-900 py-3.5 font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:bg-gray-400">
              {isSaving ? '⏳ กำลังบันทึกการตั้งค่า...' : '💾 บันทึกการตั้งค่าทั้งหมด'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}