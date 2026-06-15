import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ปล่อยผ่านหน้าเว็บที่ไม่จำเป็นต้องตรวจจับเพื่อป้องกันการทำงานวนลูป (Infinite Loop)
  if (
    pathname === '/maintenance' || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    // 2. ดึงค่าสถานะจากฐานข้อมูล Supabase ผ่านทาง REST API ตรงๆ เพื่อความรวดเร็วในระดับด่านตรวจ
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

    // ยิงดึงข้อมูลแถวที่ id = 1 จากตาราง system_settings
    const res = await fetch(`${supabaseUrl}/rest/v1/system_settings?id=eq.1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      next: { revalidate: 0 } // บังคับให้ดึงค่าสดใหม่เสมอ ห้ามใช้แคชเก่า
    });

    const settings = await res.json();

    // 3. เงื่อนไข: ถ้าระบบถูกแอดมินสั่งปิดปรับปรุง (maintenance_mode = true)
    if (settings && settings[0] && settings[0].maintenance_mode === true) {
      
      // ยกเว้นให้หน้าเข้าสู่ระบบและหน้าเกี่ยวกับแอดมินสามารถเข้าได้ เผื่อแอดมินจะเข้าไปกดเปิดระบบคืน
      if (!pathname.startsWith('/admin') && pathname !== '/login') {
        // ดีดผู้ใช้ทั่วไปคนอื่นกระจายไปหน้าปิดปรับปรุงทันที!
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.rewrite(url);
      }
    }

  } catch (error) {
    console.error('Middleware check failed:', error);
  }

  return NextResponse.next();
}

// กำหนดขอบเขตให้ด่านตรวจนี้คุมทุกหน้าในเว็บไซต์ทั้งหมด
export const config = {
  matcher: '/:path*',
};
