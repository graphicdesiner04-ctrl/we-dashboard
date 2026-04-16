// ── WE Technical Support Dashboard — Seed Data ───────────────────────────
// SOURCE OF TRUTH: C:\Users\hp\Downloads\Technical support .xlsx
// Imported: 2026-04-15
//
// Rules:
//  • Fields blank in sheet → blank here. Do NOT auto-fill.
//  • domainName = exact casing from sheet (unique key, case-insensitive lookup)
//  • user       = domainName.trim().toLowerCase()

import type {
  Employee, Branch, BranchTechnicalProfile,
  AssignmentHistory, BranchAsset,
  AnnualLeaveRecord, PermissionRecord,
  SickLeaveRecord, InsteadOfRecord, WorkingDayOffRecord,
} from '@/types/hr'

// ── Helper ────────────────────────────────────────────────────────────────
export function getEmpName(emp: Employee): string {
  return emp.name || emp.nameEn || emp.domainName || emp.user
}

// ── Employees ─────────────────────────────────────────────────────────────
// 6  Seniors (Level 7) — from Senior Data sheet
// 24 Agents  (Level 8) — from Agent Data sheet
// Total: 30 employees (includes supervisor Mohamed.M.Sholkamy)

export const EMPLOYEES: Employee[] = [

  // ── Seniors (Level 7) ───────────────────────────────────────────────────

  {
    id: 'emp-42', user: 'mohamed.m.sholkamy', domainName: 'mohamed.m.sholkamy',
    name: 'محمد محمود شلقامي', nameEn: 'Mohamed Mahmoud Sholkamy',
    email: 'mohamed.m.sholkamy@te.eg', mobile: '1552020717', nationalId: '', employeeCode: '5214',
    level: 7, role: 'Senior',
    operatorAccount: 'Mohamed Mahmoud Sholkamy',
    dsPortalName: 'Mohamed Mahmoud Sholkamy',
  },
  {
    id: 'emp-13', user: 'ahmed.g.hafez', domainName: 'ahmed.g.hafez',
    name: '', nameEn: 'Ahmed Galal Hassan Hafez',
    email: 'ahmed.g.hafez@te.eg', mobile: '1098611752', nationalId: '', employeeCode: '6813',
    level: 7, role: 'Senior',
    operatorAccount: 'Ahmed Hafez',
    dsPortalName: 'Ahmed Galal Hassan Hafez',
  },
  {
    id: 'emp-14', user: 'mohamed.hisham', domainName: 'Mohamed.Hisham',
    name: '', nameEn: 'Mohamed Hisham Sayed',
    email: 'mohamed.hisham@te.eg', mobile: '1148058520', nationalId: '', employeeCode: '7850',
    level: 7, role: 'Senior',
    operatorAccount: 'Mohamed Hisham Sayed Taha',
    dsPortalName: 'Mohamed Hisham Sayed',
  },
  {
    id: 'emp-15', user: 'ahmed.h.bahaa', domainName: 'Ahmed.H.Bahaa',
    name: '', nameEn: 'Ahmed Hassan Bahaa Mohamed',
    email: 'ahmed.h.bahaa@te.eg', mobile: '1550917070', nationalId: '', employeeCode: '8142',
    level: 7, role: 'Senior',
    operatorAccount: 'Ahmed Hassan Bahaa Mohamed',
    dsPortalName: 'Ahmed Hassan Bahaa Mohamed',
  },
  {
    id: 'emp-16', user: 'ali.mahrous', domainName: 'ali.mahrous',
    name: '', nameEn: 'Ali Mahrous Ali Mohamed',
    email: 'ali.mahrous@te.eg', mobile: '1555333017', nationalId: '', employeeCode: '5839',
    level: 7, role: 'Senior',
    operatorAccount: 'Ali mahrous ali mohamed',
    dsPortalName: 'Ali mahrous ali mohamed',
  },
  {
    id: 'emp-17', user: 'ahmed.eldin', domainName: 'Ahmed.Eldin',
    name: '', nameEn: 'Ahmed Alaa El Dein Abdel Mawla Mahmoud',
    email: 'ahmed.eldin@te.eg', mobile: '1555957321', nationalId: '', employeeCode: '6882',
    level: 7, role: 'Senior',
    operatorAccount: 'Ahmed Alaa Eldin Abdelmawla',
    dsPortalName: 'Ahmed Alaa El Dein Abdel Mawla Mahmoud',
  },

  // ── Agents (Level 8) — from Agent Data sheet ─────────────────────────────

  {
    id: 'emp-18', user: 'wael.m165124', domainName: 'Wael.M165124',
    name: '', nameEn: 'Wael Mohamed Abd-Taleb Mohamed',
    email: 'Wael.M165124@te.eg', mobile: '', nationalId: '', employeeCode: '165124',
    level: 8, role: 'Agent',
    operatorAccount: 'Wael Mohamed Abd-Taleb Mohamed',
    dsPortalName: 'Wael Mohamed Abd-Taleb Mohamed',
  },
  {
    id: 'emp-19', user: 'assem.gamal', domainName: 'Assem.Gamal',
    name: '', nameEn: 'Assem Mohamed Gamal El-Din Mohamed Abd El-Aziz',
    email: 'Assem.Gamal@te.eg', mobile: '1115332004', nationalId: '', employeeCode: '7702',
    level: 8, role: 'Agent',
    operatorAccount: 'Assem Mohamed Gamal El-Din Mohamed Abd El-Aziz',
    dsPortalName: 'Assem Mohamed Gamal El-Din Mohamed Abd El-Aziz',
  },
  {
    id: 'emp-20', user: 'mahmoud.h.moursy', domainName: 'Mahmoud.h.moursy',
    name: '', nameEn: 'Mahmoud Hamdy Abdelwahab',
    email: 'Mahmoud.h.moursy@te.eg', mobile: '1007653329', nationalId: '', employeeCode: '7703',
    level: 8, role: 'Agent',
    operatorAccount: 'Mahmoud Hamdy Abdelwahab Moursy',
    dsPortalName: 'Mahmoud Hamdy Abdelwahab',
  },
  {
    id: 'emp-21', user: 'mohamed.r236311', domainName: 'Mohamed.R236311',
    name: '', nameEn: 'Mohamed Rabeaa Abd-El Aziz Hussien',
    email: 'Mohamed.R236311@te.eg', mobile: '1501517676', nationalId: '29606012415715', employeeCode: '236311',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Rabeaa AbdElAziz Hussien',
    dsPortalName: 'Mohamed Rabeaa Abd-El Aziz Hussien',
  },
  {
    id: 'emp-22', user: 'mohamed.g121369', domainName: 'Mohamed.G121369',
    name: '', nameEn: 'Mohamed Gabir Amin',
    email: 'Mohamed.G121369@te.eg', mobile: '', nationalId: '', employeeCode: '121369',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Gaber Amin',
    dsPortalName: 'Mohamed Gabir Amin',
  },
  {
    id: 'emp-23', user: 'fady.tawfik', domainName: 'Fady.Tawfik',
    name: '', nameEn: 'Fady Atta Kamal Tawfik',
    email: 'Fady.Tawfik@te.eg', mobile: '1289391113', nationalId: '29504172400857', employeeCode: '8474',
    level: 8, role: 'Agent',
    operatorAccount: 'Fady Tawfik',
    dsPortalName: 'Fady Atta Kamal Tawfik',
  },
  {
    id: 'emp-24', user: 'mahmoud.g216859', domainName: 'Mahmoud.G216859',
    name: '', nameEn: 'Mahmoud Gamal Heshmat Abd-El Aleem',
    email: 'Mahmoud.G216859@te.eg', mobile: '1148732679', nationalId: '29510012412972', employeeCode: '216859',
    level: 8, role: 'Agent',
    operatorAccount: 'Mahmoud Gamal Heshmat Abd-El Aleem',
    dsPortalName: 'Mahmoud Gamal Heshmat Abd-El Aleem',
  },
  {
    id: 'emp-25', user: 'xcc.abdlrhman.277026', domainName: 'xcc.abdlrhman.277026',
    name: '', nameEn: 'Abdelrahman Mohamed Ibrahem Mohamed',
    email: 'xcc.abdlrhman.277026@te.eg', mobile: '', nationalId: '', employeeCode: '277026',
    level: 8, role: 'Agent',
    operatorAccount: 'XCC.AbdlRhman.277026',
    dsPortalName: 'Abdelrahman mohamed ibrahem Mohamed',
  },
  {
    id: 'emp-26', user: 'ahmed.s214059', domainName: 'Ahmed.S214059',
    name: '', nameEn: 'Ahmed Salah Mohamed Aly',
    email: 'Ahmed.S214059@te.eg', mobile: '1551217182', nationalId: '29409012401099', employeeCode: '214059',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed S214059',
    dsPortalName: 'Ahmed Salah Mohamed Aly',
  },
  {
    id: 'emp-27', user: 'ahmed.m165419', domainName: 'Ahmed.m165419',
    name: '', nameEn: 'Ahmed Mahmoud Ahmed Mohamed',
    email: 'Ahmed.m165419@te.eg', mobile: '', nationalId: '', employeeCode: '165419',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed mahmoud ahmed Mohamed',
    dsPortalName: 'Ahmed mahmoud ahmed Mohamed',
  },
  {
    id: 'emp-28', user: 'waleed.s.ahmed', domainName: 'Waleed.S.Ahmed',
    name: '', nameEn: 'Waleed Ahmed Shehata Ahmed',
    email: 'Waleed.S.Ahmed@te.eg', mobile: '1158755402', nationalId: '29311152402036', employeeCode: '8256',
    level: 8, role: 'Agent',
    operatorAccount: 'Waleed S.Ahmed',
    dsPortalName: 'Waleed Ahmed Shehata Ahmed',
  },
  {
    id: 'emp-29', user: 'mostafa.a217432', domainName: 'Mostafa.A217432',
    name: '', nameEn: 'Mostafa Abdelkafy Tony Ali',
    email: 'Mostafa.A217432@te.eg', mobile: '', nationalId: '', employeeCode: '217432',
    level: 8, role: 'Agent',
    operatorAccount: 'Mostafa A217432',
    dsPortalName: 'Mostafa Abdelkafy Tony Ali',
  },
  {
    id: 'emp-12', user: 'romany.eissa', domainName: 'Romany.Eissa',
    name: 'روماني عيسى', nameEn: 'Romany Eissa Fawzy Shafik',
    email: 'Romany.Eissa@te.eg', mobile: '1226741192', nationalId: '29502022401691', employeeCode: '8287',
    level: 8, role: 'Agent',
    operatorAccount: 'Romany.Eissa',
    dsPortalName: 'Romany Eissa Fawzy Shafik',
  },
  {
    id: 'emp-30', user: 'ahmed.zaref', domainName: 'Ahmed.Zaref',
    name: '', nameEn: 'Ahmed Zarief Mohamed Abd-El Hafez',
    email: 'Ahmed.Zaref@te.eg', mobile: '1026337221', nationalId: '29405282400838', employeeCode: '9070',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed Zareef Mohamed Abd ElHafez',
    dsPortalName: 'Ahmed Zarief Mohamed Abd-El Hafez',
  },
  {
    id: 'emp-31', user: 'ahmed.m.ismael', domainName: 'Ahmed.m.Ismael',
    name: '', nameEn: 'Ahmed Mohamed Hassan Ismael',
    email: 'Ahmed.m.Ismael@te.eg', mobile: '1029600894', nationalId: '29403062402594', employeeCode: '9071',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed Mohamed Hassan Ismaiel',
    dsPortalName: 'Ahmed Mohamed Hassan Ismael',
  },
  {
    id: 'emp-32', user: 'mohamed.a.elbadawy', domainName: 'mohamed.a.elbadawy',
    name: '', nameEn: 'Mohamed Ahmed Sayed',
    email: 'mohamed.a.elbadawy@te.eg', mobile: '1010081431', nationalId: '', employeeCode: '9072',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Ahmed Sayed ElBadawy Touni',
    dsPortalName: 'Mohamed Ahmed Sayed',
  },
  {
    id: 'emp-33', user: 'mahmoud.m239015', domainName: 'Mahmoud.m239015',
    name: '', nameEn: 'Mahmoud Mohamed Ismail Arafat',
    email: 'Mahmoud.m239015@te.eg', mobile: '', nationalId: '29502052402438', employeeCode: '239015',
    level: 8, role: 'Agent',
    operatorAccount: 'Mahmoud Mohamed Ismail Arafat',
    dsPortalName: 'Mahmoud Mohamed Ismail Arafat',
  },
  {
    id: 'emp-34', user: 'mohamed.henny', domainName: 'Mohamed.Henny',
    name: '', nameEn: 'Mohamed Yosry Hani',
    email: 'Mohamed.Henny@te.eg', mobile: '1150090984', nationalId: '29408232401972', employeeCode: '7849',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Yousry Henny Mohamed',
    dsPortalName: 'Mohamed Yosry Hani',
  },
  {
    id: 'emp-36', user: 'mohamed.a.tolba', domainName: 'Mohamed.A.Tolba',
    name: '', nameEn: 'Mohamed Abd-El Azem Mohamed Tolba',
    email: 'Mohamed.A.Tolba@te.eg', mobile: '', nationalId: '', employeeCode: '8141',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed AbdElAzem Mohamed Tolba',
    dsPortalName: 'Mohamed Abd-El Azem Mohamed Tolba',
  },
  {
    id: 'emp-37', user: 'xcc.hany.331230', domainName: 'xcc.Hany.331230',
    name: '', nameEn: 'Hany Mohsen Ahmed Fakhry',
    email: 'xcc.Hany.331230@te.eg', mobile: '', nationalId: '', employeeCode: '331230',
    level: 8, role: 'Agent',
    operatorAccount: 'Hany Mohsen Ahmed Fakhry',
    dsPortalName: 'Hany Mohsen Ahmed Fakhry',
  },
  {
    id: 'emp-38', user: 'xcc.ahmed.251614', domainName: 'XCC.Ahmed.251614',
    name: '', nameEn: 'Ahmed Rawy Nassar Maged',
    email: 'XCC.Ahmed.251614@te.eg', mobile: '1551474438', nationalId: '29509122400033', employeeCode: '251614',
    level: 8, role: 'Agent',
    operatorAccount: 'XCC.Ahmed.251614',
    dsPortalName: 'Ahmed Rawy Nassar Maged',
  },
  {
    id: 'emp-39', user: 'xcc.mohamed.355561', domainName: 'XCC.Mohamed.355561',
    name: '', nameEn: 'Mohamed Ahmed Hassan Mohamed',
    email: 'XCC.Mohamed.355561@te.eg', mobile: '', nationalId: '', employeeCode: '355561',
    level: 8, role: 'Agent',
    operatorAccount: 'XCC.Mohamed.355561',
    dsPortalName: 'Mohamed Ahmed Hassan Mohamed',
  },
  {
    id: 'emp-40', user: 'mohamed.a163825', domainName: 'Mohamed.A163825',
    name: '', nameEn: 'Mohamed Abd-El Mohsen Ahmed Abd-El Mohsen',
    email: 'Mohamed.A163825@te.eg', mobile: '1002039749', nationalId: '29202012402679', employeeCode: '163825',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed AbdelMohsen Ahmed Abd-El Mohsen',
    dsPortalName: 'Mohamed Abd-El Mohsen Ahmed Abd-El Mohsen',
  },
  {
    id: 'emp-41', user: 'ibs.mohamed.295879', domainName: 'Ibs.Mohamed.295879',
    name: '', nameEn: 'Mohamed Nasser Mohamed Shehata',
    email: 'Ibs.Mohamed.295879@te.eg', mobile: '', nationalId: '', employeeCode: '295879',
    level: 8, role: 'Agent',
    operatorAccount: 'Ibs.Mohamed.295879',
    dsPortalName: 'Mohamed Nasser Mohamed Shehata',
  },
]

