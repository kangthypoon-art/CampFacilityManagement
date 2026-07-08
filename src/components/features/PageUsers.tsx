'use client';

import { useState, useEffect, useCallback } from 'react';

interface SysUser {
  email:      string;
  user_name:  string;
  user_role:  string;
  is_active:  string;   // 'Y' | 'N'
  created_at: string;
}

type ModalMode = 'add' | 'edit' | null;

interface FormState {
  email:            string;
  user_name:        string;
  user_role:        'ADMIN' | 'USER';
  password:         string;
  password_confirm: string;
  is_active:        boolean;
}

const INIT_FORM: FormState = {
  email: '', user_name: '', user_role: 'USER',
  password: '', password_confirm: '', is_active: true,
};

const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
};
const labelSt: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 5, display: 'block',
};

function validateEmail(v: string): string {
  if (!v) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : '유효한 이메일 형식이 아닙니다.';
}

export function PageUsers() {
  const [users,      setUsers]      = useState<SysUser[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [modal,      setModal]      = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<SysUser | null>(null);
  const [form,       setForm]       = useState<FormState>(INIT_FORM);
  const [saving,     setSaving]     = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [errMsg,     setErrMsg]     = useState('');
  const [emailErr,   setEmailErr]   = useState('');

  const supaUrl = '/api/supabase/rest/v1';
  const hdr = { 'Content-Type': 'application/json' };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${supaUrl}/users?select=email,user_name,user_role,is_active,created_at&order=created_at.desc`,
        { headers: hdr }
      );
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openAdd = () => {
    setForm(INIT_FORM);
    setEditTarget(null);
    setErrMsg(''); setEmailErr('');
    setModal('add');
  };

  const openEdit = (u: SysUser) => {
    setForm({
      email:            u.email,
      user_name:        u.user_name,
      user_role:        u.user_role === 'ADMIN' ? 'ADMIN' : 'USER',
      password:         '',
      password_confirm: '',
      is_active:        u.is_active === 'Y',
    });
    setEditTarget(u);
    setErrMsg(''); setEmailErr('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null); setEditTarget(null); setErrMsg(''); setEmailErr('');
  };

  const handleSave = async () => {
    setErrMsg('');
    if (!form.user_name.trim())                  { setErrMsg('사용자명을 입력하세요.'); return; }
    if (!form.email.trim())                      { setErrMsg('이메일을 입력하세요.'); return; }
    if (validateEmail(form.email))               { setErrMsg(validateEmail(form.email)); return; }
    if (modal === 'add' && !form.password)        { setErrMsg('비밀번호를 입력하세요.'); return; }
    if (form.password && form.password !== form.password_confirm) { setErrMsg('비밀번호가 일치하지 않습니다.'); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        email:     form.email.trim(),
        user_name: form.user_name.trim(),
        user_role: form.user_role,
        is_active: form.is_active ? 'Y' : 'N',
      };

      if (form.password) {
        body.password_hash = form.password;
      }

      if (modal === 'add') {
        const res = await fetch(`${supaUrl}/users`, {
          method: 'POST',
          headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error((e as { message?: string })?.message ?? '사용자 추가 실패');
        }
      } else if (modal === 'edit' && editTarget) {
        body.updated_at = new Date().toISOString();
        const res = await fetch(`${supaUrl}/users?email=eq.${encodeURIComponent(editTarget.email)}`, {
          method: 'PATCH',
          headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error((e as { message?: string })?.message ?? '사용자 수정 실패');
        }
      }

      closeModal();
      await loadUsers();
    } catch (e) {
      setErrMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: SysUser) => {
    if (!window.confirm(`'${u.user_name}' 사용자를 삭제하시겠습니까?`)) return;
    setDeletingEmail(u.email);
    try {
      const res = await fetch(`${supaUrl}/users?email=eq.${encodeURIComponent(u.email)}`, {
        method: 'DELETE',
        headers: hdr,
      });
      if (!res.ok) throw new Error('삭제 실패');
      await loadUsers();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingEmail(null);
    }
  };

  const CELL_PAD = '11px 16px';

  const thSt: React.CSSProperties = {
    padding: CELL_PAD, textAlign: 'left', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };

  const tdSt: React.CSSProperties = {
    padding: CELL_PAD, verticalAlign: 'middle',
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>사용자 관리</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>시스템 사용자 계정 및 권한을 관리합니다.</p>
        </div>
        <button
          onClick={openAdd}
          style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(13,148,136,0.28)' }}>
          + 사용자 추가
        </button>
      </div>

      {/* 목록 */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>불러오는 중…</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>등록된 사용자가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 180 }} />
                <col />
                <col style={{ width: 180 }} />
                <col style={{ width: 180 }} />
                <col style={{ width: 180 }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['사용자명', '이메일', '역할', '상태', '관리'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.email} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...tdSt, fontWeight: 600 }}>{u.user_name}</td>
                    <td style={{ ...tdSt, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? '-'}</td>
                    <td style={tdSt}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: u.user_role === 'ADMIN' ? 'rgba(13,148,136,0.12)' : 'rgba(107,114,128,0.1)',
                        color: u.user_role === 'ADMIN' ? 'var(--accent)' : 'var(--text-muted)',
                      }}>
                        {u.user_role === 'ADMIN' ? '관리자' : '일반사용자'}
                      </span>
                    </td>
                    <td style={tdSt}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: u.is_active === 'Y' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: u.is_active === 'Y' ? '#16a34a' : '#DC2626',
                      }}>
                        {u.is_active === 'Y' ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td style={tdSt}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEdit(u)}
                          style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={deletingEmail === u.email}
                          style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#DC2626', cursor: deletingEmail === u.email ? 'default' : 'pointer', opacity: deletingEmail === u.email ? 0.5 : 1 }}>
                          {deletingEmail === u.email ? '삭제 중…' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 추가/수정 모달 */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

            {/* 모달 헤더 */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                {modal === 'add' ? '사용자 추가' : '사용자 수정'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}>×</button>
            </div>

            {/* 모달 폼 */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '68vh', overflowY: 'auto' }}>

              {/* 1. 사용자명 */}
              <div>
                <label style={labelSt}>사용자명 <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  type="text"
                  value={form.user_name}
                  onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))}
                  style={inputSt}
                  placeholder="홍길동"
                />
              </div>

              {/* 2. 이메일 */}
              <div>
                <label style={labelSt}>이메일 <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailErr(''); }}
                  onBlur={e => setEmailErr(validateEmail(e.target.value))}
                  style={{ ...inputSt, borderColor: emailErr ? '#DC2626' : undefined }}
                  placeholder="user@example.com"
                  autoComplete="off"
                />
                {emailErr && <p style={{ fontSize: 11, color: '#DC2626', margin: '4px 0 0' }}>{emailErr}</p>}
              </div>

              {/* 3. 역할 */}
              <div>
                <label style={labelSt}>역할 <span style={{ color: '#DC2626' }}>*</span></label>
                <select
                  value={form.user_role}
                  onChange={e => setForm(f => ({ ...f, user_role: e.target.value as 'ADMIN' | 'USER' }))}
                  style={{ ...inputSt, cursor: 'pointer' }}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              {/* 4. 비밀번호 */}
              <div>
                <label style={labelSt}>
                  비밀번호{' '}
                  {modal === 'add'
                    ? <span style={{ color: '#DC2626' }}>*</span>
                    : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(변경 시에만 입력)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={inputSt}
                  placeholder="비밀번호 입력"
                  autoComplete="new-password"
                />
              </div>

              {/* 5. 비밀번호 확인 */}
              <div>
                <label style={labelSt}>비밀번호 확인</label>
                <input
                  type="password"
                  value={form.password_confirm}
                  onChange={e => setForm(f => ({ ...f, password_confirm: e.target.value }))}
                  style={{
                    ...inputSt,
                    borderColor: form.password && form.password !== form.password_confirm ? '#DC2626' : undefined,
                  }}
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                />
                {form.password && form.password !== form.password_confirm && (
                  <p style={{ fontSize: 11, color: '#DC2626', margin: '4px 0 0' }}>비밀번호가 일치하지 않습니다.</p>
                )}
              </div>

              {/* 활성여부 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="modal_is_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <label htmlFor="modal_is_active" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                  계정 활성화
                </label>
              </div>

              {/* 오류 메시지 */}
              {errMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#DC2626', lineHeight: 1.6 }}>
                  ⚠ {errMsg}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={closeModal}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '저장 중…' : modal === 'add' ? '추가' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
