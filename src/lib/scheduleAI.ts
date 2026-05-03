// ── WE AI Schedule Generator — WEEKLY SHIFT SYSTEM ──────────────────────────
//
// ترتيب التنفيذ اليومي (ثابت لا يتغير):
//   1. الفروع الصغيرة  (دلجا br-03 + بني أحمد br-07 + صفط br-08)
//   2. دير مواس br-02 + المنيا الجديدة br-06
//   3. ملوي br-01 + أبوقرقاص br-04
//   4. الفيزيت  (أسبوع كامل أحد–خميس، موظف واحد من المنيا)
//   5. المنيا br-05  (امتصاص الفائض)
//   (السينيورز يُوضَعون أولاً خارج الحساب في كل خطوة)
//
// نظام الشيفت الأسبوعي:
//   ثقيل  = أحد + اثنين + خميس + جمعة  (4 أيام)
//   خفيف  = سبت + ثلاثاء + أربعاء      (3 أيام)
//   الأسبوع الزوجي  (0,2,4...):  B ثقيل — A خفيف
//   الأسبوع الفردي  (1,3,5...):  A ثقيل — B خفيف
//   في يوم الراحة (غير الخفيف): الموظف يأخذ "off" — لا يذهب للمنيا
//
// الفروع الصغيرة:
//   موظف IBS ثابت، سبت–خميس، إجازة جمعة
//   في حالة إجازته: يُؤخذ بديل IBS من أقرب فرع
//
// المنيا = مركز الاستيعاب: كل موظف غير مُوزَّع يذهب إليها

import type { Employee, Branch } from '@/types/hr'
import type { ScheduleInput } from '@/hooks/useSchedule'

// ── ترتيب جغرافي جنوب → شمال ────────────────────────────────────────────────
export const GEO_ORDER = [
  'br-03', // دلجا          (0)
  'br-02', // دير مواس      (1)
  'br-01', // ملوي           (2)
  'br-04', // أبوقرقاص      (3)
  'br-07', // بني أحمد      (4)
  'br-08', // صفط الخمار    (5)
  'br-05', // المنيا         (6)
  'br-06', // المنيا الجديدة (7)
]

// الحد الأقصى للمسافة الجغرافية بحسب الفرع الأصلي للموظف
// دير مواس (1) → ±1: دلجا..ملوي
// ملوي (2)       → ±1: دير مواس..أبوقرقاص
// أبوقرقاص (3)  → ±3: ملوي..المنيا
// المنيا (6)     → ±3: أبوقرقاص..الجديدة
// الجديدة (7)    → ±3: بني أحمد..الجديدة
const MAX_GEO_BY_HOME: Record<string, number> = {
  'br-03': 2, // دلجا → يصل لملوي
  'br-02': 1, // دير مواس → دلجا ↔ ملوي
  'br-01': 1, // ملوي → دير مواس ↔ أبوقرقاص
  'br-04': 3, // أبوقرقاص → ملوي ↔ المنيا
  'br-07': 1, // بني أحمد (dedicated)
  'br-08': 1, // صفط (dedicated)
  'br-05': 3, // المنيا → أبوقرقاص ↔ الجديدة
  'br-06': 3, // الجديدة → بني أحمد ↔ الجديدة
}
function getMaxGeoDist(homeId: string): number {
  return MAX_GEO_BY_HOME[homeId] ?? 2
}

export const SMALL_BRANCHES = new Set(['br-03', 'br-07', 'br-08'])

// الفروع الصغيرة ← موظف IBS مخصص ثابت
const DEDICATED_MAP: Record<string, string> = {
  'emp-26': 'br-03',
  'emp-41': 'br-07',
  'emp-22': 'br-08',
}
const DEDICATED_IDS = new Set(Object.keys(DEDICATED_MAP))
// br-id → emp-id
const BRANCH_DEDICATED: Record<string, string> = Object.fromEntries(
  Object.entries(DEDICATED_MAP).map(([e, b]) => [b, e]),
)

// ── نظام الشيفت ───────────────────────────────────────────────────────────────
export type ShiftType = 'A' | 'B'

// الأيام الثقيلة: أحد(0) + اثنين(1) + خميس(4) + جمعة(5)
const HEAVY_DAYS = new Set([0, 1, 4, 5])
// الأيام الخفيفة: سبت(6) + ثلاثاء(2) + أربعاء(3)
const LIGHT_DAYS = new Set([6, 2, 3])

