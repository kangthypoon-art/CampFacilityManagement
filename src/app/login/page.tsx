'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Star { id: number; left: string; top: string; size: string; color: string; dur: string; delay: string; }
interface LoginResult {
  success: boolean;
  reason?: string;
  email?: string;
  user_name?: string;
  user_role?: string;
}

async function readJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function tryServerLogin(email: string, password: string): Promise<LoginResult | null> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const payload = await readJsonSafely(res);
  if (!res.ok || typeof payload !== 'object' || payload === null) return null;

  const data = payload as Record<string, unknown>;
  if (typeof data.success !== 'boolean') return null;

  return {
    success: data.success as boolean,
    reason: typeof data.reason === 'string' ? data.reason : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    user_name: typeof data.user_name === 'string' ? data.user_name : undefined,
    user_role: typeof data.user_role === 'string' ? data.user_role : undefined,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [stars,    setStars]    = useState<Star[]>([]);
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errMsg,   setErrMsg]   = useState('');
  const [loginId,  setLoginId]  = useState('');
  const [password, setPassword] = useState('');

  // 이미 로그인된 경우 바로 이동
  useEffect(() => {
    const s = localStorage.getItem('sci_session') || sessionStorage.getItem('sci_session');
    if (s) router.replace('/');
  }, [router]);

  // 별 클라이언트 사이드 생성 (hydration 오류 방지)
  useEffect(() => {
    const arr: Star[] = [];
    for (let i = 0; i < 70; i++) {
      const sz = (Math.random() * 2.2 + 0.6).toFixed(2);
      arr.push({
        id: i,
        left:  (Math.random() * 100).toFixed(2) + '%',
        top:   (Math.random() * 100).toFixed(2) + '%',
        size:  sz,
        color: Math.random() > 0.82 ? '#a9c4ff' : '#eef2ff',
        dur:   (Math.random() * 3 + 2).toFixed(2) + 's',
        delay: (Math.random() * 5).toFixed(2) + 's',
      });
    }
    setStars(arr);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrMsg('');
    if (!loginId.trim() || !password) { setErrMsg('이메일과 비밀번호를 입력하세요.'); return; }

    setLoading(true);
    try {
      const email = loginId.trim();
      const serverResult = await tryServerLogin(email, password);
      if (serverResult?.success) {
        const session = { email: serverResult.email, user_name: serverResult.user_name, user_role: serverResult.user_role };
        localStorage.setItem('sci_session', JSON.stringify(session));
        router.replace('/');
        return;
      }

      if (serverResult && !serverResult.success && serverResult.reason === 'inactive') {
        setErrMsg('비활성화된 계정입니다. 관리자에게 문의하세요.');
        return;
      }

      setErrMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
    } catch {
      setErrMsg('서버 연결에 실패했습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'GmarketSansBold';
          src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
          font-weight: 700; font-display: swap;
        }
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes ltwinkle   { 0%,100%{opacity:.15;transform:scale(.7)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes lnebula    { 0%,100%{opacity:.45;transform:scale(1)}  50%{opacity:.8;transform:scale(1.14)} }
        @keyframes lspin      { to{transform:rotate(360deg)} }
        @keyframes lspin-rev  { to{transform:rotate(-360deg)} }
        @keyframes lglow      { 0%,100%{box-shadow:0 0 44px 8px rgba(139,108,240,.5),inset -12px -14px 30px rgba(10,8,40,.7),inset 10px 10px 26px rgba(255,255,255,.18)} 50%{box-shadow:0 0 78px 16px rgba(139,108,240,.78),inset -12px -14px 30px rgba(10,8,40,.7),inset 10px 10px 30px rgba(255,255,255,.26)} }
        @keyframes lshoot     { 0%{transform:translate(0,0) rotate(24deg);opacity:0} 6%{opacity:1} 20%{opacity:0} 100%{transform:translate(460px,205px) rotate(24deg);opacity:0} }
        @keyframes lfloaty    { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-24px) rotate(16deg)} }
        @keyframes lfloat-sl  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-13px)} }
        @keyframes lbtnspin   { to{transform:rotate(360deg)} }
        @keyframes lrise      { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .l-input{transition:border-color .2s,box-shadow .2s,background .2s}
        .l-input:focus{border-color:rgba(167,139,250,.85)!important;box-shadow:0 0 0 4px rgba(139,108,240,.16)!important;background:rgba(255,255,255,.06)!important;outline:none}
        .l-input::placeholder{color:rgba(180,188,224,.4)}
        .l-input:-webkit-autofill{-webkit-text-fill-color:#eef1ff;transition:background-color 5000s ease-in-out 0s}
        .l-btn{transition:transform .15s ease,box-shadow .2s ease,filter .2s}
        .l-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 20px 44px -10px rgba(124,92,240,.9),inset 0 1px 0 rgba(255,255,255,.4)!important}
        .l-btn:active:not(:disabled){transform:translateY(0)}
        .l-togglepw:hover{color:#e8e3ff!important;background:rgba(255,255,255,.12)!important}
      `}</style>

      <div style={{
        position: 'relative', minHeight: '100vh', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px', background: '#05071a',
        fontFamily: '"Pretendard",-apple-system,sans-serif',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 120% at 20% 10%, #241a5e 0%, #120d38 42%, #06081f 100%)' }} />

        {/* 배경 레이어 */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
          <div style={{ position:'absolute', width:640, height:640, left:-140, top:-180, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,80,236,.5),transparent 65%)', filter:'blur(22px)', animation:'lnebula 9s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:540, height:540, right:-160, bottom:-180, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,86,220,.42),transparent 65%)', filter:'blur(22px)', animation:'lnebula 12s ease-in-out 1.5s infinite' }} />
          {stars.map(s => (
            <div key={s.id} style={{ position:'absolute', left:s.left, top:s.top, width:s.size+'px', height:s.size+'px', borderRadius:'50%', background:s.color, boxShadow:'0 0 6px rgba(200,215,255,.85)', animation:`ltwinkle ${s.dur} ease-in-out ${s.delay} infinite` }} />
          ))}
          <div style={{ position:'absolute', left:'8%',  top:'20%', width:66, height:66, borderRadius:'50%', border:'1.5px solid rgba(167,139,250,.4)', animation:'lfloaty 13s ease-in-out infinite' }} />
          <div style={{ position:'absolute', left:'86%', top:'68%', width:40, height:40, borderRadius:'50%', border:'1.5px solid rgba(126,224,255,.35)', animation:'lfloat-sl 9s ease-in-out infinite' }} />
          <div style={{ position:'absolute', left:'78%', top:'16%', width:30, height:30, border:'1.5px solid rgba(126,224,255,.4)', transform:'rotate(45deg)', animation:'lfloaty 15s ease-in-out 1s infinite' }} />
          <div style={{ position:'absolute', left:'14%', top:'78%', width:20, height:20, border:'1.5px solid rgba(167,139,250,.45)', transform:'rotate(45deg)', animation:'lfloat-sl 11s ease-in-out infinite' }} />
          <div style={{ position:'absolute', left:'6%',  top:'10%', width:130, height:2, borderRadius:2, background:'linear-gradient(90deg,transparent,rgba(207,224,255,.95))', boxShadow:'0 0 8px rgba(207,224,255,.7)', opacity:0, animation:'lshoot 7s ease-in 2s infinite' }} />
          <div style={{ position:'absolute', left:'40%', top:'4%',  width:130, height:2, borderRadius:2, background:'linear-gradient(90deg,transparent,rgba(207,224,255,.95))', boxShadow:'0 0 8px rgba(207,224,255,.7)', opacity:0, animation:'lshoot 8s ease-in 5s infinite' }} />
        </div>

        {/* 카드 */}
        <div style={{
          position:'relative', zIndex:2, width:'min(1000px,100%)',
          display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',
          borderRadius:30, overflow:'hidden',
          border:'1px solid rgba(255,255,255,.09)',
          boxShadow:'0 40px 120px -30px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.02) inset',
          background:'linear-gradient(180deg,rgba(19,22,54,.62),rgba(10,12,34,.72))',
          backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
          animation:'lrise .7s ease both',
        }}>

          {/* 왼쪽 패널 – 궤도 */}
          <div style={{
            position:'relative', minHeight:540, padding:'40px 40px 44px',
            display:'flex', flexDirection:'column', justifyContent:'space-between',
            overflow:'hidden',
            background:'linear-gradient(155deg,rgba(84,54,196,.55),rgba(28,22,74,.35) 55%,rgba(14,16,44,.2))',
            borderRight:'1px solid rgba(255,255,255,.06)',
          }}>
            {/* 로고 */}
            <div style={{ position:'relative', zIndex:3 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(200,190,255,.55)', marginBottom:6 }}>
                National Science Museum
              </div>
              <div style={{ fontFamily:'"GmarketSansBold","Pretendard",sans-serif', fontSize:22, fontWeight:700, color:'#e8e3ff', letterSpacing:'-0.01em' }}>
                국립중앙과학관
              </div>
            </div>

            {/* 궤도 애니메이션 */}
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>
              <div style={{ position:'relative', width:320, height:320, opacity:.92 }}>
                {/* 링 1 */}
                <div style={{ position:'absolute', left:'50%', top:'50%', width:300, height:300, marginLeft:-150, marginTop:-150, borderRadius:'50%', border:'1px solid rgba(255,255,255,.14)', animation:'lspin 48s linear infinite' }}>
                  <div style={{ position:'absolute', top:-4, left:'50%', width:8, height:8, marginLeft:-4, borderRadius:'50%', background:'#a78bfa', boxShadow:'0 0 12px #a78bfa' }} />
                </div>
                {/* 링 2 */}
                <div style={{ position:'absolute', left:'50%', top:'50%', width:214, height:214, marginLeft:-107, marginTop:-107, borderRadius:'50%', border:'1px solid rgba(255,255,255,.14)', animation:'lspin-rev 32s linear infinite' }}>
                  <div style={{ position:'absolute', top:-3, left:'50%', width:6, height:6, marginLeft:-3, borderRadius:'50%', background:'#7ee0ff', boxShadow:'0 0 12px #7ee0ff' }} />
                </div>
                {/* 링 3 */}
                <div style={{ position:'absolute', left:'50%', top:'50%', width:132, height:132, marginLeft:-66, marginTop:-66, borderRadius:'50%', border:'1px solid rgba(255,255,255,.14)', animation:'lspin 22s linear infinite' }}>
                  <div style={{ position:'absolute', top:-2.5, left:'50%', width:5, height:5, marginLeft:-2.5, borderRadius:'50%', background:'#f0e6ff', boxShadow:'0 0 12px #f0e6ff' }} />
                </div>
                {/* 행성 */}
                <div style={{ position:'absolute', left:'50%', top:'50%', width:92, height:92, marginLeft:-46, marginTop:-46, borderRadius:'50%', background:'radial-gradient(circle at 34% 30%,#c9b6ff,#7c5cf0 52%,#3a2a9c 100%)', animation:'lglow 5s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ position:'relative', zIndex:3 }} />
          </div>

          {/* 오른쪽 패널 – 폼 */}
          <div style={{ position:'relative', padding:'48px 46px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            {/* 타이틀 */}
            <div style={{ marginBottom:30 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <span style={{ position:'relative', flexShrink:0, width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#a78bfa,#6d5cf0)', boxShadow:'0 6px 18px -4px rgba(124,92,240,.7),inset 0 1px 0 rgba(255,255,255,.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ position:'absolute', width:26, height:26, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,.55)', transform:'rotate(-20deg)' }} />
                  <span style={{ width:11, height:11, borderRadius:'50%', background:'#fff', boxShadow:'0 0 8px rgba(255,255,255,.8)', zIndex:1 }} />
                  <span style={{ position:'absolute', top:5, right:6, width:3, height:3, borderRadius:'50%', background:'#fff' }} />
                </span>
                <h2 style={{ margin:0, fontFamily:'"GmarketSansBold","Pretendard",sans-serif', fontSize:22, fontWeight:700, color:'#f3f4ff', letterSpacing:'-0.01em' }}>
                  과학캠프 관리 시스템
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {/* 이메일 */}
              <label style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'#b9c0e6', letterSpacing:'-0.01em' }}>이메일</span>
                <input
                  className="l-input"
                  type="text"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  autoComplete="username"
                  placeholder="camp@science.go.kr"
                  style={{ width:'100%', padding:'14px 16px', fontSize:14.5, color:'#eef1ff', background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.11)', borderRadius:13, boxSizing:'border-box' }}
                />
              </label>

              {/* 비밀번호 */}
              <label style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'#b9c0e6', letterSpacing:'-0.01em' }}>비밀번호</span>
                <span style={{ position:'relative', display:'flex' }}>
                  <input
                    className="l-input"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="비밀번호를 입력하세요"
                    style={{ width:'100%', padding:'14px 72px 14px 16px', fontSize:14.5, color:'#eef1ff', background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.11)', borderRadius:13, boxSizing:'border-box' }}
                  />
                  <button
                    type="button"
                    className="l-togglepw"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', padding:'6px 10px', fontSize:12, fontWeight:600, whiteSpace:'nowrap', color:'#b3a8e6', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, cursor:'pointer', transition:'color .2s,background .2s' }}>
                    {showPw ? '숨기기' : '표시'}
                  </button>
                </span>
              </label>

              {/* 에러 */}
              {errMsg && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', fontSize:13, color:'#fca5a5' }}>
                  {errMsg}
                </div>
              )}

              {/* 로그인 버튼 */}
              <button
                type="submit"
                className="l-btn"
                disabled={loading}
                style={{
                  position:'relative', marginTop:6, width:'100%', padding:15,
                  fontSize:15, fontWeight:700, fontFamily:'inherit', color:'#0c0a24',
                  letterSpacing:'0.01em', border:'none', borderRadius:13,
                  cursor: loading ? 'default' : 'pointer',
                  background:'linear-gradient(135deg,#b9a4ff 0%,#8b6cf0 55%,#6d5cf0 100%)',
                  boxShadow:'0 14px 34px -10px rgba(124,92,240,.75),inset 0 1px 0 rgba(255,255,255,.4)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  opacity: loading ? 0.8 : 1,
                }}>
                {loading && (
                  <span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(12,10,36,.35)', borderTopColor:'#0c0a24', animation:'lbtnspin .7s linear infinite', flexShrink:0 }} />
                )}
                <span>{loading ? '로그인 중…' : '로그인'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
