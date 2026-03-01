import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle, Lock, BarChart3, Shield, LogOut, Loader2, Search } from 'lucide-react';

// --- ตั้งค่าระบบ (นำ URL จาก Google Apps Script มาใส่ตรงนี้เมื่อใช้งานจริง) ---
const GAS_URL = "https://script.google.com/macros/s/AKfycbz17H-98LTnFFKJ_pfObujOD-KlUp-B7M6Pvz4lIvpgH247s-6Jd8rIXmud7S5CWmTQ/exec"; 

// ข้อมูลจำลองสำหรับระบบ Preview (หากไม่ได้ใส่ GAS_URL ระบบจะใช้ข้อมูลนี้แทน)
const MOCK_DB = {
  students: {
    "5711": { id: "5711", title: "เด็กชาย", name: "คุณากร", surname: "คณาวัฒนไชย", level: "ชั้นมัธยมศึกษาปีที่ 1", voted: false },
    "5712": { id: "5712", title: "เด็กชาย", name: "บุญญฤทธิ์", surname: "ก่อเกียรติพิทักษ์", level: "ชั้นมัธยมศึกษาปีที่ 1", voted: false },
    "5713": { id: "5713", title: "เด็กชาย", name: "ภชิล", surname: "เขมฤกษ์อำพล", level: "ชั้นมัธยมศึกษาปีที่ 1", voted: true, votedFor: 2 },
    "5716": { id: "5716", title: "เด็กหญิง", name: "กฤตชญา", surname: "ฉัตรวงศวิวัฒน์", level: "ชั้นมัธยมศึกษาปีที่ 1", voted: false },
  },
  stats: {
    levels: { "ชั้นมัธยมศึกษาปีที่ 1": 1, "ชั้นมัธยมศึกษาปีที่ 2": 0, "ชั้นมัธยมศึกษาปีที่ 3": 0 },
    shirts: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 }
  }
};

const SHIRTS = [
  { id: 1, img: "https://img2.pic.in.th/001ba4f8c90ab588b44.png", name: "แบบที่ 1" },
  { id: 2, img: "https://img5.pic.in.th/file/secure-sv1/00257d8157c415cccfa.png", name: "แบบที่ 2" },
  { id: 3, img: "https://img5.pic.in.th/file/secure-sv1/0034560391034385f17.png", name: "แบบที่ 3" },
  { id: 4, img: "https://img2.pic.in.th/0046208b492ce173b74.png", name: "แบบที่ 4" },
  { id: 5, img: "https://img5.pic.in.th/file/secure-sv1/005d556fa13f4baae64.png", name: "แบบที่ 5" }
];