// هل الموظف يعمل اليوم؟
// الأسبوع الزوجي (0,2,4...): B ثقيل — A خفيف
// الأسبوع الفردي (1,3,5...): A ثقيل — B خفيف
export function isWorkDay(shift: ShiftType, weekNum: number, d: number): boolean {
  const isEvenWeek = weekNum % 2 === 0
  if (isEvenWeek) return shift === 'B' ? HEAVY_DAYS.has(d) : LIGHT_DAYS.has(d)
  return shift === 'A' ? HEAVY_DAYS.has(d) : LIGHT_DAYS.has(d)
}

// شيفت افتراضي لكل موظف — مأخوذ من جدول المرجع Schedule02.htm
const DEFAULT_SHIFTS: Record<string, ShiftType> = {
  // دير مواس br-02 — 3 موظفين A
  'emp-21': 'A', // 236311
  'emp-38': 'A', // 251614
  'emp-31': 'A', // 9071
  // ملوي br-01 — 1A + 3B
  'emp-24': 'A', // 216859
  'emp-28': 'B', // 8256
  'emp-34': 'B', // 7849
  'emp-23': 'B', // 8474
  // أبوقرقاص br-04 — 2A + 4B
  'emp-30': 'A', // 9070
  'emp-37': 'A', // 331230
  'emp-32': 'B', // 9072
  'emp-12': 'B', // 8287
  'emp-29': 'B', // 217432
  'emp-18': 'B', // 165124
  // المنيا الجديدة br-06 — 1A + 1B
  'emp-36': 'A', // 8141
  'emp-25': 'B', // 277026
  // المنيا br-05
  'emp-27': 'A', // 165419
  'emp-19': 'A', // 7702
  'emp-20': 'A', // 7703
  'emp-33': 'B', // 239015
  'emp-39': 'A', // 355561
  // السينيورز — يتبعون نظام الشيفت
  'emp-13': 'B', // احمد جلال (6813)
  'emp-14': 'B', // محمد هشام (7850)
  'emp-16': 'A', // علي محروس (5839)
  'emp-17': 'A', // احمد علاء (6882)
}

export function inferShift(empId: string): ShiftType {
  if (DEFAULT_SHIFTS[empId]) return DEFAULT_SHIFTS[empId]
  const n = parseInt(empId.replace('emp-', ''), 10)
  return isNaN(n) || n % 2 === 0 ? 'A' : 'B'
}

// ── السينيورز ─────────────────────────────────────────────────────────────────
export const SENIOR_MALLAWY  = 'emp-15' // احمد حسن بهاء — أحد-خميس فقط، بلا شيفت

// زوج شيفت B: محمد هشام (emp-14) + احمد جلال (emp-13) → يتبادلان المنيا/الجديدة شهرياً
export const SENIORS_SHIFT_B: string[] = ['emp-14', 'emp-13']
// زوج شيفت A: احمد علاء (emp-17) + علي محروس (emp-16) → يتبادلان المنيا/الجديدة شهرياً
export const SENIORS_SHIFT_A: string[] = ['emp-17', 'emp-16']
export const ALL_SENIORS_MINYA: string[] = [...SENIORS_SHIFT_B, ...SENIORS_SHIFT_A]

// سينيور ملوي يعمل أحد–خميس فقط، لا يتبع نظام الشيفت
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4])

// ── الفروع الأساسية ───────────────────────────────────────────────────────────
export const DEFAULT_HOME_BRANCHES: Record<string, string> = {
  'emp-26': 'br-03',                                                            // دلجا
  'emp-21': 'br-02', 'emp-38': 'br-02', 'emp-31': 'br-02',                    // دير مواس
  'emp-24': 'br-01', 'emp-28': 'br-01', 'emp-34': 'br-01', 'emp-23': 'br-01', // ملوي
  'emp-30': 'br-04', 'emp-37': 'br-04', 'emp-32': 'br-04', 'emp-12': 'br-04', // أبوقرقاص
  'emp-29': 'br-04', 'emp-18': 'br-05',                                        // وائل من المنيا
  'emp-41': 'br-07',                                                            // بني أحمد
  'emp-22': 'br-08',                                                            // صفط
  'emp-27': 'br-05', 'emp-19': 'br-05', 'emp-20': 'br-05',                    // المنيا
  'emp-33': 'br-05', 'emp-39': 'br-05',                                        // المنيا
  'emp-36': 'br-06', 'emp-25': 'br-06',                                        // المنيا الجديدة
}

