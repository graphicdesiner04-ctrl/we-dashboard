// ── WE Technical Support Dashboard — Seed Data ───────────────────────────
// SOURCE OF TRUTH: Google Sheet (Agent tab — imported 2026-04-15)
// Sheet URL: https://docs.google.com/spreadsheets/d/1a_nOF6MdVvqWH4wTgdVaR-gBFbt6sJwU9FIdBmet6VA
//
// Rules enforced:
//  • Fields blank in sheet → blank here. Do NOT auto-fill.
//  • domainName = exact casing from sheet (unique key, case-insensitive lookup)
//  • user       = domainName.trim().toLowerCase()
//  • Branches   = placeholder until CSO sheet is populated
//  • name       = Arabic name — empty until filled manually

import type {
  Employee, Branch, BranchTechnicalProfile,
  AssignmentHistory, BranchAsset, AnnualLeaveRecord,
} from '@/types/hr'

// ── Helper ────────────────────────────────────────────────────────────────
// Returns the best available display name for an employee.
// Priority: Arabic name → English name → domainName → user
export function getEmpName(emp: Employee): string {
  return emp.name || emp.nameEn || emp.domainName || emp.user
}

// ── Employees ─────────────────────────────────────────────────────────────
// 5  Seniors (Level 7) — from Excel import, not yet in Agent sheet
// 24 Agents  (Level 8) — from Agent sheet, last sync 2026-04-15
// Total: 29 employees

