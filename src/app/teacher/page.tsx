"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeacherDashboard() {
  // กล่องเก็บข้อมูลสถิตินักศึกษาแยกปี 1 - 4
  const [stats, setStats] = useState({ year1: 0, year2: 0, year3: 0, year4: 0, total: 0 });
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // 1. ดึงข้อมูลนักศึกษาทั้งหมดเพื่อมานับแยกชั้นปี
      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('year_level')
        .eq('role', 'student');

      if (studentError) throw studentError;

      let y1 = 0, y2 = 0, y3 = 0, y4 = 0;
      students?.forEach(student => {
        if (student.year_level === '1') y1++;
        if (student.year_level === '2') y2++;
        if (student.year_level === '3') y3++;
        if (student.year_level === '4') y4++;
      });

      setStats({
        year1: y1,
        year2: y2,
        year3: y3,
        year4: y4,
        total: students?.length || 0
      });

      // 2. ดึงจำนวนนักศึกษาที่เช็คชื่อแล้วของวันนี้
      const today = new Date().toISOString().split('T')[0]; // ดึงวันที่ปัจจุบันรูปแบบ YYYY-MM-DD
      const { count, error: recordError } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true }); // ดึงแค่ตัวเลขจำนวนนับเพื่อความรวดเร็ว

      if (!recordError) {
        setCheckedInCount(count || 0);
      }

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-700 font-medium">กำลังโหลดข้อมูล Dashboard...</p>
      </div>
    );
  }

  // คำนวณคนที่ยังไม่ได้เช็คชื่อ
  const notCheckedInCount = stats.total - checkedInCount;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* หัวข้อด้านบน */}
      <div className="mb-8 text-center md:text-left max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800">ระบบจัดการสำหรับอาจารย์</h1>
        <p className="text-gray-600">ภาพรวมข้อมูลและการเช็คชื่อเข้าหอพักประจำวันนี้</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* แถวที่ 1: การ์ดสรุปยอดเช็คชื่อใหญ่ๆ สะดุดตา */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/40 p-6 text-center shadow-md backdrop-blur-md border border-white/40">
            <h3 className="text-sm font-medium text-gray-500 uppercase">นักศึกษาทั้งหมด</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total} คน</p>
          </div>
          <div className="rounded-2xl bg-green-100/50 p-6 text-center shadow-md backdrop-blur-md border border-green-200/40">
            <h3 className="text-sm font-medium text-green-700 uppercase">เช็คชื่อแล้ว</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{checkedInCount} คน</p>
          </div>
          <div className="rounded-2xl bg-red-100/50 p-6 text-center shadow-md backdrop-blur-md border border-red-200/40">
            <h3 className="text-sm font-medium text-red-700 uppercase">ยังไม่เช็คชื่อ</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{notCheckedInCount < 0 ? 0 : notCheckedInCount} คน</p>
          </div>
        </div>

        {/* แถวที่ 2: การ์ดแยกตามชั้นปี 1 - 4 สไตล์แอป iPhone */}
        <div className="rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40">
          <h2 className="text-lg font-bold text-gray-800 mb-4">จำนวนนักศึกษาแยกตามชั้นปี</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/50 p-4 rounded-xl text-center shadow-inner">
              <span className="text-xs text-gray-500 font-medium block">ชั้นปี 1</span>
              <span className="text-xl font-bold text-gray-800 mt-1 block">{stats.year1} คน</span>
            </div>
            <div className="bg-white/50 p-4 rounded-xl text-center shadow-inner">
              <span className="text-xs text-gray-500 font-medium block">ชั้นปี 2</span>
              <span className="text-xl font-bold text-gray-800 mt-1 block">{stats.year2} คน</span>
            </div>
            <div className="bg-white/50 p-4 rounded-xl text-center shadow-inner">
              <span className="text-xs text-gray-500 font-medium block">ชั้นปี 3</span>
              <span className="text-xl font-bold text-gray-800 mt-1 block">{stats.year3} คน</span>
            </div>
            <div className="bg-white/50 p-4 rounded-xl text-center shadow-inner">
              <span className="text-xs text-gray-500 font-medium block">ชั้นปี 4</span>
              <span className="text-xl font-bold text-gray-800 mt-1 block">{stats.year4} คน</span>
            </div>
          </div>
        </div>

        {/* ปุ่มนำทางไปหน้าอื่นๆ ของอาจารย์ */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/teacher/sessions" className="flex-1 text-center bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all">
            🗓️ ตั้งค่าเปิดรอบเช็คชื่อใหม่
          </a>
          <a href="/teacher/reports" className="flex-1 text-center bg-white/60 text-gray-700 font-semibold py-3 px-4 rounded-xl shadow-md hover:bg-white/80 border border-white/40 active:scale-95 transition-all">
            📊 ดูรายงานการเช็คชื่อย้อนหลัง
          </a>
        </div>

      </div>
    </div>
  );
}