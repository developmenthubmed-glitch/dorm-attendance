"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    let loginEmail = email;
    let loginPassword = password;

    // ⚠️ ข้อกำหนดพิเศษ: ตรวจสอบบัญชีแอดมินลัดในโค้ดจริงตามที่กำหนด
    if (email.trim() === 'admin' && password === '123456') {
      loginEmail = 'admin@knc.ac.th'; // จะแปลงเป็นอีเมลแอดมินหลักของระบบอัตโนมัติ
      loginPassword = 'password123456'; // รหัสผ่านจริงในระบบ Supabase Auth
    } else {
      // ถ้าระบบปกติ ต้องเช็คอีเมลวิทยาลัยตามเดิม
      if (!email.endsWith('@knc.ac.th')) {
        setMessage('❌ กรุณาใช้อีเมลของวิทยาลัย (@knc.ac.th)');
        setIsLoading(false);
        return;
      }
    }

    // สั่งให้ Supabase ตรวจสอบข้อมูลความปลอดภัย
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (authError) {
      if (email.trim() === 'admin') {
        setMessage('❌ เข้าสู่ระบบแอดมินลัดไม่สำเร็จ: อย่าลืมสร้างบัญชี admin@knc.ac.th รหัส password123456 ไว้ใน Supabase Auth ก่อนนะครับ');
      } else {
        setMessage(`❌ เข้าสู่ระบบไม่สำเร็จ: ${authError.message}`);
      }
      setIsLoading(false);
      return;
    }

    // ดึงข้อมูล Role จากตาราง profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      setMessage('❌ ไม่พบข้อมูลโปรไฟล์ในระบบ');
      setIsLoading(false);
      return;
    }

    if (!profile.is_active) {
      setMessage('❌ บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อแอดมิน');
      setIsLoading(false);
      return;
    }

    setMessage('✅ เข้าสู่ระบบสำเร็จ กำลังนำคุณไป...');
    
    // แยกหน้าตาม Role
    if (profile.role === 'admin') {
      router.push('/admin/users');
    } else if (profile.role === 'teacher') {
      router.push('/teacher');
    } else {
      router.push('/student');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/30 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-md border border-white/40">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">ระบบเช็คชื่อหอพัก</h1>
          <p className="text-gray-600 mt-2">วิทยาลัย KNC</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-medium ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อีเมลวิทยาลัย หรือ พิมพ์ admin
            </label>
            <input
              type="text"
              required
              placeholder="example@knc.ac.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-none bg-white/50 px-4 py-3 text-gray-800 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600/90 px-4 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-400"
          >
            {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ยังไม่มีบัญชีใช่ไหม?{' '}
          <a href="/register" className="font-semibold text-blue-600 hover:underline">
            ลงทะเบียนที่นี่
          </a>
        </div>

      </div>
    </div>
  );
}