export const EMPLOYEES: Employee[] = [

  // ── Seniors (Level 7) — not in Agent sheet yet ──────────────────────────
  {
    id: 'emp-13', user: 'ahmed.g.hafez',       domainName: 'Ahmed.G.Hafez',
    name: '', nameEn: 'Ahmed Galal Hassan Hafez',
    email: '', mobile: '', nationalId: '', employeeCode: '',
    level: 7, role: 'Senior',
    operatorAccount: 'Ahmed Hafez',
    dsPortalName: 'Ahmed Galal Hassan Hafez',
  },
  {
    id: 'emp-14', user: 'mohamed.hisham',       domainName: 'Mohamed.Hisham',
    name: '', nameEn: 'Mohamed Hisham Sayed',
    email: '', mobile: '', nationalId: '', employeeCode: '',
    level: 7, role: 'Senior',
    operatorAccount: 'Mohamed Hisham Sayed Taha',
    dsPortalName: 'Mohamed Hisham Sayed',
  },
  {
    id: 'emp-15', user: 'ahmed.h.bahaa',        domainName: 'Ahmed.H.Bahaa',
    name: '', nameEn: 'Ahmed Hassan Bahaa Mohamed',
    email: '', mobile: '', nationalId: '', employeeCode: '',
    level: 7, role: 'Senior',
    operatorAccount: 'Ahmed Hassan Bahaa Mohamed',
    dsPortalName: 'Ahmed Hassan Bahaa Mohamed',
  },
  {
    id: 'emp-16', user: 'ali.mahrous',          domainName: 'Ali.Mahrous',
    name: '', nameEn: 'Ali Mahrous Ali Mohamed',
    email: '', mobile: '', nationalId: '', employeeCode: '',
    level: 7, role: 'Senior',
    operatorAccount: 'Ali mahrous ali mohamed',
    dsPortalName: 'Ali mahrous ali mohamed',
  },
  {
    id: 'emp-17', user: 'ahmed.eldin',          domainName: 'Ahmed.Eldin',
    name: '', nameEn: 'Ahmed Alaa El Dein Abdel Mawla Mahmoud',
    email: '', mobile: '', nationalId: '', employeeCode: '',
    level: 7, role: 'Senior',
    operatorAccount: 'Ahmed Alaa Eldin Abdelmawla',
    dsPortalName: 'Ahmed Alaa El Dein Abdel Mawla Mahmoud',
  },

  // ── Agents (Level 8) — imported from Agent sheet ─────────────────────────

  {
    id: 'emp-18', user: 'wael.m165124',         domainName: 'Wael.M165124',
    name: '', nameEn: 'Wael Mohamed Abd-Taleb Mohamed',
    email: 'Wael.M165124@te.eg', mobile: '01004286698', nationalId: '29112072404515', employeeCode: '165124',
    level: 8, role: 'Agent',
    operatorAccount: 'Wael Mohamed Abd-Taleb Mohamed',
    dsPortalName: 'Wael Mohamed Abd-Taleb Mohamed',
  },
  {
    id: 'emp-19', user: 'assem.gamal',          domainName: 'Assem.Gamal',
    name: '', nameEn: 'Assem Mohamed Gamal El-Din Mohamed Abd El-Aziz',
    email: 'Assem.Gamal@te.eg', mobile: '1115332004', nationalId: '', employeeCode: '7702',
    level: 8, role: 'Agent',
    operatorAccount: 'Assem Mohamed Gamal El-Din Mohamed Abd El-Aziz',
    dsPortalName: 'Assem Mohamed Gamal El-Din Mohamed Abd El-Aziz',
  },
  {
    id: 'emp-20', user: 'mahmoud.h.moursy',     domainName: 'Mahmoud.H.Moursy',
    name: '', nameEn: 'Mahmoud Hamdy Abdelwahab',
    email: 'Mahmoud.H.Moursy@te.eg', mobile: '01007653329', nationalId: '29403212400412', employeeCode: '7703',
    level: 8, role: 'Agent',
    operatorAccount: 'Mahmoud Hamdy Abdelwahab Moursy',
    dsPortalName: 'Mahmoud Hamdy Abdelwahab',
  },
  {
    id: 'emp-21', user: 'mohamed.r236311',      domainName: 'Mohamed.R236311',
    name: '', nameEn: 'Mohamed Rabeaa Abd-El Aziz Hussien',
    email: 'Mohamed.R236311@te.eg', mobile: '1501517676', nationalId: '29606012415715', employeeCode: '236311',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Rabeaa AbdElAziz Hussien',
    dsPortalName: 'Mohamed Rabeaa Abd-El Aziz Hussien',
  },
  {
    id: 'emp-22', user: 'mohamed.g121369',      domainName: 'Mohamed.G121369',
    name: '', nameEn: 'Mohamed Gabir Amin',
    email: 'Mohamed.G121369@te.eg', mobile: '', nationalId: '', employeeCode: '121369',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Gaber Amin',
    dsPortalName: 'Mohamed Gabir Amin',
  },
  {
    id: 'emp-23', user: 'fady.tawfik',          domainName: 'Fady.Tawfik',
    name: '', nameEn: 'Fady Atta Kamal Tawfik',
    email: 'Fady.Tawfik@te.eg', mobile: '1289391113', nationalId: '29504172400857', employeeCode: '8474',
    level: 8, role: 'Agent',
    operatorAccount: 'Fady Tawfik',
    dsPortalName: 'Fady Atta Kamal Tawfik',
  },
  {
    id: 'emp-24', user: 'mahmoud.g216859',      domainName: 'Mahmoud.G216859',
    name: '', nameEn: 'Mahmoud Gamal Heshmat Abd-El Aleem',
    email: 'Mahmoud.G216859@te.eg', mobile: '1148732679', nationalId: '29510012412972', employeeCode: '216859',
    level: 8, role: 'Agent',
    operatorAccount: 'Mahmoud Gamal Heshmat Abd-El Aleem',
    dsPortalName: 'Mahmoud Gamal Heshmat Abd-El Aleem',
  },
  {
    // ⚠ domain corrected: abdlrhman (sheet) — was abdirhman in previous import
    id: 'emp-25', user: 'xcc.abdlrhman.277026', domainName: 'xcc.abdlrhman.277026',
    name: '', nameEn: 'Abdelrahman Mohamed Ibrahem Mohamed',
    email: 'xcc.abdlrhman.277026@te.eg', mobile: '', nationalId: '', employeeCode: '277026',
    level: 8, role: 'Agent',
    operatorAccount: 'XCC.AbdlRhman.277026',
    dsPortalName: 'Abdelrahman mohamed ibrahem Mohamed',
  },
  {
    id: 'emp-26', user: 'ahmed.s214059',        domainName: 'Ahmed.S214059',
    name: '', nameEn: 'Ahmed Salah Mohamed Aly',
    email: 'Ahmed.S214059@te.eg', mobile: '1551217182', nationalId: '29409012401099', employeeCode: '214059',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed S214059',
    dsPortalName: 'Ahmed Salah Mohamed Aly',
  },
  {
    id: 'emp-27', user: 'ahmed.m165419',        domainName: 'Ahmed.m165419',
    name: '', nameEn: 'Ahmed Mahmoud Ahmed Mohamed',
    email: 'Ahmed.m165419@te.eg', mobile: '', nationalId: '', employeeCode: '165419',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed mahmoud ahmed Mohamed',
    dsPortalName: 'Ahmed mahmoud ahmed Mohamed',
  },
  {
    id: 'emp-28', user: 'waleed.s.ahmed',       domainName: 'Waleed.S.Ahmed',
    name: '', nameEn: 'Waleed Ahmed Shehata Ahmed',
    email: 'Waleed.S.Ahmed@te.eg', mobile: '1158755402', nationalId: '29311152402036', employeeCode: '8256',
    level: 8, role: 'Agent',
    operatorAccount: 'Waleed S.Ahmed',
    dsPortalName: 'Waleed Ahmed Shehata Ahmed',
  },
  {
    id: 'emp-29', user: 'mostafa.a217432',      domainName: 'Mostafa.A217432',
    name: '', nameEn: 'Mostafa Abdelkafy Tony Ali',
    email: 'Mostafa.A217432@te.eg', mobile: '', nationalId: '', employeeCode: '217432',
    level: 8, role: 'Agent',
    operatorAccount: 'Mostafa A217432',
    dsPortalName: 'Mostafa Abdelkafy Tony Ali',
  },
  {
    // Updated with real data from sheet (was mock before)
    id: 'emp-12', user: 'romany.eissa',         domainName: 'Romany.Eissa',
    name: 'روماني عيسى', nameEn: 'Romany Eissa Fawzy Shafik',
    email: 'Romany.Eissa@te.eg', mobile: '1226741192', nationalId: '29502022401691', employeeCode: '8287',
    level: 8, role: 'Agent',
    operatorAccount: 'Romany.Eissa',
    dsPortalName: 'Romany Eissa Fawzy Shafik',
  },
  {
    id: 'emp-30', user: 'ahmed.zaref',          domainName: 'Ahmed.Zaref',
    name: '', nameEn: 'Ahmed Zarief Mohamed Abd-El Hafez',
    email: 'Ahmed.Zaref@te.eg', mobile: '01113429605', nationalId: '29405282400838', employeeCode: '9070',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed Zareef Mohamed Abd ElHafez',
    dsPortalName: 'Ahmed Zarief Mohamed Abd-El Hafez',
  },
  {
    id: 'emp-31', user: 'ahmed.m.ismael',       domainName: 'Ahmed.m.Ismael',
    name: '', nameEn: 'Ahmed Mohamed Hassan Ismael',
    email: 'Ahmed.m.Ismael@te.eg', mobile: '1029600894', nationalId: '29403062402594', employeeCode: '9071',
    level: 8, role: 'Agent',
    operatorAccount: 'Ahmed Mohamed Hassan Ismaiel',
    dsPortalName: 'Ahmed Mohamed Hassan Ismael',
  },
  {
    id: 'emp-32', user: 'mohamed.a.elbadawy',   domainName: 'mohamed.a.elbadawy',
    name: '', nameEn: 'Mohamed Ahmed Sayed',
    email: 'mohamed.a.elbadawy@te.eg', mobile: '1010081431', nationalId: '', employeeCode: '9072',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Ahmed Sayed ElBadawy Touni',
    dsPortalName: 'Mohamed Ahmed Sayed',
  },
  {
    // ⚠ domain corrected: m239015 (sheet) — was mz39015 in previous import
    id: 'emp-33', user: 'mahmoud.m239015',      domainName: 'Mahmoud.m239015',
    name: '', nameEn: 'Mahmoud Mohamed Ismail Arafat',
    email: 'Mahmoud.m239015@te.eg', mobile: '01151500974', nationalId: '29502052402438', employeeCode: '239015',
    level: 8, role: 'Agent',
    operatorAccount: 'Mahmoud Mohamed Ismail Arafat',
    dsPortalName: 'Mahmoud Mohamed Ismail Arafat',
  },
  {
    id: 'emp-34', user: 'mohamed.henny',        domainName: 'Mohamed.Henny',
    name: '', nameEn: 'Mohamed Yosry Hani',
    email: 'Mohamed.Henny@te.eg', mobile: '1150090984', nationalId: '29408232401972', employeeCode: '7849',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed Yousry Henny Mohamed',
    dsPortalName: 'Mohamed Yosry Hani',
  },
  {
    id: 'emp-36', user: 'mohamed.a.tolba',      domainName: 'Mohamed.A.Tolba',
    name: '', nameEn: 'Mohamed Abd-El Azem Mohamed Tolba',
    email: 'Mohamed.A.Tolba@te.eg', mobile: '', nationalId: '', employeeCode: '8141',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed AbdElAzem Mohamed Tolba',
    dsPortalName: 'Mohamed Abd-El Azem Mohamed Tolba',
  },
  {
    id: 'emp-37', user: 'xcc.hany.331230',      domainName: 'xcc.Hany.331230',
    name: '', nameEn: 'Hany Mohsen Ahmed Fakhry',
    email: 'xcc.Hany.331230@te.eg', mobile: '01027728590', nationalId: '29710012405631', employeeCode: '331230',
    level: 8, role: 'Agent',
    operatorAccount: 'Hany Mohsen Ahmed Fakhry',
    dsPortalName: 'Hany Mohsen Ahmed Fakhry',
  },
  {
    id: 'emp-38', user: 'xcc.ahmed.251614',     domainName: 'XCC.Ahmed.251614',
    name: '', nameEn: 'Ahmed Rawy Nassar Maged',
    email: 'XCC.Ahmed.251614@te.eg', mobile: '1551474438', nationalId: '29509122400033', employeeCode: '251614',
    level: 8, role: 'Agent',
    operatorAccount: 'XCC.Ahmed.251614',
    dsPortalName: 'Ahmed Rawy Nassar Maged',
  },
  {
    id: 'emp-39', user: 'xcc.mohamed.355561',   domainName: 'XCC.Mohamed.355561',
    name: '', nameEn: 'Mohamed Ahmed Hassan Mohamed',
    email: 'XCC.Mohamed.355561@te.eg', mobile: '', nationalId: '', employeeCode: '355561',
    level: 8, role: 'Agent',
    operatorAccount: 'XCC.Mohamed.355561',
    dsPortalName: 'Mohamed Ahmed Hassan Mohamed',
  },
  {
    id: 'emp-40', user: 'mohamed.a163825',      domainName: 'Mohamed.A163825',
    name: '', nameEn: 'Mohamed Abd-El Mohsen Ahmed Abd-El Mohsen',
    email: 'Mohamed.A163825@te.eg', mobile: '1002039749', nationalId: '29202012402679', employeeCode: '163825',
    level: 8, role: 'Agent',
    operatorAccount: 'Mohamed AbdelMohsen Ahmed Abd-El Mohsen',
    dsPortalName: 'Mohamed Abd-El Mohsen Ahmed Abd-El Mohsen',
  },
  {
    // NEW — in Agent sheet, not in previous import
    id: 'emp-41', user: 'ibs.mohamed.295879',   domainName: 'Ibs.Mohamed.295879',
    name: '', nameEn: 'Mohamed Nasser Mohamed Shehata',
    email: 'Ibs.Mohamed.295879@te.eg', mobile: '', nationalId: '', employeeCode: '295879',
    level: 8, role: 'Agent',
    operatorAccount: 'Ibs.Mohamed.295879',
    dsPortalName: 'Mohamed Nasser Mohamed Shehata',
  },
]

