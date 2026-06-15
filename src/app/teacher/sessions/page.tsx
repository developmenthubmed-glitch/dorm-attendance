"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeacherSessions() {
  // กล่องความจำสำหรับฟอร์มสร้างรอบใหม่
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // กล่องความจำสำหรับดึงข้อมูลรอบทั้งหมดมาแสดง
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSessions();
    // ตั้งค่าวันที่ของฟอร์มให้เป็นวันปัจจุบันอัตโนมัติเพื่อความง่าย
    const today = new Date().toISOString().split('T')[0];
    setSessionDate(today);
  }, []);

  // 1. ฟังก์ชันดึงรายการรอบเช็คชื่อทั้งหมดจากฐานข้อมูล
  async function fetchSessions() {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err: any) {
      console.error('Error fetching sessions:', err.message);
    }
  }

  // 2. ฟังก์ชันบันทึกประวัติความปลอดภัย (Audit Log)
  async function saveAuditLog(action: string, entityId: string, details: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: action,
      entity_type: 'attendance_sessions',
      entity_id: entityId,
      details: details,
      user_agent: navigator.userAgent.substring(0, 100)
    });
  }

  // 3. ฟังก์ชันสร้างรอบเช็คชื่อใหม่
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่');

      // บันทึกรอบลงฐานข้อมูล
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          status: 'open',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // บันทึก Audit Log เพื่อความปลอดภัยระดับสูงตามเงื่อนไขข้อกำหนด
      await saveAuditLog(
        'CREATE_SESSION', 
        data.id, 
        `อาจารย์เปิดรอบเช็คชื่อวันที่ ${sessionDate} เวลา ${startTime} - ${endTime}`
      );

      setMessage('✅ สร้างรอบเช็คชื่อเข้าหอพักสำเร็จแล้ว!');
      setStartTime('');
      setEndTime('');
      fetchSessions(); // โหลดตารางใหม่ทันที

    } catch (err: any) {
      setMessage(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. ฟังก์ชันสั่งเปิด/ปิดรอบชั่วคราว
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
    
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // บันทึก Audit Log ทุกครั้งที่มีการเปลี่ยนสถานะเวลาเช็คชื่อ
      await saveAuditLog(
        'TOGGLE_SESSION_STATUS', 
        id, 
        `เปลี่ยนสถานะรอบเช็คชื่อเป็น ${nextStatus}`
      );

      fetchSessions(); // อัปเดตหน้าจอหลักล่วงหน้า
    } catch (err: any) {
      alert(`ไม่สามารถเปลี่ยนสถานะได้: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* ปุ่มกดกลับหน้าหลักอาจารย์ */}
      <div className="max-w-4xl mx-auto mb-4">
        <a href="/teacher" className="text-sm font-semibold text-blue-600 hover:underline">
          ⬅️ กลับหน้าแดชบอร์ดหลัก
        </a>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* คอลัมน์ซ้าย: ฟอร์มสร้างรอบใหม่สไตล์ Glassmorphism (กว้าง 1 ส่วน) */}
        <div className="md:col-span-1 rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🗓️ เปิดรอบเช็คชื่อใหม่</h2>
          
          {message && (
            <div className={`mb-4 p-3 rounded-xl text-center text-xs font-semibold ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">วันที่เช็คชื่อ</label>
              <input type="date" required value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">เวลาเริ่มเปิดระบบ</label>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">เวลาปิดระบบ</label>
              <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            
            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-blue-600/90 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-400">
              {isLoading ? 'กำลังบันทึก...' : '🚀 เปิดรอบทันที'}
            </button>
          </form>
        </div>

        {/* คอลัมน์ขวา: ตารางแสดงประวัติรอบเช็คชื่อทั้งหมด (กว้าง 2 ส่วน) */}
        <div className="md:col-span-2 rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 ประวัติและสถานะรอบเช็คชื่อ</h2>
          
          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">ยังไม่มีการสร้างรอบเช็คชื่อในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200/50 text-gray-500 font-medium">
                    <th className="pb-2">วันที่</th>
                    <th className="pb-2">ช่วงเวลากำหนด</th>
                    <th className="pb-2 text-center">สถานะ</th>
                    <th className="pb-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/30 text-gray-800">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 font-medium">{new Date(session.session_date).toLocaleDateString('th-TH')}</td>
                      <td className="py-3">{session.start_time.substring(0,5)} - {session.end_time.substring(0,5)} น.</td>
                      <td className="py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${session.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {session.status === 'open' ? '🟢 เปิดอยู่' : '🔴 ปิดรอบ'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggleStatus(session.id, session.status)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                            session.status === 'open' ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' : 'bg-gray-800 text-white hover:bg-gray-900'
                          }`}
                        >
                          {session.status === 'open' ? 'สั่งปิดรอบ' : 'สั่งเปิดใหม่'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}