// ── Branches ──────────────────────────────────────────────────────────────
// SOURCE: Branches Data sheet — OU codes, Arabic/English names, extensions

export const BRANCHES: Branch[] = [
  {
    id: 'br-01', ou: 'wS09Bi010921',
    storeName: 'Mallawy', storeNameAr: 'ملوى',
    ext1: '65676', ext2: '65673', ext3: '',
    extSenior: '66547',
    test1: '086-2580741', test2: '086-2580742',
  },
  {
    id: 'br-02', ou: 'wS10Bn010921',
    storeName: 'Der Mawas', storeNameAr: 'دير مواس',
    ext1: '65670', ext2: '', ext3: '',
    extSenior: '',
    test1: '086-2053200', test2: '086-2053201',
  },
  {
    id: 'br-03', ou: 'WS10BA090821',
    storeName: 'Dalga', storeNameAr: 'دلجا',
    ext1: '66026', ext2: '', ext3: '',
    extSenior: '',
    test1: '086-2035050', test2: '',
  },
  {
    id: 'br-04', ou: 'wS08Bb010921',
    storeName: 'Abo Kurkas', storeNameAr: 'ابوقرقاص',
    ext1: '65580', ext2: '65575', ext3: '',
    extSenior: '',
    test1: '086-2175053', test2: '086-2175052',
  },
  {
    id: 'br-05', ou: 'wS01Ba010921',
    storeName: 'Minya', storeNameAr: 'المنيا',
    ext1: '657351', ext2: '657352', ext3: '657353',
    extSenior: '657350',
    test1: '086-2337762', test2: '086-2337763',
  },
  {
    id: 'br-06', ou: 'wS02Bf010921',
    storeName: 'New Minya', storeNameAr: 'المنيا الجديدة',
    ext1: '65582', ext2: '', ext3: '',
    extSenior: '66027',
    test1: '086-2297952', test2: '086-2297951',
  },
  {
    id: 'br-07', ou: 'WS02BK310122',
    storeName: 'Bani Ahmed', storeNameAr: 'بني أحمد',
    ext1: '', ext2: '', ext3: '',
    extSenior: '',
    test1: '', test2: '',
  },
  {
    id: 'br-08', ou: 'WS01BA310122',
    storeName: 'Saft El-Khammar', storeNameAr: 'صفط الخمار',
    ext1: '', ext2: '', ext3: '',
    extSenior: '',
    test1: '', test2: '',
  },
]

