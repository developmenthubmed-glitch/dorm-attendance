import { redirect } from 'next/navigation';

export default function HomePage() {
  // สั่งให้ทันทีที่มีคนเข้ามาหน้าเว็บหลัก (/) ให้เด้งไปหน้าเข้าสู่ระบบอัตโนมัติ
  redirect('/login');
}