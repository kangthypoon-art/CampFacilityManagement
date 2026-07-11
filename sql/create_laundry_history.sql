-- ============================================================
-- laundry_history 테이블 생성 스크립트
-- 세탁 대상 확정 이력 저장
-- laundry_target 과 동일한 스키마
-- ============================================================

CREATE TABLE IF NOT EXISTS public.laundry_history (
  year          INTEGER        NOT NULL,
  half_year     VARCHAR(20)    NOT NULL,
  chasu         VARCHAR(20)    NOT NULL,
  room_no       VARCHAR(10)    NOT NULL,
  cover_count   INTEGER        NOT NULL DEFAULT 0,
  pillow_count  INTEGER        NOT NULL DEFAULT 0,
  duvet_count   INTEGER        NOT NULL DEFAULT 0,
  funnel_count  INTEGER        NOT NULL DEFAULT 0,
  amount        NUMERIC(12, 0) NOT NULL DEFAULT 0,
  confirmed_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT pk_laundry_history
    PRIMARY KEY (year, half_year, chasu, room_no)
);

-- 기간별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_laundry_history_period
  ON public.laundry_history (year, half_year, chasu);

COMMENT ON TABLE  public.laundry_history              IS '세탁 대상 확정 이력 — 확정 완료된 세탁 청구 데이터 보존';
COMMENT ON COLUMN public.laundry_history.year         IS '연도';
COMMENT ON COLUMN public.laundry_history.half_year    IS '반기구분';
COMMENT ON COLUMN public.laundry_history.chasu        IS '차수';
COMMENT ON COLUMN public.laundry_history.room_no      IS '객실번호';
COMMENT ON COLUMN public.laundry_history.cover_count  IS '침대커버 수';
COMMENT ON COLUMN public.laundry_history.pillow_count IS '베개 수';
COMMENT ON COLUMN public.laundry_history.duvet_count  IS '이불 수';
COMMENT ON COLUMN public.laundry_history.funnel_count IS '발판 수';
COMMENT ON COLUMN public.laundry_history.amount       IS '청구금액 (원)';
COMMENT ON COLUMN public.laundry_history.confirmed_at IS '확정 일시';

-- ============================================================
-- RLS (Supabase Row Level Security) — 필요 시 활성화
-- ============================================================
-- ALTER TABLE public.laundry_history ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "service_role_all" ON public.laundry_history
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
--
-- CREATE POLICY "authenticated_read" ON public.laundry_history
--   FOR SELECT TO authenticated USING (true);
-- ============================================================
