export enum Gender {
  Male = 'Nam',
  Female = 'Nữ',
  Other = 'Khác',
}

export enum Brand {
  Sachi = 'Sachi',
  Chilly = 'Chilly',
  Fysoline = 'Fysoline',
  Prospan = 'Prospan',
  Kan = 'Kan',
}

export enum KOCType {
  Nano = 'Nano',
  Micro = 'Micro',
  Macro = 'Macro',
  Mega = 'Mega',
}

export interface KOC {
  rowId: number; // Row number in Google Sheet for reliable updates/deletes
  id: string; // Mã KOC
  stt: number;
  name: string;
  gender: Gender;
  birthYear: number;
  taxCode?: string;
  phone: string;
  email: string;
  address: string; // Tỉnh/TP
  unitPrice: number;
  mainField: string;
  profileLink: string;
  followers: number;
  brand: Brand;
  engagementRate: number; // %
  cooperationDate: string; // ISO Date string
  avgViews: number;
  postedContentLink?: string;
  revenue1m: number;
  revenue3m: number;
  voice?: string;
  progress?: string;
  kocType: KOCType;
  potential?: string;
  notes?: string;
}

export type SortConfig = {
  key: keyof KOC;
  direction: 'ascending' | 'descending';
} | null;

export type ViewType = 'dashboard' | 'koc_management';