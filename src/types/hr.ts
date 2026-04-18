// ── WE Technical Support Dashboard — HR Types ────────────────────────────
// Entity model aligned with real Excel workbook structure.

// ── Employee (Agent sheet) ────────────────────────────────────────────────
export type EmployeeRole = 'Senior' | 'Agent'

export interface Employee {
  id: string
  user: string          // system login username
  name: string          // Arabic display name
  nameEn: string        // English name
  email: string
  mobile: string
  nationalId: string
  employeeCode: string  // WE staff code
  domainName?: string   // AD domain name (unique key)
  level?: number        // job level (7 = Senior, 8 = Agent)
  role?: EmployeeRole
  operatorAccount?: string
  dsPortalName?: string
}

// ── Branch (CSO sheet) ───────────────────────────────────────────────────
export interface Branch {
  id: string
  ou: string            // Organizational Unit code (e.g. wS09Bi010921)
  storeName: string     // English display name
  storeNameAr?: string  // Arabic display name
  ext1: string
  ext2: string
  ext3: string
  extSenior: string
  test1: string
  test2: string
}

// ── Branch Technical Profile (Mallawy / DerMawas / Dalga sheets) ─────────
export interface TechnicalRow {
  label: string
  value: string
}

export interface BranchTechnicalProfile {
  id: string
  branchId: string
  code: string          // branch infrastructure code
  gateway: string
  subnetMask: string
  printer: string
  fingerPrint: string
  userIps: string[]
  dnsEntries: string[]
  pcNames: string[]
  pcSenior: string
  macAddresses: string[]
  extraRows: TechnicalRow[]   // router, switch, UPS, etc.
}

// ── Assignment History ────────────────────────────────────────────────────
// Employees and branches are independent; current branch is derived from
// the latest active assignment (toDate === null).
export interface AssignmentHistory {
  id: string
  employeeId: string
  branchId: string
  fromDate: string        // YYYY-MM-DD
  toDate: string | null   // null = currently assigned
  note: string
}

// ── Permission Hours ──────────────────────────────────────────────────────
// Branch is selected manually at entry time (not derived from assignment).
export interface PermissionRecord {
  id: string
  employeeId: string
  branchId: string
  date: string            // YYYY-MM-DD
  fromTime?: string       // HH:MM (optional)
  toTime?: string         // HH:MM (optional)
  hours: number
  minutes: number
  decimalHours: number
  note: string
  createdAt: string
}

export interface EmployeeSummary {
  employee: Employee
  currentBranchId: string | null   // from latest active assignment
  totalDecimalHours: number
  remainingHours: number
  isOverLimit: boolean
  recordsCount: number
}

export interface PermissionsKPI {
  totalEmployees: number
  totalUsedHours: number
  totalRemainingHours: number
  employeesOverLimit: number
}

export const MONTHLY_LIMIT_HOURS = 4

// ── Annual Leave ──────────────────────────────────────────────────────────
export interface AnnualLeaveRecord {
  id: string
  employeeId: string
  branchId: string        // selected manually at entry time
  date: string            // YYYY-MM-DD (start date)
  days: number
  note: string
  createdAt: string
}

export interface AnnualLeaveSummary {
  employee: Employee
  currentBranchId: string | null
  totalDaysUsed: number
  remainingDays: number
  isOverLimit: boolean
  recordsCount: number
}

export interface AnnualLeaveKPI {
  totalEmployees: number
  totalDaysUsed: number
  totalRemainingDays: number
  employeesOverLimit: number
}

export const ANNUAL_LEAVE_DAYS = 21

// ── Sick Leave ────────────────────────────────────────────────────────────
export interface SickLeaveRecord {
  id: string
  employeeId: string
  branchId: string
  fromDate: string        // YYYY-MM-DD
  toDate: string          // YYYY-MM-DD
  days: number
  note: string
  createdAt: string
}

// ── Working in Day Off ────────────────────────────────────────────────────
export interface WorkingDayOffRecord {
  id: string
  employeeId: string
  branchId: string
  date: string            // YYYY-MM-DD (the holiday/day-off date worked)
  note: string
  createdAt: string
}

// ── Instead Of (worked on holiday / day off) ──────────────────────────────
// Employee works on their scheduled day off / holiday.
// Days accumulate → they earn compensatory days back ("Replace with day").
export interface InsteadOfRecord {
  id: string
  employeeId: string
  branchId?: string            // where they worked (optional — not always recorded)
  date: string                 // YYYY-MM-DD (the holiday / day off they worked)
  replacementDate?: string     // YYYY-MM-DD (the replacement day taken in return)
  note: string
  createdAt: string
}

// ── Schedule ──────────────────────────────────────────────────────────────
// One entry = one cell in the schedule matrix (employee × date).
export type ScheduleCellType = 'branch' | 'off' | 'annual' | 'sick' | 'visit' | 'note' | 'empty'

export interface ScheduleEntry {
  id: string
  employeeId: string
  branchId?: string       // required for 'branch' / 'visit'
  date: string            // YYYY-MM-DD
  cellType: ScheduleCellType
  startTime?: string      // HH:MM
  endTime?: string        // HH:MM
  note: string
  createdAt: string
}

export interface ScheduleAlert {
  entry: ScheduleEntry
  currentBranchId: string | null
  scheduledBranchId: string
}

// ── Branch Asset Inventory ────────────────────────────────────────────────
// One record per physical asset (Router, Switch, UPS, Printer, Fingerprint…)
export interface BranchAsset {
  id: string
  branchId: string
  assetType: string   // 'Router' | 'Switch' | 'UPS' | 'Printer' | etc.
  serial: string
  model: string
}

// ── Change OU ─────────────────────────────────────────────────────────────
// Formal OU transfer records — TEData format sent to HR system.
export interface ChangeOURecord {
  id: string
  userAccount: string      // domain account e.g. Ahmed.Zaref
  accountName: string      // full name
  email: string
  mobile: string
  idNumber: string
  roleName: string         // e.g. 'Retail Technical Specialist'
  oldOU: string            // old branch display name
  newOU: string            // new branch display name
  oldOUCode: string        // OU code e.g. wS09Bi010921
  newOUCode: string
  cashBoxClosed: string    // usually "we don't have cash box"
  directManager: string
  managerEmail: string
  division: string
  department: string       // الادارة
  generalDept: string      // الادارة العامة
  sector: string           // القطاع
  affiliation: string      // التابعية
  employeeNumber: string   // رقم العامل
  note: string
  createdAt: string
}
