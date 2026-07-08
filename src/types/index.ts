export type PageKey =
  | 'rooms'
  | 'floorplan'
  | 'data-registration'
  | 'data-manage'
  | 'master-upload'
  | 'building-code-upload'
  | 'repair-register'
  | 'repair-inquiry'
  | 'price-upload'
  | 'upload'
  | 'supplies'
  | 'laundry-targets'
  | 'laundry-settlement'
  | 'facilities'
  | 'access'
  | 'users'
  | 'products'
  | 'messages'
  | 'settings'
  | 'security';

export type FloorKey = '1' | '2' | '3';

export interface NavItem {
  page: PageKey;
  label: string;
  icon: string;
  badge?: number;
  subItems?: SubNavItem[];
}

export interface SubNavItem {
  page: PageKey;
  label: string;
}

export interface ChartDataset {
  label: string;
  color: string;
  data: number[];
}

export interface DoughnutDataset {
  data: number[];
  colors: string[];
}

export interface LineChartConfig {
  type: 'line';
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
}

export interface BarChartConfig {
  type: 'bar';
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
}

export interface DoughnutChartConfig {
  type: 'doughnut';
  data: {
    labels: string[];
    datasets: DoughnutDataset[];
  };
}

export type ChartConfig = LineChartConfig | BarChartConfig | DoughnutChartConfig;
