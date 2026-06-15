"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// สูตรคำนวณระยะทาง GPS (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  
  // สถานะ GPS
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'inside' | 'outside' | 'error'>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [outsideReason, setOutsideReason] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // สถานะการเช็คชื่อและความปลอดภัย (Biometrics / OTP)
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [usedVerificationMethod, setUsedVerificationMethod] = useState('');

  // ค่าตั้งต้นพิกัดหอพัก KNC
  const DORM_LAT = 13.7563; 
  const DORM_LNG = 100.5018;
  const ALLOWED_RADIUS = 50;

  useEffect(() => {
    fetchProfileAndSession();
    determineGreeting();
  }, []);

  async function fetchProfileAndSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      setProfile(data);

      // เช็กว่าวันนี้เช็คชื่อไปหรือยัง
      const { data: record } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (record && record.length > 0) {
        const today = new Date().toDateString();
        const recordDate = new Date(record[0].checkin_at).toDateString();
        if (today === recordDate) setAttendanceChecked(true);
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  function determineGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('สวัสดีตอนเช้า 🌅');
    else if (hour >= 12 && hour < 17) setGreeting('สวัสดีตอนบ่าย ☀️');
    else if (hour >= 17 && hour < 21) setGreeting('สวัสดีตอนเย็น 🌆');
    else setGreeting('สวัสดีตอนกลางคืน 🌙');
  }

  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setStatusMessage('❌ อุปกรณ์ของคุณไม่รองรับ GPS');
      return;
    }

    setCheckingLocation(true);
    setStatusMessage('กำลังค้นหาตำแหน่งพิกัดของคุณ...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setCurrentCoords({ lat: userLat, lng: userLng });

        const meters = calculateDistance(userLat, userLng, DORM_LAT, DORM_LNG);
        setDistance(Math.round(meters));

        if (meters <= ALLOWED_RADIUS) {
          setLocationStatus('inside');
          setStatusMessage('✅ อยู่ในพื้นที่หอพัก (ผ่านการตรวจสอบพิกัด)');
        } else {
          setLocationStatus('outside');
          setStatusMessage('⚠️ อยู่นอกพื้นที่หอพัก (โปรดระบุเหตุผล)');
        }
        setCheckingLocation(false);
      },
      (error) => {
        setLocationStatus('error');
        setCheckingLocation(false);
        setStatusMessage('❌ ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาเปิด GPS');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ขั้นตอนที่ 1 ของความปลอดภัย: กระตุ้นระบบสแกนใบหน้า/ลายนิ้วมือ (WebAuthn)
  const triggerSecurityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: "KNC Dormitory", id: window.location.hostname },
            user: {
              id: new Uint8Array(16),
              name: profile.email,
              displayName: profile.first_name
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: { userVerification: "required" },
            timeout: 60000,
          }
        });

        if (credential) {
          setUsedVerificationMethod('passkey');
          submitAttendance('passkey');
          return;
        }
      }
    } catch (error) {
      console.log("Biometric failed or cancelled, falling back to OTP", error);
    }

    // เปิดหน้าต่าง OTP แทน
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setShowOtpModal(true);
    setIsVerifying(false);
    
    alert(`[จำลองระบบอีเมล] รหัส OTP ของคุณคือ: ${mockOtp}`);
  };

  // ขั้นตอนที่ 2 ของความปลอดภัย: ตรวจสอบ OTP
  const handleOtpSubmit = () => {
    if (otpCode === generatedOtp) {
      setShowOtpModal(false);
      setUsedVerificationMethod('otp');
      submitAttendance('otp');
    } else {
      alert('❌ รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่');
    }
  };

  // ขั้นตอนที่ 3: ส่งข้อมูลเข้าฐานข้อมูล
  const submitAttendance = async (method: string) => {
    try {
      const { data: session } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('status', 'open')
        .limit(1)
        .single();

      const sessionId = session?.id || "00000000-0000-0000-0000-000000000000";

      const { error } = await supabase.from('attendance_records').insert({
        session_id: sessionId,
        student_id: profile.id,
        status: locationStatus === 'inside' ? 'present' : 'outside',
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
        distance_from_dorm: distance,
        device_info: navigator.userAgent.substring(0, 100),
        verification_method: method,
        outside_reason: locationStatus === 'outside' ? outsideReason : null
      });

      if (error) {
        if (error.code === '23505') alert('❌ คุณเคยเช็คชื่อในรอบนี้ไปแล้วครับ');
        else throw error;
      } else {
        setAttendanceChecked(true);
        alert('🎉 บันทึกการเช็คชื่อเข้าหอพักสำเร็จเรียบร้อยแล้ว!');
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-700 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-8 relative">
      
      {/* โมดอล OTP */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">ยืนยันตัวตนด้วย OTP</h3>
            <p className="text-xs text-gray-500 text-center mb-6">เราได้ส่งรหัส 6 หลักไปที่อีเมลวิทยาลัยของคุณแล้ว (สมมติ)</p>
            
            <input 
              type="text" 
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            />
            
            <div className="flex gap-3">
              <button onClick={() => setShowOtpModal(false)} className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-300 transition-all">ยกเลิก</button>
              <button onClick={handleOtpSubmit} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-md transition-all">ยืนยัน OTP</button>
            </div>
          </div>
        </div>
      )}

      {/* ส่วนหัวการ์ดโปรไฟล์นักศึกษา */}
      <div className="w-full max-w-md rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40 text-center mb-6">
        <h2 className="text-xl font-medium text-gray-700">{greeting}</h2>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          {profile?.first_name} {profile?.last_name}
        </h1>
        <div className="mt-3 flex justify-center gap-4 text-sm text-gray-600">
          <span>รหัส: {profile?.student_id}</span>
          <span>ชั้นปีที่: {profile?.year_level}</span>
        </div>
      </div>

      {/* บล็อกควบคุมสถานะการเช็คชื่อ */}
      <div className="w-full max-w-md rounded-3xl bg-white/30 p-6 shadow-xl backdrop-blur-md border border-white/40">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">สถานะการเช็คชื่อเข้าหอพัก</h3>

        {attendanceChecked ? (
          <div className="bg-green-100/80 text-green-800 p-6 rounded-2xl text-center font-bold">
            🎉 คุณได้ทำการเช็คชื่อของวันนี้เสร็จสิ้นแล้ว
          </div>
        ) : (
          <div className="space-y-4">
            {locationStatus === 'idle' && (
              <button
                onClick={verifyLocation}
                disabled={checkingLocation}
                className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-400"
              >
                {checkingLocation ? 'กำลังตรวจสอบพิกัด GPS...' : '📍 ขั้นตอนที่ 1: ตรวจสอบพิกัดพื้นที่'}
              </button>
            )}

            {statusMessage && (
              <p className="text-center text-sm font-semibold text-gray-700 my-2">{statusMessage}</p>
            )}

            {distance !== null && (
              <p className="text-center text-xs text-gray-500">
                ระยะห่างจากหอพัก: <span className="font-bold text-gray-800">{distance} เมตร</span> (อนุญาต {ALLOWED_RADIUS} ม.)
              </p>
            )}

            {/* ฟอร์มสำหรับการกดยืนยันหลังจากตรวจสอบพิกัดเสร็จแล้ว */}
            {(locationStatus === 'inside' || locationStatus === 'outside') && (
              <form onSubmit={triggerSecurityCheck} className="space-y-4 mt-2">
                {locationStatus === 'outside' && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">
                      ระบุเหตุผลความจำเป็นที่อยู่นอกพื้นที่
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={outsideReason}
                      onChange={(e) => setOutsideReason(e.target.value)}
                      placeholder="เช่น กลับบ้านต่างจังหวัด, ป่วย..."
                      className="w-full rounded-xl border-none bg-white/60 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`w-full rounded-2xl px-4 py-4 text-lg font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    locationStatus === 'inside' ? 'bg-gray-900 hover:bg-black' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isVerifying ? 'กำลังประมวลผล...' : (
                    <>
                      <span>🔒</span> 
                      <span>{locationStatus === 'inside' ? 'ขั้นตอนที่ 2: สแกนใบหน้ายืนยันตัวตน' : 'ยืนยันเหตุผลและส่งรายงาน'}</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-500 mt-1">ระบบจะเรียกใช้งาน Face ID / Touch ID ของอุปกรณ์</p>
              </form>
            )}

            {locationStatus !== 'idle' && !isVerifying && !showOtpModal && (
              <button
                type="button"
                onClick={() => { setLocationStatus('idle'); setDistance(null); setStatusMessage(''); }}
                className="w-full text-xs font-semibold text-gray-500 underline hover:text-gray-800 text-center block mt-2"
              >
                กดรีเซ็ตเพื่อระบุพิกัดใหม่อีกครั้ง
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}