"use client"; // บรรทัดนี้สำคัญมาก! บอกว่าหน้านี้มีการทำงานฝั่งผู้ใช้

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // เรียกใช้บุรุษไปรษณีย์ที่เราสร้างไว้

export default function RegisterPage() {
  // 1. สร้างกล่องความจำ (State) สำหรับเก็บข้อมูลแต่ละช่อง
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // กล่องจำข้อความแจ้งเตือน (Error/Success)
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // จำว่ากำลังโหลดอยู่ไหม

  // 2. ฟังก์ชันนี้จะทำงานเมื่อกดปุ่ม "ลงทะเบียน"
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // ป้องกันไม่ให้หน้าเว็บรีเฟรชเองเวลากด Submit
    setIsLoading(true);
    setMessage('');

    // เช็กเงื่อนไข: ต้องเป็นอีเมล @knc.ac.th เท่านั้น
    if (!email.endsWith('@knc.ac.th')) {
      setMessage('❌ กรุณาใช้อีเมลของวิทยาลัย (@knc.ac.th) เท่านั้น');
      setIsLoading(false);
      return; // สั่งหยุดการทำงานทันที
    }

    // เช็กความยาวรหัสผ่าน
    if (password.length < 6) {
      setMessage('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setIsLoading(false);
      return;
    }

    // 3. ส่งข้อมูลไปที่ Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // ข้อมูลเพิ่มเติมเราจะแพ็คใส่กล่อง data ไว้ก่อน (เดี๋ยวบทหน้าเราจะย้ายไปตาราง profiles)
        data: {
          first_name: firstName,
          last_name: lastName,
          student_id: studentId,
          year_level: yearLevel,
          phone: phone,
          role: 'student' // กำหนดให้คนที่สมัครหน้านี้เป็นนักศึกษาอัตโนมัติ
        }
      }
    });

    if (error) {
      setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    } else {
      setMessage('✅ ลงทะเบียนสำเร็จ! กรุณาไปหน้าเข้าสู่ระบบ');
      // ล้างข้อมูลในฟอร์มเมื่อสำเร็จ
      setFirstName(''); setLastName(''); setStudentId(''); 
      setPhone(''); setEmail(''); setPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white/30 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-md border border-white/40">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">ลงทะเบียนนักศึกษา</h1>
          <p className="text-gray-600 mt-2 text-sm">สงวนสิทธิ์เฉพาะอีเมล @knc.ac.th เท่านั้น</p>
        </div>

        {/* แสดงข้อความแจ้งเตือนถ้ามี */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-medium ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* ฟอร์ม: เมื่อกด Submit ให้เรียกใช้ฟังก์ชัน handleRegister */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              {/* onChange คือการอัปเดตกล่องความจำทันทีที่พิมพ์ */}
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสนักศึกษา</label>
              <input type="text" required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นปี</label>
              <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer">
                <option value="1">ปี 1</option>
                <option value="2">ปี 2</option>
                <option value="3">ปี 3</option>
                <option value="4">ปี 4</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลวิทยาลัย</label>
            <input type="email" required placeholder="example@knc.ac.th" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input type="password" required minLength={6} placeholder="อย่างน้อย 6 ตัวอักษร" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* เปลี่ยนปุ่ม type="button" เป็น type="submit" เพื่อให้ส่งฟอร์มได้ */}
          <button type="submit" disabled={isLoading} className="w-full mt-4 rounded-xl bg-blue-600/90 px-4 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-400">
            {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          มีบัญชีอยู่แล้วใช่ไหม?{' '}
          <a href="/login" className="font-semibold text-blue-600 hover:underline">เข้าสู่ระบบ</a>
        </div>

      </div>
    </div>
  );
}