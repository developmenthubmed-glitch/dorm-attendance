"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, []);

  async function checkAdminRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // ดึงข้อมูล Role ของคนนี้มาตรวจ
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // เงื่อนไข: ต้องเป็น admin เท่านั้น!
      if (profile && profile.role === 'admin') {
        setIsAuthorized(true);
      } else {
        alert('❌ พื้นที่หวงห้าม: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
        // ถ้าไม่ใช่แอดมิน ให้ไล่กลับไปหน้าแรกของตัวเอง
        router.push(profile?.role === 'teacher' ? '/teacher' : '/student');
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
        <p className="text-gray-700 font-medium">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบสูงสุด...</p>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}