'use client';

import { useNavStore } from '@/stores/navStore';
import { PageRooms } from './PageRooms';
import { PageFloorPlan } from './PageFloorPlan';
import { PageUpload } from './PageUpload';
import { PageMasterUpload } from './PageMasterUpload';
import { PagePriceUpload } from './PagePriceUpload';
import { PageDataManage } from './PageDataManage';
import { PageLaundryDashboard } from './PageLaundryDashboard';
import { PageLaundryTargets } from './PageLaundryTargets';
import { PageLaundrySettlement } from './PageLaundrySettlement';
import { PageFacilities } from './PageFacilities';
import { PageBuildingCodeUpload } from './PageBuildingCodeUpload';
import { PageRepairRegister } from './PageRepairRegister';
import { PageRepairInquiry } from './PageRepairInquiry';
import { PageUsers } from './PageUsers';
import {
  PageSupplies,
  PageAccess,
  PageProducts,
  PageMessages,
  PageSettings,
  PageSecurity,
} from './PlaceholderPages';

export function Dashboard() {
  const currentPage = useNavStore((s) => s.currentPage);

  return (
    <main
      style={{
        flex: 1,
        padding: '28px 28px 36px',
      }}
    >
      {currentPage === 'rooms'      && <PageRooms />}
      {currentPage === 'floorplan'      && <PageFloorPlan />}
      {currentPage === 'master-upload'        && <PageMasterUpload />}
      {currentPage === 'building-code-upload' && <PageBuildingCodeUpload />}
      {currentPage === 'price-upload'   && <PagePriceUpload />}
      {currentPage === 'upload'         && <PageUpload />}
      {currentPage === 'data-manage'    && <PageDataManage />}
      {currentPage === 'supplies'        && <PageLaundryDashboard />}
      {currentPage === 'laundry-targets' && <PageLaundryTargets />}
      {currentPage === 'laundry-settlement' && <PageLaundrySettlement />}
      {currentPage === 'facilities'      && <PageFacilities />}
      {currentPage === 'repair-register' && <PageRepairRegister />}
      {currentPage === 'repair-inquiry'  && <PageRepairInquiry />}
      {currentPage === 'access'     && <PageAccess />}
      {currentPage === 'users'      && <PageUsers />}
      {currentPage === 'products'   && <PageProducts />}
      {currentPage === 'messages'   && <PageMessages />}
      {currentPage === 'settings'   && <PageSettings />}
      {currentPage === 'security'   && <PageSecurity />}
    </main>
  );
}
