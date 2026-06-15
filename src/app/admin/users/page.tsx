"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminUsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมดในระบบ
  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. ฟังก์ชันบันทึกประวัติความปลอดภัย (Audit Log)
  async function saveAuditLog(action: string, entityId: string, details: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: action,
      entity_type: 'profiles',
      entity_id: entityId,
      details: details,
      user_agent: navigator.userAgent.substring(0, 100)
    });
  }

  // 3. ฟังก์ชันอัปเดต Role (นักศึกษา, อาจารย์, แอดมิน)
  const handleRoleChange = async (userId: string, newRole: string, userName: string) => {
    // ถามย้ำเพื่อความแน่ใจ
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะเปลี่ยนสิทธิ์ของ ${userName} เป็น ${newRole}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // บันทึก Log การเปลี่ยน Role
      await saveAuditLog('CHANGE_ROLE', userId, `แอดมินเปลี่ยน Role เป็น ${newRole}`);
      
      alert('✅ เปลี่ยนสิทธิ์ผู้ใช้งานสำเร็จ!');
      fetchUsers(); // รีเฟรชตาราง

    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  // 4. ฟังก์ชันระงับ/เปิดใช้บัญชี (Active / Inactive)
  const handleToggleActive = async (userId: string, currentStatus: boolean, userName: string) => {
    const actionText = currentStatus ? 'ระงับบัญชี' : 'ปลดแบนบัญชี';
    if (!confirm(`คุณต้องการ ${actionText} ของ ${userName} ใช่หรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      await saveAuditLog('TOGGLE_ACTIVE', userId, `แอดมิน ${actionText}`);
      fetchUsers();
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  // ตัวกรองการค้นหา
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.first_name.includes(searchQuery) ||
    u.last_name.includes(searchQuery) ||
    (u.student_id && u.student_id.includes(searchQuery))
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ส่วนหัว */}
        <div className="rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👑 จัดการผู้ใช้งานระบบ</h1>
            <p className="text-sm text-gray-600">เปลี่ยนสิทธิ์ (Role) และจัดการสถานะบัญชี</p>
          </div>
          <input 
            type="text" 
            placeholder="🔍 ค้นหาอีเมล, ชื่อ, รหัส..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border-none bg-white/60 px-4 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 w-full md:w-64"
          />
        </div>

        {/* ตารางรายชื่อ */}
        <div className="rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40 overflow-hidden">
          {loading ? (
            <p className="text-center text-gray-500 py-8">กำลังโหลดข้อมูลผู้ใช้...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600 font-semibold">
                    <th className="py-3 px-2">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-2">รหัสนักศึกษา/อีเมล</th>
                    <th className="py-3 px-2 text-center">สถานะบัญชี</th>
                    <th className="py-3 px-2 text-center">สิทธิ์ (Role)</th>
                    <th className="py-3 px-2 text-center">เปลี่ยนสิทธิ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 text-gray-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-bold">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-gray-500">ปี {u.year_level} | 📞 {u.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-mono text-xs">{u.student_id || '-'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button 
                          onClick={() => handleToggleActive(u.id, u.is_active, u.first_name)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {u.is_active ? '🟢 ใช้งานได้' : '🔴 ถูกระงับ'}
                        </button>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                          u.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {/* Dropdown เปลี่ยนสิทธิ์ */}
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value, u.first_name)}
                          className="rounded-lg border-none bg-white/70 px-2 py-1 text-xs text-gray-800 focus:ring-2 focus:ring-purple-400 cursor-pointer shadow-sm"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
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