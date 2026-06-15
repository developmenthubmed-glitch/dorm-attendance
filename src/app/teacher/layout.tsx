"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTeacherRole();
  }, []);

  async function checkTeacherRole() {
    try {
      // 1. ตรวจสอบว่าล็อกอินอยู่ไหม
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. ดึงข้อมูล Role จากตาราง profiles มาตรวจสอบ
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // 3. เงื่อนไข: ต้องเป็น teacher หรือ admin เท่านั้นถึงจะเข้าโซนนี้ได้
      if (profile && (profile.role === 'teacher' || profile.role === 'admin')) {
        setIsAuthorized(true);
      } else {
        alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะอาจารย์และแอดมินเท่านั้น)');
        router.push('/student'); // ไล่กลับไปหน้านักศึกษา
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-700 font-medium">กำลังตรวจสอบสิทธิ์อาจารย์...</p>
      </div>
    );
  }

  // ถ้าผ่านการตรวจสอบ ให้แสดงหน้าตาของลูกๆ (หน้าเพจต่างๆ ในโฟลเดอร์ teacher)
  return isAuthorized ? <>{children}</> : null;
}