// ── Branches ──────────────────────────────────────────────────────────────
// TODO: Replace with real CSO sheet data once populated.
// ext1/ext2/ext3/extSenior/test1/test2 left empty — no sheet data yet.

export const BRANCHES: Branch[] = [
  { id: 'br-01', ou: 'OU=Mallawy,OU=Branches',       storeName: 'Mallawy',        ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-02', ou: 'OU=DerMawas,OU=Branches',      storeName: 'Der Mawas',      ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-03', ou: 'OU=Dalga,OU=Branches',         storeName: 'Dalga',          ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-04', ou: 'OU=BeniAhmed,OU=Branches',     storeName: 'Beni Ahmed',     ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-05', ou: 'OU=AboQurqas,OU=Branches',     storeName: 'Abo Qurqas',     ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-06', ou: 'OU=SaftElKhamar,OU=Branches',  storeName: 'Saft El-Khamar', ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-07', ou: 'OU=Minya,OU=Branches',         storeName: 'Minya',          ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
  { id: 'br-08', ou: 'OU=NewMinya,OU=Branches',      storeName: 'New Minya',      ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '' },
]

// ── Branch Technical Profiles ─────────────────────────────────────────────
// TODO: Replace with real data once Mallawy / DerMawas / Dalga sheets are
// added to the spreadsheet. All fields empty until sheet is filled.

export const BRANCH_TECHNICAL: BranchTechnicalProfile[] = [
  { id: 'bt-01', branchId: 'br-01', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-02', branchId: 'br-02', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-03', branchId: 'br-03', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-04', branchId: 'br-04', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-05', branchId: 'br-05', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-06', branchId: 'br-06', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-07', branchId: 'br-07', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
  { id: 'bt-08', branchId: 'br-08', code: '', gateway: '', subnetMask: '', printer: '', fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [], pcSenior: '', macAddresses: [], extraRows: [] },
]

// ── Branch Assets ─────────────────────────────────────────────────────────
// TODO: Populate from branch sheet asset tables (Type / Serial / Model).

export const BRANCH_ASSETS: BranchAsset[] = []

// ── Assignment History ────────────────────────────────────────────────────
// Cleared — previous assignments linked mock employees no longer in the system.
// Add real assignments through the dashboard.
// Rule: toDate === null means currently assigned.

export const ASSIGNMENT_HISTORY: AssignmentHistory[] = []

// ── Annual Leave Initial Records ──────────────────────────────────────────
// SOURCE: Google Sheet gid=692362216 (Annual Leave tab), imported 2026-04-15

export const ANNUAL_LEAVE_INITIAL: AnnualLeaveRecord[] = [
  {
    id: 'al-seed-001',
    employeeId: 'emp-21',     // Mohamed.R236311 — Mohamed Rabeaa Abd-El Aziz Hussien
    branchId:   'br-01',     // Mallawy
    date:       '2026-04-07',
    days:       1,
    note:       '',
    createdAt:  '2026-04-07T00:00:00.000Z',
  },
]