// ── أنواع البيانات ────────────────────────────────────────────────────────────
export type EmployeeType = 'WE' | 'IBS'

export interface EmployeeAIConfig {
  employeeId:   string
  homeBranchId: string
  shift:        ShiftType
}

export interface VacationWeek {
  id:         string
  employeeId: string
  weekStart:  string // أحد ISO
}

export interface AIConfig {
  startDate:         string
  weeks:             number
  empConfigs:        EmployeeAIConfig[]
  vacations:         VacationWeek[]
  visitCounts:       Record<string, number>
  autoVacation:      boolean
  inactiveEmployees: string[]  // موظفون منقولون / موقفون — لا يدخلون التوزيع
}

// مرجع الأسبوع: الأحد 5 أبريل 2026 = أسبوع 0 (زوجي) → شيفت B ثقيل
const WEEK_OFFSET_REF = '2026-04-05'

/** يحسب ضبط تتابع الأسابيع بين تاريخ المرجع وتاريخ بداية الجدول الجديد */
export function calcWeekOffset(startDate: string): number {
  const refMs   = new Date(WEEK_OFFSET_REF + 'T00:00:00').getTime()
  const startMs = new Date(startDate        + 'T00:00:00').getTime()
  const days    = Math.round((startMs - refMs) / 86_400_000)
  return (((Math.floor(days / 7)) % 2) + 2) % 2
}

export interface AIWarning {
  date:         string
  branchId:     string
  branchNameAr: string
  need:         number
  got:          number
}

export interface WeekVisitInfo {
  weekStart: string
  employee:  Employee
  empType:   EmployeeType
}

export interface AIResult {
  entries:            ScheduleInput[]
  warnings:           AIWarning[]
  visitCounts:        Record<string, number>
  weekVisits:         WeekVisitInfo[]
  autoVacationsAdded: VacationWeek[]
}

// ── مساعدات ───────────────────────────────────────────────────────────────────

export function classifyEmp(emp: Employee): EmployeeType {
  return /\d/.test(emp.user) ? 'IBS' : 'WE'
}

function geoIdx(brId: string): number {
  const i = GEO_ORDER.indexOf(brId)
  return i < 0 ? 4 : i
}

