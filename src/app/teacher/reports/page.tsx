"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeacherReports() {
  // กล่องเก็บข้อมูลรายงานที่ดึงมาจากฐานข้อมูล
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // กล่องสำหรับระบบค้นหาและกรองข้อมูล
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  // 1. ฟังก์ชันดึงข้อมูลแบบเชื่อมตาราง (Join Tables)
  async function fetchReports() {
    try {
      setLoading(true);
      // ดึงข้อมูลประวัติเช็คชื่อ พร้อมพ่วงชื่อนักศึกษา(profiles) และวันที่(attendance_sessions) มาด้วย
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          checkin_at,
          status,
          outside_reason,
          distance_from_dorm,
          profiles (first_name, last_name, student_id, year_level),
          attendance_sessions (session_date)
        `)
        .order('checkin_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. ฟังก์ชันกรองข้อมูลตามที่ผู้ใช้พิมพ์ค้นหา (ค้นหาชื่อ, รหัส, หรือชั้นปี)
  const filteredRecords = records.filter((record) => {
    const student = record.profiles;
    if (!student) return false;

    // กรองชั้นปี
    const matchYear = filterYear === 'all' || student.year_level === filterYear;
    
    // กรองคำค้นหา (ค้นจากรหัส, ชื่อ หรือ นามสกุล)
    const matchSearch = 
      student.student_id.includes(searchQuery) ||
      student.first_name.includes(searchQuery) ||
      student.last_name.includes(searchQuery);

    return matchYear && matchSearch;
  });

  // 3. ฟังก์ชันสร้างไฟล์ Excel (CSV) และสั่งดาวน์โหลด
  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('ไม่มีข้อมูลให้ Export ครับ');
      return;
    }

    // สร้างหัวตาราง (ใส่ \uFEFF เพื่อให้ Excel อ่านภาษาไทยได้ไม่เพี้ยน)
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "วันที่เช็คชื่อ,เวลา,รหัสนักศึกษา,ชื่อ,นามสกุล,ชั้นปี,สถานะ,ระยะห่าง(เมตร),เหตุผล\n";

    // วนลูปข้อมูลแต่ละแถวมาต่อกัน
    filteredRecords.forEach((record) => {
      const date = new Date(record.checkin_at).toLocaleDateString('th-TH');
      const time = new Date(record.checkin_at).toLocaleTimeString('th-TH');
      const status = record.status === 'present' ? 'เข้าหอพัก' : 'อยู่นอกพื้นที่';
      const reason = record.outside_reason ? `"${record.outside_reason}"` : "-"; // ใส่ "" ครอบเผื่อนักศึกษาพิมพ์ลูกน้ำมา
      
      const row = `${date},${time},${record.profiles?.student_id},${record.profiles?.first_name},${record.profiles?.last_name},${record.profiles?.year_level},${status},${record.distance_from_dorm || 0},${reason}`;
      csvContent += row + "\n";
    });

    // สั่งให้เบราว์เซอร์ดาวน์โหลดไฟล์
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานเช็คชื่อหอพัก_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // ลบทิ้งหลังกดโหลดเสร็จ
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* ปุ่มกดกลับหน้าหลักอาจารย์ */}
      <div className="max-w-6xl mx-auto mb-4">
        <a href="/teacher" className="text-sm font-semibold text-blue-600 hover:underline">
          ⬅️ กลับหน้าแดชบอร์ดหลัก
        </a>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* ส่วนหัวและตัวกรองข้อมูล (Glassmorphism) */}
        <div className="rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 รายงานการเช็คชื่อ</h1>
            <p className="text-sm text-gray-600">ค้นหา กรอง และดาวน์โหลดข้อมูลย้อนหลัง</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* ช่องค้นหา */}
            <input 
              type="text" 
              placeholder="🔍 ค้นหารหัส, ชื่อ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border-none bg-white/60 px-4 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 w-full sm:w-48"
            />
            {/* ตัวกรองชั้นปี */}
            <select 
              value={filterYear} 
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-xl border-none bg-white/60 px-4 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              <option value="all">ดูทุกชั้นปี</option>
              <option value="1">เฉพาะปี 1</option>
              <option value="2">เฉพาะปี 2</option>
              <option value="3">เฉพาะปี 3</option>
              <option value="4">เฉพาะปี 4</option>
            </select>
            {/* ปุ่ม Export CSV */}
            <button 
              onClick={exportToCSV}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-green-700 active:scale-95 transition-all whitespace-nowrap"
            >
              📥 โหลดไฟล์ CSV
            </button>
          </div>
        </div>

        {/* ตารางแสดงข้อมูล */}
        <div className="rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40 overflow-hidden">
          {loading ? (
            <p className="text-center text-gray-500 py-8">กำลังโหลดข้อมูลรายงาน...</p>
          ) : filteredRecords.length === 0 ? (
            <p className="text-center text-gray-500 py-8">ไม่พบข้อมูลการเช็คชื่อที่ตรงกับเงื่อนไข</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600 font-semibold bg-white/20">
                    <th className="py-3 px-4 rounded-tl-xl">วันที่ - เวลา</th>
                    <th className="py-3 px-4">รหัสนักศึกษา</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล (ปี)</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 rounded-tr-xl">หมายเหตุ / เหตุผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 text-gray-800">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium">{new Date(record.checkin_at).toLocaleDateString('th-TH')}</div>
                        <div className="text-xs text-gray-500">{new Date(record.checkin_at).toLocaleTimeString('th-TH')} น.</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{record.profiles?.student_id}</td>
                      <td className="py-3 px-4">
                        {record.profiles?.first_name} {record.profiles?.last_name}
                        <span className="ml-2 text-xs text-gray-500">(ปี {record.profiles?.year_level})</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.status === 'present' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">✅ เข้าหอพัก</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">⚠️ นอกพื้นที่</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {record.status === 'outside' ? (
                          <span className="text-red-600 italic text-xs">{record.outside_reason || 'ไม่ได้ระบุเหตุผล'}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
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