// ── Branch Technical Profiles ─────────────────────────────────────────────
// SOURCE: Branches Devices and IP sheet — 3 branches fully documented

export const BRANCH_TECHNICAL: BranchTechnicalProfile[] = [
  {
    id: 'bt-01', branchId: 'br-01',
    code: 'wS09Bi010921',
    gateway:    '10.227.3.33',
    subnetMask: '255.255.255.240',
    printer:    '10.227.3.36',
    fingerPrint:'10.227.3.37',
    userIps:    ['10.227.3.45', '10.227.3.46'],
    dnsEntries: ['10.19.110.19', '10.19.110.20'],
    pcNames:    ['EGLUXTEMALDT02', 'EGLUXTEMALDT01'],
    pcSenior:   'EGCACSODT042',
    macAddresses: ['F4-39-09-3E-6C-E7', 'F4-39-09-3D-EF-5C', 'C8-5A-CF-08-A7-2F'],
    extraRows: [
      { label: 'Senior PC IP', value: '10.227.3.44' },
      { label: 'IP Q',         value: '10.89.13.174' },
    ],
  },
  {
    id: 'bt-02', branchId: 'br-02',
    code: 'wS10Bn010921',
    gateway:    '10.227.8.33',
    subnetMask: '255.255.255.240',
    printer:    '10.227.8.36',
    fingerPrint:'10.227.8.37',
    userIps:    ['10.227.8.46'],
    dnsEntries: ['10.19.110.19', '10.8.0.20'],
    pcNames:    ['DESKTOP-MJJ19Ql'],
    pcSenior:   '',
    macAddresses: ['F4-39-09-20-75-72'],
    extraRows: [
      { label: 'IP Q', value: '10.89.13.166' },
    ],
  },
  {
    id: 'bt-03', branchId: 'br-03',
    code: 'WS10BA090821',
    gateway:    '10.227.27.65',
    subnetMask: '255.255.255.64/29',
    printer:    '10.44.34.68',
    fingerPrint:'',
    userIps:    ['10.227.27.70'],
    dnsEntries: ['10.19.110.19', '10.19.110.20'],
    pcNames:    ['EGMNIACSODT024'],
    pcSenior:   '',
    macAddresses: ['9C-7B-EF-34-82-C7'],
    extraRows: [
      { label: 'IP Q', value: '10.89.30.236' },
    ],
  },
  { id: 'bt-04', branchId: 'br-04', code: 'wS08Bb010921', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-05', branchId: 'br-05', code: 'wS01Ba010921', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-06', branchId: 'br-06', code: 'wS02Bf010921', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-07', branchId: 'br-07', code: 'WS02BK310122', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-08', branchId: 'br-08', code: 'WS01BA310122', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
]

// ── Branch Assets ─────────────────────────────────────────────────────────
// SOURCE: Branches Devices and IP sheet — all devices with serial + model

export const BRANCH_ASSETS: BranchAsset[] = [
  // Mallawy (br-01) — 15 devices
  { id: 'ba-001', branchId: 'br-01', assetType: 'MF_Printer',      serial: 'PHC6J51831',    model: 'HP-LaserJet-Pro-M402n' },
  { id: 'ba-002', branchId: 'br-01', assetType: 'Color_Scanner',   serial: 'X2H9024118',    model: 'Epson-DS-530' },
  { id: 'ba-003', branchId: 'br-01', assetType: 'MF_Printer',      serial: 'S3719061051',   model: 'Xerox-VersaLink-B405MFP' },
  { id: 'ba-004', branchId: 'br-01', assetType: 'Corded_Barcode',  serial: '18152B5921',    model: 'Honeywell-1450G2D-2USB-1' },
  { id: 'ba-005', branchId: 'br-01', assetType: 'Corded_Barcode',  serial: '18156B0701',    model: 'Honeywell-1450G2D-2USB-1' },
  { id: 'ba-006', branchId: 'br-01', assetType: 'Desktop',         serial: '8CG8518KDQ',    model: 'HP-290-G2-Corei3' },
  { id: 'ba-007', branchId: 'br-01', assetType: 'Desktop',         serial: '8CG8517VM7',    model: 'HP-290-G2-Corei3' },
  { id: 'ba-008', branchId: 'br-01', assetType: 'Screen',          serial: '3CQ8411VW4',    model: 'HP-18.5Inches-V197' },
  { id: 'ba-009', branchId: 'br-01', assetType: 'Screen',          serial: '3CQ8411SB9',    model: 'HP-18.5Inches-V197' },
  { id: 'ba-010', branchId: 'br-01', assetType: 'Avaya',           serial: '13N545610488',  model: 'Avaya 9608-R42' },
  { id: 'ba-011', branchId: 'br-01', assetType: 'Avaya',           serial: '19WZ153007P7',  model: '1608-11608D02A-003' },
  { id: 'ba-012', branchId: 'br-01', assetType: 'Desktop',         serial: 'CZC209BZ7K',   model: 'HP ProDesk 400 G7 Base' },
  { id: 'ba-013', branchId: 'br-01', assetType: 'Screen',          serial: 'CN414634RM+',   model: 'HP P22v G4 Monitor' },
  { id: 'ba-014', branchId: 'br-01', assetType: 'Avaya',           serial: '13N543306347',  model: 'Avaya 9608-R42' },
  { id: 'ba-015', branchId: 'br-01', assetType: 'Corded_Barcode',  serial: '20331B3BF5',    model: 'Honeywell-1470G2D-6USB-1-R' },

  // Der Mawas (br-02) — 5 devices
  { id: 'ba-016', branchId: 'br-02', assetType: 'MF_Printer',      serial: '3719062830',    model: 'Xerox-VersaLink-B405MFP' },
  { id: 'ba-017', branchId: 'br-02', assetType: 'Corded_Barcode',  serial: '18155B6831',    model: 'Honeywell-1450G2D-2USB-1' },
  { id: 'ba-018', branchId: 'br-02', assetType: 'Desktop',         serial: '8CG8341D49',    model: 'HP-290-G2-Corei3' },
  { id: 'ba-019', branchId: 'br-02', assetType: 'Screen',          serial: '3CQ830079Q',    model: 'HP-18.5Inches-V197' },
  { id: 'ba-020', branchId: 'br-02', assetType: 'Avaya',           serial: '19WZ152008DR',  model: 'Avaya-1608' },

  // Dalga (br-03) — 6 devices
  { id: 'ba-021', branchId: 'br-03', assetType: 'Desktop',         serial: 'CZC0107KWC',   model: 'HP-290-G2-Corei3' },
  { id: 'ba-022', branchId: 'br-03', assetType: 'Screen',          serial: '3CQ8451NJF',    model: 'HP-18.5Inches-V197' },
  { id: 'ba-023', branchId: 'br-03', assetType: 'Color_Scanner',   serial: 'X2H9024142',    model: 'Epson-DS-530' },
  { id: 'ba-024', branchId: 'br-03', assetType: 'Avaya',           serial: '19WZ153008N2',  model: 'Avaya-1608' },
  { id: 'ba-025', branchId: 'br-03', assetType: 'Corded_Barcode',  serial: '20331B3C30',    model: 'Honeywell-1450G2D-2USB-1' },
  { id: 'ba-026', branchId: 'br-03', assetType: 'Sales_Printer',   serial: '3719444201',    model: '' },
]

// ── Assignment History ────────────────────────────────────────────────────
// Add real assignments through the dashboard UI.
// Rule: toDate === null means currently assigned.

export const ASSIGNMENT_HISTORY: AssignmentHistory[] = []

// ── Annual Leave Initial Records ──────────────────────────────────────────
// SOURCE: Annual Leave sheet

export const ANNUAL_LEAVE_INITIAL: AnnualLeaveRecord[] = [
  {
    id: 'al-seed-001',
    employeeId: 'emp-21',   // Mohamed.R236311
    branchId:   'br-01',   // Mallawy
    date:       '2026-04-07',
    days:       1,
    note:       '',
    createdAt:  '2026-04-07T00:00:00.000Z',
  },
]

// ── Permission Initial Records ────────────────────────────────────────────
// SOURCE: Permission sheet

export const PERMISSION_INITIAL: PermissionRecord[] = [
  {
    id: 'pm-seed-001',
    employeeId:   'emp-21',   // Mohamed.R236311
    branchId:     'br-01',   // Mallawy
    date:         '2026-04-07',
    hours:        2,
    minutes:      0,
    decimalHours: 2,
    note:         '',
    createdAt:    '2026-04-07T00:00:00.000Z',
  },
]

// ── Sick Leave Initial Records ────────────────────────────────────────────
// SOURCE: Sick leave sheet

export const SICK_LEAVE_INITIAL: SickLeaveRecord[] = [
  {
    id: 'sl-seed-001',
    employeeId: 'emp-21',   // Mohamed.R236311
    branchId:   'br-01',   // Mallawy
    fromDate:   '2026-04-07',
    toDate:     '2026-04-07',
    days:       1,
    note:       'sick',
    createdAt:  '2026-04-07T00:00:00.000Z',
  },
]

// ── Instead Of Initial Records ────────────────────────────────────────────
// SOURCE: "instead of" sheet — employees who worked on their day off / holiday.
// Only records where the sheet has a confirmed date are included.
// Employees with count > 0 but no date: dates not yet recorded in sheet.
// "Replace with day" column is empty in sheet → compensatoryDate not set.

export const INSTEAD_OF_INITIAL: InsteadOfRecord[] = [
  // 23-Mar-2026 group (worked on holiday)
  { id: 'io-seed-001', employeeId: 'emp-33', date: '2026-03-23', note: '', createdAt: '2026-03-23T00:00:00.000Z' }, // Mahmoud Mohamed Ismail Arafat (239015)
  { id: 'io-seed-002', employeeId: 'emp-25', date: '2026-03-23', note: '', createdAt: '2026-03-23T00:00:00.000Z' }, // Abdelrahman Mohamed Ibrahem (277026)
  { id: 'io-seed-003', employeeId: 'emp-21', date: '2026-03-23', note: '', createdAt: '2026-03-23T00:00:00.000Z' }, // Mohamed Rabeaa Abd-El Aziz Hussien (236311)

  // 19-Mar-2026 group (worked on holiday)
  { id: 'io-seed-004', employeeId: 'emp-41', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Mohamed Nasser Mohamed Shehata (295879)
  { id: 'io-seed-005', employeeId: 'emp-20', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Mahmoud Hamdy Abdelwahab (7703)
  { id: 'io-seed-006', employeeId: 'emp-27', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Ahmed Mahmoud Ahmed Mohamed (165419)
  { id: 'io-seed-007', employeeId: 'emp-19', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Assem Mohamed Gamal (7702)
  { id: 'io-seed-008', employeeId: 'emp-23', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Fady Atta Kamal Tawfik (8474)
  { id: 'io-seed-009', employeeId: 'emp-24', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Mahmoud Gamal Heshmat (216859)
  { id: 'io-seed-010', employeeId: 'emp-36', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Mohamed Abd-El Azem Mohamed Tolba (8141)
  { id: 'io-seed-011', employeeId: 'emp-38', date: '2026-03-19', note: '', createdAt: '2026-03-19T00:00:00.000Z' }, // Ahmed Rawy Nassar Maged (251614)
]

// ── Working in Day Off Initial Records ────────────────────────────────────
// SOURCE: Working in day off sheet

export const WORKING_DAY_OFF_INITIAL: WorkingDayOffRecord[] = [
  {
    id: 'wd-seed-001',
    employeeId: 'emp-21',   // Mohamed.R236311
    branchId:   'br-02',   // Der Mawas
    date:       '2026-04-09',
    note:       '',
    createdAt:  '2026-04-09T00:00:00.000Z',
  },
]