export default function App() {
  const [view, setView] = useState('home'); // home, voting, adminLogin, adminDashboard
  const [loading, setLoading] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedShirt, setSelectedShirt] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [stats, setStats] = useState(MOCK_DB.stats);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // CSS สำหรับ Font และ Animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
      * { font-family: 'LMF Americano', 'Kanit', sans-serif; }
      body { background-color: #f8fafc; }
      .glass-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
      }
      .shirt-card { transition: all 0.3s ease; }
      .shirt-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
      .shirt-selected { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); background-color: #f5f3ff; }
      /* Custom Scrollbar */
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #f1f1f1; }
      ::-webkit-scrollbar-thumb { background: #c7c7cc; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
    `;
    document.head.appendChild(style);

    // ตั้งเวลาปิดโหวต (สมมติให้เป็น 3 วันข้างหน้าสำหรับการพรีวิว)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = deadline.getTime() - now;
      if (distance < 0) {
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ฟังก์ชั่นจำลอง API Call
  const apiCall = async (action, payload = {}) => {
    setLoading(true);
    setErrorMsg('');
    
    // จำลองความหน่วงของ Network
    await new Promise(resolve => setTimeout(resolve, 800)); 

    if (!GAS_URL) {
      // --- ระบบ Mock สำหรับดูตัวอย่าง ---
      if (action === 'verify') {
        const student = MOCK_DB.students[payload.id];
        setLoading(false);
        if (!student) throw new Error("ไม่พบรหัสนักเรียนนี้ในระบบ");
        if (student.voted) throw new Error("คุณได้ทำการโหวตไปแล้ว ไม่สามารถโหวตซ้ำได้");
        return student;
      }
      if (action === 'vote') {
        const { id, shirtId, level } = payload;
        MOCK_DB.students[id].voted = true;
        MOCK_DB.students[id].votedFor = shirtId;
        MOCK_DB.stats.shirts[shirtId] += 1;
        MOCK_DB.stats.levels[level] = (MOCK_DB.stats.levels[level] || 0) + 1;
        setStats({...MOCK_DB.stats}); // Update local stats state
        setLoading(false);
        return { success: true };
      }
      if (action === 'getStats') {
        setLoading(false);
        return MOCK_DB.stats;
      }
    } else {
      // --- ระบบเชื่อมต่อ API จริง (ใช้ GET Request เพื่อเลี่ยง CORS preflight) ---
      try {
        const urlParams = new URLSearchParams({ action, ...payload });
        const response = await fetch(`${GAS_URL}?${urlParams.toString()}`);
        const result = await response.json();
        setLoading(false);
        if(result.error) throw new Error(result.error);
        return result.data;
      } catch (err) {
        setLoading(false);
        throw new Error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: " + err.message);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!studentIdInput) return setErrorMsg("กรุณากรอกรหัสนักเรียน");
    try {
      const student = await apiCall('verify', { id: studentIdInput });
      setCurrentUser(student);
      setView('voting');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleVote = async () => {
    if (!selectedShirt) return setErrorMsg("กรุณาเลือกแบบเสื้อที่ต้องการ");
    try {
      await apiCall('vote', { id: currentUser.id, shirtId: selectedShirt, level: currentUser.level });
      setView('success');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (adminPassword === "1111100000") {
        setView('adminDashboard');
        fetchStats();
      } else {
        setErrorMsg("รหัสผ่านไม่ถูกต้อง");
      }
    }, 500);
  };

  const fetchStats = async () => {
    try {
      const data = await apiCall('getStats');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setStudentIdInput('');
    setSelectedShirt(null);
    setAdminPassword('');
    setView('home');
    setErrorMsg('');
  };

  // ---------------- UI Components ----------------

  const Header = () => (
    <div className="flex flex-col items-center justify-center mb-10 pt-8">
      <img src="https://img2.pic.in.th/pic/PSUWIT_Circle.png" alt="PSU WIT Logo" className="w-24 h-24 mb-4 drop-shadow-md" />
      <h1 className="text-3xl md:text-4xl font-semibold text-slate-800 tracking-wide text-center">ระบบโหวตเสื้อรุ่น<br/><span className="text-indigo-600 text-2xl">Smart Vote System</span></h1>
    </div>
  );

  const Timer = () => (
    <div className="flex gap-4 justify-center my-6">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {value.toString().padStart(2, '0')}
          </div>
          <span className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-medium">
            {unit === 'days' ? 'วัน' : unit === 'hours' ? 'ชม.' : unit === 'minutes' ? 'นาที' : 'วิ'}
          </span>
        </div>
      ))}
    </div>
  );

  if (view === 'home') return (
    <div className="min-h-screen p-4 flex flex-col items-center pb-20">
      <div className="w-full max-w-4xl absolute top-4 right-4 flex justify-end">
        <button onClick={() => setView('adminLogin')} className="text-slate-400 hover:text-slate-600 transition flex items-center gap-2 text-sm">
          <Shield size={16}/> สำหรับผู้ดูแลระบบ
        </button>
      </div>

      <Header />
      
      <div className="w-full max-w-md glass-card rounded-3xl p-8 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-medium text-slate-700 flex items-center justify-center gap-2">
            <Clock size={20} className="text-indigo-500"/> นับถอยหลังปิดโหวต
          </h2>
          <Timer />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">เข้าสู่ระบบเพื่อโหวต</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-4 border border-slate-200 rounded-2xl text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-slate-50/50 focus:bg-white"
                placeholder="กรอกรหัสนักเรียน (เช่น 5711)"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
              />
            </div>
          </div>
          
          {errorMsg && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{errorMsg}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-md text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : "ค้นหาข้อมูล"}
          </button>
        </form>
      </div>

      {/* Public Dashboard Mini */}
      <div className="w-full max-w-4xl text-center px-4">
        <h3 className="text-slate-500 text-sm tracking-widest uppercase mb-4">สถิติผู้เข้าร่วมโหวตเบื้องต้น</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {Object.entries(stats.levels).map(([level, count]) => (
             <div key={level} className="bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100 flex items-center gap-3">
               <span className="text-slate-600 font-medium">{level}</span>
               <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-sm font-bold">{count} คน</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (view === 'voting') return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-slate-50">
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <img src="https://img5.pic.in.th/file/secure-sv1/PSUWIT.png" alt="Logo" className="h-10 opacity-80" />
        <button onClick={logout} className="text-slate-500 hover:text-red-500 flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 transition">
          <LogOut size={16}/> ยกเลิก
        </button>
      </div>

      <div className="w-full max-w-5xl glass-card rounded-3xl p-6 md:p-10 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <User size={30} className="text-indigo-600" />
          </div>
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-sm">ข้อมูลนักเรียน</p>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800">
              {currentUser.title}{currentUser.name} {currentUser.surname} <span className="text-indigo-600 font-medium text-lg">({currentUser.id})</span>
            </h2>
            <p className="text-slate-600">{currentUser.level}</p>
          </div>
        </div>

        <h3 className="text-2xl font-medium text-center text-slate-800 mb-8">เลือกแบบเสื้อที่คุณชื่นชอบที่สุด 1 แบบ</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
          {SHIRTS.map((shirt) => (
            <div 
              key={shirt.id}
              onClick={() => setSelectedShirt(shirt.id)}
              className={`shirt-card cursor-pointer rounded-2xl border-2 overflow-hidden bg-white ${selectedShirt === shirt.id ? 'shirt-selected' : 'border-slate-100'}`}
            >
              <div className="aspect-square bg-slate-100 p-4 flex items-center justify-center relative">
                <img src={shirt.img} alt={shirt.name} className="max-w-full max-h-full object-contain drop-shadow-lg" />
                {selectedShirt === shirt.id && (
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                    <CheckCircle size={20} />
                  </div>
                )}
              </div>
              <div className="p-4 text-center">
                <p className={`font-medium text-lg ${selectedShirt === shirt.id ? 'text-indigo-700' : 'text-slate-700'}`}>{shirt.name}</p>
              </div>
            </div>
          ))}
        </div>

        {errorMsg && <p className="text-red-500 text-center mb-4">{errorMsg}</p>}

        <div className="flex justify-center">
          <button
            onClick={handleVote}
            disabled={loading || !selectedShirt}
            className="py-4 px-12 rounded-2xl shadow-lg text-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : "ยืนยันผลโหวต"}
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'success') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-10 max-w-md w-full text-center">
        <CheckCircle size={80} className="text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-semibold text-slate-800 mb-2">บันทึกผลสำเร็จ!</h2>
        <p className="text-slate-600 mb-8">ขอบคุณที่ร่วมโหวตแบบเสื้อรุ่น</p>
        <button onClick={logout} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition">
          กลับสู่หน้าหลัก
        </button>
      </div>
    </div>
  );

  if (view === 'adminLogin') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <Shield size={40} className="text-slate-800 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-800">Admin Login</h2>
        </div>
        <form onSubmit={handleAdminLogin}>
          <div className="mb-4">
            <input
              type="password"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none text-center text-lg tracking-widest"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>
          {errorMsg && <p className="text-red-500 text-sm text-center mb-4">{errorMsg}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition flex justify-center">
             {loading ? <Loader2 className="animate-spin" /> : "เข้าสู่ระบบ"}
          </button>
        </form>
        <button onClick={logout} className="w-full mt-4 text-slate-400 hover:text-slate-600 text-sm">กลับหน้าหลัก</button>
      </div>
    </div>
  );

  if (view === 'adminDashboard') {
    const totalVotes = Object.values(stats.shirts).reduce((a, b) => a + b, 0);

    return (
      <div className="min-h-screen p-4 md:p-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <BarChart3 size={24} className="text-indigo-600" />
              <h2 className="text-2xl font-semibold text-slate-800">Dashboard ผลคะแนนโหวต</h2>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-red-500 flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl transition">
              <LogOut size={16}/> ออกจากระบบ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
               <span className="text-slate-500 mb-1">จำนวนผู้โหวตทั้งหมด</span>
               <span className="text-4xl font-bold text-indigo-600">{totalVotes} <span className="text-lg text-slate-400 font-normal">คน</span></span>
             </div>
             {Object.entries(stats.levels).map(([level, count]) => (
                <div key={level} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                  <span className="text-slate-500 mb-1">{level}</span>
                  <span className="text-3xl font-bold text-slate-800">{count} <span className="text-lg text-slate-400 font-normal">คน</span></span>
                </div>
             ))}
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-medium mb-6 text-slate-700">ผลคะแนนแยกตามแบบเสื้อ</h3>
            <div className="space-y-6">
              {SHIRTS.map(shirt => {
                const votes = stats.shirts[shirt.id] || 0;
                const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                
                return (
                  <div key={shirt.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 p-1">
                      <img src={shirt.img} alt={shirt.name} className="max-h-full" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-slate-700">{shirt.name}</span>
                        <span className="font-bold text-slate-800">{votes} คะแนน <span className="text-slate-400 text-sm font-normal">({percent}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-3 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