// يُعيد ترتيب المصفوفة دورياً حسب الشهر (لتغيير من "يُرسل للخارج" كل شهر)
function rotatePriority<T>(arr: T[], monthOffset: number): T[] {
  if (arr.length <= 1) return arr
  const offset = monthOffset % arr.length
  return [...arr.slice(offset), ...arr.slice(0, offset)]
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function dow(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay()
}

export function getSunday(iso: string): string {
  const d   = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

// ── توزيع الإجازات تلقائياً ───────────────────────────────────────────────────
export function autoAssignVacations(
  agents:            Employee[],
  existingVacations: VacationWeek[],
  startDate:         string,
  weeks:             number,
): VacationWeek[] {
  const added      = [] as VacationWeek[]
  const allSundays = Array.from({ length: weeks }, (_, i) => addDays(startDate, i * 7))
  const periodEnd  = addDays(startDate, weeks * 7 - 1)

  const coveredIds = new Set(
    existingVacations
      .filter(v => v.weekStart >= startDate && v.weekStart <= periodEnd)
      .map(v => v.employeeId),
  )
  const needVac = agents.filter(e => !coveredIds.has(e.id))
  if (!needVac.length) return []

  const weekLoad: Record<string, number> = {}
  for (const s of allSundays) weekLoad[s] = 0
  for (const v of existingVacations)
    if (allSundays.includes(v.weekStart))
      weekLoad[v.weekStart] = (weekLoad[v.weekStart] ?? 0) + 1

  const maxPerWeek = Math.ceil((needVac.length + existingVacations.length) / weeks) + 1
  const shuffled   = [...needVac].sort(() => Math.random() - 0.5)

  for (const emp of shuffled) {
    const avail = allSundays.filter(s => (weekLoad[s] ?? 0) < maxPerWeek)
    if (!avail.length) continue
    avail.sort((a, b) => (weekLoad[a] ?? 0) - (weekLoad[b] ?? 0))
    const min  = weekLoad[avail[0]] ?? 0
    const tied = avail.filter(s => (weekLoad[s] ?? 0) === min)
    const pick = tied[Math.floor(Math.random() * tied.length)]
    weekLoad[pick] = (weekLoad[pick] ?? 0) + 1
    added.push({ id: `auto-${emp.id}-${pick}`, employeeId: emp.id, weekStart: pick })
  }
  return added
}

// ── المولِّد الرئيسي ──────────────────────────────────────────────────────────
export function generateAISchedule(
  employees: Employee[],
  branches:  Branch[],
  config:    AIConfig,
): AIResult {
  const entries:    ScheduleInput[] = []
  const warnings:   AIWarning[]     = []
  const visitCounts                 = { ...config.visitCounts }
  const weekVisits: WeekVisitInfo[] = []
  const visitFirstDay               = new Map<string, string>() // empId → أول تاريخ فيزيت

  const brMap  = new Map(branches.map(b => [b.id, b]))
  const cfgMap = new Map(config.empConfigs.map(c => [c.employeeId, c]))

  // ضبط تتابع الأسابيع بالنسبة لمرجع أبريل 2026
  const weekOffset = calcWeekOffset(config.startDate)

  // الموظفون المنقولون / الموقفون
  const inactiveSet = new Set(config.inactiveEmployees ?? [])

  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' &&
    (e.region ?? 'south') === 'south' &&
    !inactiveSet.has(e.id),
  )
  const agents  = eligible.filter(e => e.role === 'Agent')
  const seniors = eligible.filter(e => e.role === 'Senior')

  function getHome(emp: Employee): string {
    return cfgMap.get(emp.id)?.homeBranchId
      ?? DEFAULT_HOME_BRANCHES[emp.id]
      ?? emp.branchId
      ?? 'br-05'
  }

  function getShift(empId: string): ShiftType {
    return cfgMap.get(empId)?.shift ?? inferShift(empId)
  }

  // ── معالجة الإجازات ─────────────────────────────────────────────────────────
  let allVacations      = [...config.vacations]
  let autoVacationsAdded: VacationWeek[] = []

  if (config.autoVacation) {
    autoVacationsAdded = autoAssignVacations(agents, config.vacations, config.startDate, config.weeks)
    allVacations       = [...allVacations, ...autoVacationsAdded]
  }

  const vacDays = new Set<string>() // "empId:date"

  for (const v of allVacations) {
    // الإجازة أحد → خميس (5 أيام، تتخطى جمعة + سبت)
    for (let i = 0; i < 7; i++) {
      const d    = addDays(v.weekStart, i)
      const dDay = dow(d)
      if (dDay === 5 || dDay === 6) continue // جمعة وسبت مش إجازة سنوية
      vacDays.add(`${v.employeeId}:${d}`)
      entries.push({
        employeeId: v.employeeId,
        date:       d,
        cellType:   'annual',
        note:       autoVacationsAdded.some(a => a.id === v.id)
          ? 'AI — إجازة سنوية (تلقائي)'
          : 'AI — إجازة سنوية',
      })
    }
  }

  // ── توزيع الفيزيت أسبوعياً (WE: IBS = 2:1) ──────────────────────────────────
  // مجمع الفيزيت: موظفو المنيا (home=br-05) غير المخصصين للفروع الصغيرة
  const visitPool    = agents.filter(e => getHome(e) === 'br-05' && !DEDICATED_IDS.has(e.id))
  const weVisitPool  = visitPool.filter(e => classifyEmp(e) === 'WE')
  const ibsVisitPool = visitPool.filter(e => classifyEmp(e) === 'IBS')

  // weekVisitEmp[weekNum] = empId المُختار للفيزيت هذا الأسبوع
  const weeklyVisitEmp = new Map<number, string>()

  for (let w = 0; w < config.weeks; w++) {
    const weekSun = addDays(config.startDate, w * 7)

    // 2:1 → الأسابيع 0,1 = WE، الأسبوع 2 = IBS، 3,4 = WE، 5 = IBS ...
    const wantWE    = w % 3 !== 2
    const preferred = (wantWE && weVisitPool.length > 0) ? weVisitPool : ibsVisitPool
    const fallback  = (preferred === weVisitPool) ? ibsVisitPool : weVisitPool

    for (const pool of [preferred, fallback, visitPool]) {
      const avail = pool.filter(e => {
        for (let i = 0; i < 5; i++) { // أحد → خميس
          if (vacDays.has(`${e.id}:${addDays(weekSun, i)}`)) return false
        }
        return true
      })
      if (!avail.length) continue
      const minV  = Math.min(...avail.map(e => visitCounts[e.id] ?? 0))
      const tied  = avail.filter(e => (visitCounts[e.id] ?? 0) === minV)
      const pick  = tied[Math.floor(Math.random() * tied.length)]
      weeklyVisitEmp.set(w, pick.id)
      visitCounts[pick.id] = (visitCounts[pick.id] ?? 0) + 1
      if (!visitFirstDay.has(pick.id)) visitFirstDay.set(pick.id, weekSun)
      break
    }
  }

  // ── الحلقة اليومية ───────────────────────────────────────────────────────────
  const startMonth = new Date(config.startDate + 'T00:00:00').getMonth()
  const totalDays  = config.weeks * 7

  // ── Pre-computation: توزيع الفروع أسبوعياً ──────────────────────────────────
  // كل موظف يحصل على فرع واحد لكل أسبوع — لا تغيير في منتصف الأسبوع
  // نشغّل مرتين لكل أسبوع: مرة لشيفت A ومرة لشيفت B (يغطيان أيام مختلفة)

  // ── Pre-computation 0: بدلاء الفروع الصغيرة (محسوب أولاً لإخراجهم من الشيفت) ──
  // عندما يكون الموظف المخصص في إجازة → يُختار بديل IBS أقرب جغرافياً
  // البديل يشتغل Sat-Thu في الفرع الصغير ويُخرَج من توزيع الشيفت كلياً هذا الأسبوع

  const weeklySmallSub    = new Map<number, Map<string, string>>() // W → brId → subEmpId
  const weeklySmallSubIds = new Map<number, Set<string>>()         // W → Set<empId>

  for (let W = 0; W < config.weeks; W++) {
    const weekSun = addDays(config.startDate, W * 7)
    const subMap  = new Map<string, string>()
    const subIds  = new Set<string>()

    const isVacAllWeek = (id: string) => {
      for (let i = 0; i < 7; i++)
        if (vacDays.has(`${id}:${addDays(weekSun, i)}`)) return true
      return false
    }

    for (const [dedId, brId] of Object.entries(DEDICATED_MAP)) {
      if (!isVacAllWeek(dedId)) continue // الموظف حاضر، لا حاجة لبديل

      const candidates = agents.filter(e =>
        classifyEmp(e) === 'IBS'          &&
        !DEDICATED_IDS.has(e.id)          &&
        !SMALL_BRANCHES.has(getHome(e))   &&
        !subIds.has(e.id)                 &&
        !isVacAllWeek(e.id)               &&
        Math.abs(geoIdx(getHome(e)) - geoIdx(brId)) <= getMaxGeoDist(getHome(e)),
      ).sort((a, b) =>
        Math.abs(geoIdx(getHome(a)) - geoIdx(brId)) -
        Math.abs(geoIdx(getHome(b)) - geoIdx(brId)),
      )

      if (candidates.length > 0) {
        subMap.set(brId, candidates[0].id)
        subIds.add(candidates[0].id)
      }
    }

    weeklySmallSub.set(W, subMap)
    weeklySmallSubIds.set(W, subIds)
  }

  // ── Pre-computation 1: توزيع الفروع أسبوعياً (شيفت A و B منفصلَين) ────────────
  const weeklyAssignA = new Map<number, Map<string, string>>() // weekNum → empId → branchId|'visit'
  const weeklyAssignB = new Map<number, Map<string, string>>()

  function buildWeekAssignment(W: number, shift: ShiftType): Map<string, string> {
    const weekSun   = addDays(config.startDate, W * 7)
    const weekMonth = new Date(weekSun + 'T00:00:00').getMonth()
    const monthOff  = (weekMonth - startMonth + 12) % 12
    const vId       = weeklyVisitEmp.get(W)

    const isVacWeek = (id: string): boolean => {
      for (let i = 0; i < 7; i++)
        if (vacDays.has(`${id}:${addDays(weekSun, i)}`)) return true
      return false
    }

    const result = new Map<string, string>()
    const used   = new Set<string>()

    // فيزيت — إن كان نفس الشيفت
    if (vId && getShift(vId) === shift && !isVacWeek(vId)) {
      result.set(vId, 'visit'); used.add(vId)
    }

    // مجمع الموظفين المتاحين لهذا الشيفت هذا الأسبوع
    // (يُستثنى بدلاء الفروع الصغيرة — هم في مهمة أسبوعية خارج الشيفت)
    const pool = agents.filter(e =>
      getShift(e.id) === shift          &&
      !DEDICATED_IDS.has(e.id)          &&
      e.id !== vId                      &&
      !isVacWeek(e.id)                  &&
      !weeklySmallSubIds.get(W)?.has(e.id),
    )

    const availE = (id: string) => !used.has(id) && pool.some(e => e.id === id)
    const pickE  = (empId: string, brId: string) => { result.set(empId, brId); used.add(empId) }

    // دير مواس (br-02) + المنيا الجديدة (br-06): موظف واحد لكل
    for (const brId of ['br-02', 'br-06'] as const) {
      const fromHome = rotatePriority(
        pool.filter(e => getHome(e) === brId && availE(e.id)),
        monthOff,
      )
      if (fromHome.length > 0) { pickE(fromHome[0].id, brId); continue }

      // تعويض: أقرب موظف جغرافياً — ضمن مسافته الشخصية المسموح بها
      const nearest = pool
        .filter(e =>
          availE(e.id) &&
          Math.abs(geoIdx(getHome(e)) - geoIdx(brId)) <= getMaxGeoDist(getHome(e)),
        )
        .sort((a, b) =>
          Math.abs(geoIdx(getHome(a)) - geoIdx(brId)) -
          Math.abs(geoIdx(getHome(b)) - geoIdx(brId)),
        )
      if (nearest.length > 0) pickE(nearest[0].id, brId)
      // لا يوجد ضمن المسافة → تحذير يُسجَّل في الحلقة اليومية
    }

    // ملوي (br-01) + أبوقرقاص (br-04): موظفان لكل
    for (const brId of ['br-01', 'br-04'] as const) {
      const fromHome = rotatePriority(
        pool.filter(e => getHome(e) === brId && availE(e.id)),
        monthOff,
      )
      let placed = 0
      for (const emp of fromHome) {
        if (placed >= 2) break
        pickE(emp.id, brId); placed++
      }
      if (placed < 2) {
        const nearest = pool
          .filter(e =>
            availE(e.id) &&
            !SMALL_BRANCHES.has(getHome(e)) &&
            Math.abs(geoIdx(getHome(e)) - geoIdx(brId)) <= getMaxGeoDist(getHome(e)),
          )
          .sort((a, b) =>
            Math.abs(geoIdx(getHome(a)) - geoIdx(brId)) -
            Math.abs(geoIdx(getHome(b)) - geoIdx(brId)),
          )
        for (const emp of nearest) {
          if (placed >= 2) break
          pickE(emp.id, brId); placed++
        }
      }
    }

    // الباقون:
    // — إن كانت المنيا ضمن مسافة الموظف → يذهب للمنيا (مركز الاستيعاب)
    // — إن كانت بعيدة (دير مواس / ملوي) → أقرب فرع رئيسي مسموح به
    const MAIN_FALLBACK = ['br-02', 'br-01', 'br-04', 'br-05', 'br-06'] as const
    for (const emp of pool) {
      if (!availE(emp.id)) continue
      const homePos = geoIdx(getHome(emp))
      const maxDist = getMaxGeoDist(getHome(emp))
      if (Math.abs(geoIdx('br-05') - homePos) <= maxDist) {
        result.set(emp.id, 'br-05')
      } else {
        // ابحث عن أقرب فرع رئيسي ضمن النطاق
        const nearest = [...MAIN_FALLBACK]
          .filter(br => Math.abs(geoIdx(br) - homePos) <= maxDist)
          .sort((a, b) => Math.abs(geoIdx(a) - homePos) - Math.abs(geoIdx(b) - homePos))
        result.set(emp.id, nearest[0] ?? getHome(emp))
      }
    }

    return result
  }

  for (let W = 0; W < config.weeks; W++) {
    weeklyAssignA.set(W, buildWeekAssignment(W, 'A'))
    weeklyAssignB.set(W, buildWeekAssignment(W, 'B'))
  }

  // ─────────────────────────────────────────────────────────────────────────────

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const date    = addDays(config.startDate, dayIdx)
    const d       = dow(date)
    const weekNum = Math.floor(dayIdx / 7)

    const usedToday = new Set<string>()

    function push(empId: string, entry: ScheduleInput) {
      entries.push(entry)
      usedToday.add(empId)
    }

    const isVac  = (id: string) => vacDays.has(`${id}:${date}`)
    const avail  = (id: string) => !usedToday.has(id) && !isVac(id)

    // ══ سينيورز — خارج الحساب ══════════════════════════════════════════════════

    const curMonth   = new Date(date + 'T00:00:00').getMonth()
    const monthIdx   = ((curMonth - startMonth + 12) % 12) % 2

    // سينيور ملوي (emp-15): أحد–خميس بلا شيفت، جمعة+سبت = راحة
    if (avail(SENIOR_MALLAWY)) {
      if (SENIOR_MALLAWY_DAYS.has(d)) {
        push(SENIOR_MALLAWY, {
          employeeId: SENIOR_MALLAWY, branchId: 'br-01', date,
          cellType: 'branch', startTime: '09:00', endTime: d === 5 ? '16:00' : '21:00',
          note: 'AI — سينيور ملوي',
        })
      } else {
        push(SENIOR_MALLAWY, { employeeId: SENIOR_MALLAWY, date, cellType: 'off', note: 'راحة' })
      }
    }

    // سينيورز المنيا — شيفت B (emp-14, emp-13): دوران شهري للفرع
    const [senB_05, senB_06] = monthIdx === 0
      ? [SENIORS_SHIFT_B[0], SENIORS_SHIFT_B[1]]
      : [SENIORS_SHIFT_B[1], SENIORS_SHIFT_B[0]]
    // سينيورز المنيا — شيفت A (emp-17, emp-16): دوران شهري للفرع
    const [senA_05, senA_06] = monthIdx === 0
      ? [SENIORS_SHIFT_A[0], SENIORS_SHIFT_A[1]]
      : [SENIORS_SHIFT_A[1], SENIORS_SHIFT_A[0]]

    for (const [senId, brId] of [
      [senB_05, 'br-05'], [senB_06, 'br-06'],
      [senA_05, 'br-05'], [senA_06, 'br-06'],
    ] as [string, string][]) {
      if (!avail(senId)) continue
      if (!isWorkDay(getShift(senId), weekNum + weekOffset, d)) {
        push(senId, { employeeId: senId, date, cellType: 'off', note: 'راحة' })
      } else {
        const senEndTime = d === 5 ? '16:00' : '21:00'
        push(senId, {
          employeeId: senId, branchId: brId, date,
          cellType: 'branch', startTime: '09:00', endTime: senEndTime,
          note: `AI — سينيور ${brId === 'br-05' ? 'المنيا' : 'المنيا الجديدة'}`,
        })
      }
    }

    // ══ الخطوة 1: الفروع الصغيرة ═══════════════════════════════════════════════

    for (const brId of ['br-03', 'br-07', 'br-08'] as const) {
      const dedId = BRANCH_DEDICATED[brId]

      if (d === 5) {
        // جمعة → الموظف المخصص يأخذ إجازة
        if (dedId && avail(dedId))
          push(dedId, { employeeId: dedId, date, cellType: 'off', note: 'راحة جمعة' })
        continue
      }

      if (dedId && avail(dedId)) {
        // الموظف المخصص حاضر
        push(dedId, {
          employeeId: dedId, branchId: brId, date,
          cellType: 'branch', startTime: '09:00', endTime: '16:00',
          note: 'AI — فرع صغير',
        })
      } else {
        // الموظف في إجازة → البديل الأسبوعي المُحسَب مسبقاً سيُعالَج في حلقة الوكلاء
        const subId = weeklySmallSub.get(weekNum)?.get(brId)
        if (!subId) {
          const br = brMap.get(brId)
          warnings.push({ date, branchId: brId, branchNameAr: br?.storeNameAr ?? brId, need: 1, got: 0 })
        }
        // إن وُجد subId → سيُضاف في الحلقة التالية (حلقة الوكلاء)
      }
    }

    // ══ الوكلاء: توزيع من الجدول الأسبوعي المُحسوب مسبقاً ══════════════════════
    // كل موظف لديه فرع واحد لكل أسبوع — لا تغيير في منتصف الأسبوع
    // الجمعة = 7 ساعات (09:00–16:00) ، بقية الأيام = 12 ساعة (09:00–21:00)

    for (const agent of agents) {
      if (!avail(agent.id)) continue
      if (DEDICATED_IDS.has(agent.id)) continue // الفروع الصغيرة تُدار في الخطوة 1

      // هل هذا الموظف بديل فرع صغير هذا الأسبوع؟
      // البديل يشتغل Sat-Thu في الفرع الصغير بغض النظر عن شيفته
      const smallSubEntry = weeklySmallSub.get(weekNum)
      const smallSubBrId  = smallSubEntry
        ? [...smallSubEntry.entries()].find(([, sid]) => sid === agent.id)?.[0]
        : undefined

      if (smallSubBrId) {
        if (d === 5) {
          push(agent.id, { employeeId: agent.id, date, cellType: 'off', note: 'راحة جمعة' })
        } else {
          push(agent.id, {
            employeeId: agent.id, branchId: smallSubBrId, date,
            cellType: 'branch', startTime: '09:00', endTime: '16:00',
            note: 'AI — فرع صغير (بديل)',
          })
        }
        continue
      }

      const shift    = getShift(agent.id)
      const weekMap  = shift === 'A' ? weeklyAssignA.get(weekNum) : weeklyAssignB.get(weekNum)
      const assigned = weekMap?.get(agent.id)

      if (assigned === 'visit') {
        // فيزيت: أحد–خميس عمل، جمعة+سبت راحة (يتخطى نظام الشيفت)
        if (d <= 4) {
          push(agent.id, {
            employeeId: agent.id, date,
            cellType: 'visit', startTime: '09:00', endTime: '17:00',
            note: 'AI — زيارة خارجية',
          })
        } else {
          push(agent.id, { employeeId: agent.id, date, cellType: 'off', note: 'راحة' })
        }
      } else if (!isWorkDay(shift, weekNum + weekOffset, d)) {
        // يوم راحة لهذا الشيفت هذا الأسبوع
        push(agent.id, { employeeId: agent.id, date, cellType: 'off', note: 'راحة' })
      } else {
        // يوم عمل — الفرع المُعيَّن للأسبوع
        const branchId = assigned ?? 'br-05' // احتياطي: المنيا
        const endTime  = d === 5 ? '16:00' : '21:00' // جمعة 7 ساعات
        push(agent.id, {
          employeeId: agent.id, branchId, date,
          cellType: 'branch', startTime: '09:00', endTime,
          note: `AI — شيفت ${shift}`,
        })
      }
    }

    // تحقق من التغطية الدنيا للفروع
    for (const [brId, need] of [['br-02', 1], ['br-06', 1], ['br-01', 2], ['br-04', 2]] as const) {
      const got = entries.filter(e =>
        e.date === date && e.branchId === brId && e.cellType === 'branch' &&
        agents.some(a => a.id === e.employeeId),
      ).length
      if (got < need) {
        const br = brMap.get(brId)
        warnings.push({ date, branchId: brId, branchNameAr: br?.storeNameAr ?? brId, need, got })
      }
    }

    // ══ احتياطي: راحة لأي سينيور لم يُعالَج بعد ══════════════════════════════
    // (يُغطي حالات الإجازات والسينيورز خارج القوائم المعتادة)
    for (const sen of seniors) {
      if (usedToday.has(sen.id) || isVac(sen.id)) continue
      entries.push({ employeeId: sen.id, date, cellType: 'off', note: 'راحة' })
    }
  }

  // ── ملخص الفيزيت ─────────────────────────────────────────────────────────────
  for (const [empId, firstDate] of visitFirstDay.entries()) {
    const emp = employees.find(e => e.id === empId)
    if (emp) weekVisits.push({ weekStart: firstDate, employee: emp, empType: classifyEmp(emp) })
  }

  return { entries, warnings, visitCounts, weekVisits, autoVacationsAdded }
}
