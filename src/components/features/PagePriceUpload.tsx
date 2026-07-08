'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

interface PriceRow {
  category_code: number;
  category_name: string;
  unit_price:    number;
  is_active:      string;
  [key: string]: unknown;
}

type SaveState = 'idle' | 'saving' | 'done' | 'error';

const CORE_KEYS = ['category_code', 'category_name', 'unit_price', 'is_active'];

const GUIDE_COLS = [
  { key: 'category_code', label: '카테고리코드' },
  { key: 'category_name', label: '카테고리명'   },
  { key: 'unit_price',    label: '단가'         },
  { key: 'is_active',      label: '사용여부'      },
];

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-xs)',
  background: 'var(--bg)',
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
  whiteSpace: 'nowrap',
};

export function PagePriceUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows,       setRows]       = useState<PriceRow[]>([]);
  const [colKeys,    setColKeys]    = useState<string[]>([]);
  const [fileName,   setFileName]   = useState('');
  const [saveState,  setSaveState]  = useState<SaveState>('idle');
  const [errMsg,     setErrMsg]     = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [dragOver,   setDragOver]   = useState(false);

  const pick = (r: Record<string, unknown>, ...keys: string[]): unknown => {
    for (const k of keys) {
      const v = r[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return undefined;
  };

  const parseFile = (file: File) => {
    setFileName(file.name);
    setSaveState('idle');
    setErrMsg('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

        if (raw.length === 0) { setErrMsg('데이터가 없습니다.'); return; }

        const allKeys = Object.keys(raw[0]);

        const mapped: PriceRow[] = raw.map((r) => ({
          ...r,
          category_code: Number(pick(r, 'category_code', '카테고리코드', '카테고리코드') ?? 0),
          category_name: String(pick(r, 'category_name', '카테고리명', '카테고리이름') ?? ''),
          unit_price:    Number(pick(r, 'unit_price', '단가', '금액', '가격') ?? 0),
          is_active:      String(pick(r, 'is_active', '사용여부', '활성') ?? 'Y'),
        } as PriceRow)).filter(r => r.category_code !== 0);

        const extraKeys = allKeys.filter(k => !CORE_KEYS.includes(k));
        setColKeys([...CORE_KEYS, ...extraKeys]);
        setRows(mapped);
      } catch {
        setErrMsg('파일을 읽을 수 없습니다. 엑셀(.xlsx/.xls) 파일인지 확인해 주세요.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const handleReset = () => {
    setRows([]);
    setColKeys([]);
    setFileName('');
    setSaveState('idle');
    setErrMsg('');
    setSavedCount(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!rows.length) return;
    const url = '/api/supabase/rest/v1';

    // PK 기준 중복 제거
    const deduped = [...new Map(rows.map(r => [r.category_code, r])).values()];

    setSaveState('saving');
    setErrMsg('');
    try {
      const hdr = {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      };

      // 1단계: 기존 데이터 전체 삭제 (category_price는 소규모 룩업 테이블)
      const delRes = await fetch(`${url}/category_price?category_code=gte.0`, {
        method: 'DELETE',
        headers: hdr,
      });
      if (!delRes.ok) {
        const body = await delRes.json().catch(() => ({}));
        throw new Error(`삭제 실패: ${body?.message ?? `HTTP ${delRes.status}`}`);
      }

      // 2단계: 새 데이터 INSERT
      const CHUNK = 100;
      for (let i = 0; i < deduped.length; i += CHUNK) {
        const res = await fetch(`${url}/category_price`, {
          method: 'POST',
          headers: hdr,
          body: JSON.stringify(deduped.slice(i, i + CHUNK)),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(`저장 실패: ${body?.message ?? `HTTP ${res.status}`}`);
        }
      }

      setSavedCount(deduped.length);
      setSaveState('done');
    } catch (e) {
      setErrMsg((e as Error).message);
      setSaveState('error');
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, color: 'var(--text)' }}>
            단가등록
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            엑셀 파일을 업로드하면 내용을 확인 후 category_price 테이블에 저장합니다.
          </p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all var(--t)',
            }}
          >
            🔄 초기화
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: rows.length ? '280px 1fr' : '1fr', gap: 20 }}>
        {/* 왼쪽: 업로드 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 드래그앤드롭 존 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              background: dragOver ? 'var(--accent-bg)' : 'var(--surface)',
              padding: '40px 24px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, cursor: 'pointer', transition: 'all var(--t)',
            }}
          >
            <div style={{ fontSize: 40 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              엑셀 파일을 드래그하거나 클릭
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>.xlsx / .xls 지원</div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* 파일명 */}
          {fileName && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>📄</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{rows.length}행</span>
            </div>
          )}

          {/* 컬럼 가이드 */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              엑셀 헤더 형식
              {colKeys.length > 0 && (
                <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8, color: 'var(--accent)' }}>
                  ({colKeys.length}컬럼 감지됨)
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              {colKeys.length > 0 ? (
                <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <thead>
                    <tr>
                      {colKeys.map(k => (
                        <th key={k} style={{
                          padding: '5px 8px', border: '1px solid var(--border)',
                          background: CORE_KEYS.includes(k) ? 'var(--accent)' : 'var(--text-muted)',
                          color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center',
                        }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {colKeys.map(k => (
                        <td key={k} style={{
                          padding: '4px 8px', border: '1px solid var(--border)',
                          color: CORE_KEYS.includes(k) ? 'var(--accent)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap', textAlign: 'center', fontSize: 10,
                          fontWeight: CORE_KEYS.includes(k) ? 700 : 400,
                        }}>
                          {CORE_KEYS.includes(k) ? '필수' : '추가'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <thead>
                    <tr>
                      {GUIDE_COLS.map(({ label }) => (
                        <th key={label} style={{ padding: '5px 8px', border: '1px solid var(--border)', background: 'var(--accent)', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {GUIDE_COLS.map(({ key }) => (
                        <td key={key} style={{ padding: '4px 8px', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'center', fontSize: 10 }}>
                          {key}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            {colKeys.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                추가 컬럼이 있으면 그대로 함께 저장됩니다.
              </p>
            )}
          </div>

          {/* 저장 버튼 */}
          {rows.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saveState === 'saving' || saveState === 'done'}
              style={{
                padding: '12px 0', borderRadius: 'var(--r-sm)',
                background: saveState === 'done' ? 'var(--green)' : 'var(--accent)',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: saveState === 'saving' || saveState === 'done' ? 'default' : 'pointer',
                opacity: saveState === 'saving' ? 0.7 : 1,
                transition: 'all var(--t)',
              }}
            >
              {saveState === 'saving' && '저장 중…'}
              {saveState === 'done'   && `✓ ${savedCount}건 저장 완료`}
              {saveState === 'idle'   && `💾 ${rows.length}건 저장`}
              {saveState === 'error'  && '다시 시도'}
            </button>
          )}

          {/* 오류/안내 메시지 */}
          {errMsg && (
            <div style={{
              background: saveState === 'done' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${saveState === 'done' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
              fontSize: 12, color: saveState === 'done' ? '#16a34a' : '#DC2626',
            }}>
              {errMsg}
            </div>
          )}
        </div>

        {/* 오른쪽: 미리보기 테이블 */}
        {rows.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>미리보기</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                총 {rows.length}건 · {colKeys.length}컬럼
              </span>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    {colKeys.map(k => (
                      <th key={k} style={{
                        ...thStyle,
                        color: CORE_KEYS.includes(k) ? 'var(--accent)' : 'var(--text-xs)',
                      }}>
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={tdStyle}>{i + 1}</td>
                      {colKeys.map(k => (
                        <td key={k} style={tdStyle}>{row[k] != null ? String(row[k]) : ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
