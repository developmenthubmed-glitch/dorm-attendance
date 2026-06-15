import { createClient } from '@supabase/supabase-js';

// ดึงกุญแจความลับจากไฟล์ .env.local ที่เราทำไว้ในบทที่ 2
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// สร้างตัวเชื่อมต่อ (บุรุษไปรษณีย์)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
