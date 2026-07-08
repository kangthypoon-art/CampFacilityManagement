import { create } from 'zustand';
import type { PageKey } from '@/types';

const SUB_PARENT: Partial<Record<PageKey, PageKey>> = {
  floorplan:               'rooms',
  'data-registration':     'rooms',
  'data-manage':           'rooms',
  'master-upload':         'data-registration',
  'building-code-upload':  'data-registration',
  'price-upload':          'data-registration',
  upload:                  'data-registration',
  'laundry-targets':       'supplies',
  'laundry-settlement':    'supplies',
  'repair-register':       'facilities',
  'repair-inquiry':        'facilities',
};

const getAncestors = (page: PageKey): PageKey[] => {
  const result: PageKey[] = [];
  let cur = SUB_PARENT[page];
  while (cur) { result.push(cur); cur = SUB_PARENT[cur]; }
  return result;
};

export const PAGE_NAMES: Record<PageKey, string> = {
  rooms:                  '객실관리',
  floorplan:              '층별 배치도',
  'data-registration':    '데이터 등록',
  'data-manage':          '데이터 관리',
  'master-upload':        '마스터 등록',
  'building-code-upload': '빌딩코드 등록',
  'price-upload':         '단가 등록',
  upload:                 '입실데이터 등록',
  supplies:               '세탁관리',
  'laundry-targets':      '대상추출 및 확정',
  'laundry-settlement':   '세탁비 정산',
  facilities:             '설비현황',
  'repair-register':      '수리내역 등록',
  'repair-inquiry':       '수리내역 조회',
  access:                 '출입관리',
  users:                  '사용자',
  products:               '상품',
  messages:               '메시지',
  settings:               '설정',
  security:               '보안',
};

interface NavState {
  currentPage:        PageKey;
  roomsSubOpen:       boolean;
  suppliesSubOpen:    boolean;
  facilitiesSubOpen:  boolean;
  dataRegSubOpen:     boolean;
  navigateTo:         (page: PageKey) => void;
  toggleRooms:        () => void;
  toggleSupplies:     () => void;
  toggleFacilities:   () => void;
  toggleDataReg:      () => void;
}

export const useNavStore = create<NavState>((set) => ({
  currentPage:       'rooms',
  roomsSubOpen:      true,
  suppliesSubOpen:   false,
  facilitiesSubOpen: false,
  dataRegSubOpen:    false,
  navigateTo: (page: PageKey) => {
    const ancestors = getAncestors(page);
    set({
      currentPage:        page,
      roomsSubOpen:       page === 'rooms'      || ancestors.includes('rooms'),
      suppliesSubOpen:    page === 'supplies'   || ancestors.includes('supplies'),
      facilitiesSubOpen:  page === 'facilities' || ancestors.includes('facilities'),
      dataRegSubOpen:     page === 'data-registration' || ancestors.includes('data-registration'),
    });
  },
  toggleRooms:      () => set(s => ({ roomsSubOpen:       !s.roomsSubOpen })),
  toggleSupplies:   () => set(s => ({ suppliesSubOpen:    !s.suppliesSubOpen })),
  toggleFacilities: () => set(s => ({ facilitiesSubOpen:  !s.facilitiesSubOpen })),
  toggleDataReg:    () => set(s => ({ dataRegSubOpen:     !s.dataRegSubOpen })),
}));
