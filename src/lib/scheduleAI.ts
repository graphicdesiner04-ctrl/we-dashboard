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
  'br-03', // دلجا
  'br-02', // دير مواس
  'br-01', // ملوي
  'br-04', // أبوقرقاص
  'br-07', // بني أحمد
  'br-05', // المنيا
  'br-08', // صفط الخمار
  'br-06', // المنيا الجديدة
]

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
}

export function inferShift(empId: string): ShiftType {
  if (DEFAULT_SHIFTS[empId]) return DEFAULT_SHIFTS[empId]
  const n = parseInt(empId.replace('emp-', ''), 10)
  return isNaN(n) || n % 2 === 0 ? 'A' : 'B'
}

// ── السينيورز ─────────────────────────────────────────────────────────────────
export const SENIOR_MALLAWY    = 'emp-15'
export const SENIORS_MINYA_A   = ['emp-13', 'emp-16'] // → br-05 الشهور الزوجية
export const SENIORS_MINYA_B   = ['emp-14', 'emp-17'] // → br-06 الشهور الزوجية
export const ALL_SENIORS_MINYA = [...SENIORS_MINYA_A, ...SENIORS_MINYA_B]

// سينيور ملوي يعمل أحد–خميس فقط
const SENIOR_MALLAWY_DAYS = new Set([0, 1, 2, 3, 4])

// ── الفروع الأساسية ───────────────────────────────────────────────────────────
export const DEFAULT_HOME_BRANCHES: Record<string, string> = {
  'emp-26': 'br-03',                                                            // دلجا
  'emp-21': 'br-02', 'emp-38': 'br-02', 'emp-31': 'br-02',                    // دير مواس
  'emp-24': 'br-01', 'emp-28': 'br-01', 'emp-34': 'br-01', 'emp-23': 'br-01', // ملوي
  'emp-30': 'br-04', 'emp-37': 'br-04', 'emp-32': 'br-04', 'emp-12': 'br-04', // أبوقرقاص
  'emp-29': 'br-04', 'emp-18': 'br-04',                                        // أبوقرقاص (مرنون)
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
  startDate:    string
  weeks:        number
  empConfigs:   EmployeeAIConfig[]
  vacations:    VacationWeek[]
  visitCounts:  Record<string, number>
  autoVacation: boolean
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

  const eligible = employees.filter(e =>
    e.role !== 'Supervisor' && (e.region ?? 'south') === 'south',
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

    // الفيزيت هذا الأسبوع
    const visitId = weeklyVisitEmp.get(weekNum)

    // ══ سينيورز — خارج الحساب ══════════════════════════════════════════════════

    // سينيور ملوي: أحد–خميس فقط
    if (SENIOR_MALLAWY_DAYS.has(d) && avail(SENIOR_MALLAWY)) {
      push(SENIOR_MALLAWY, {
        employeeId: SENIOR_MALLAWY, branchId: 'br-01', date,
        cellType: 'branch', startTime: '09:00', endTime: '21:00',
        note: 'AI — سينيور ملوي',
      })
    }

    // سينيورز المنيا: دوران شهري بين br-05 و br-06
    const curMonth  = new Date(date + 'T00:00:00').getMonth()
    const swapped   = ((curMonth - startMonth + 12) % 12) % 2 === 1
    const pairBr05  = swapped ? SENIORS_MINYA_B : SENIORS_MINYA_A
    const pairBr06  = swapped ? SENIORS_MINYA_A : SENIORS_MINYA_B
    for (const sid of pairBr05)
      if (avail(sid))
        push(sid, { employeeId: sid, branchId: 'br-05', date, cellType: 'branch', startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا' })
    for (const sid of pairBr06)
      if (avail(sid))
        push(sid, { employeeId: sid, branchId: 'br-06', date, cellType: 'branch', startTime: '09:00', endTime: '21:00', note: 'AI — سينيور المنيا الجديدة' })

    // ══ ما قبل الخطوات: تمييز أيام الراحة ═════════════════════════════════════
    // كل وكيل لا يعمل اليوم (حسب شيفته وأسبوعه) يأخذ "راحة"
    // استثناءات: موظفو الفروع الصغيرة (جدولهم مختلف) + موظف الفيزيت (أحد-خميس)

    for (const agent of agents) {
      if (!avail(agent.id)) continue                       // إجازة سنوية
      if (DEDICATED_IDS.has(agent.id)) continue            // الفروع الصغيرة تُدار في الخطوة 1
      if (agent.id === visitId && d <= 4) continue         // فيزيت: يعمل كامل أحد-خميس
      if (!isWorkDay(getShift(agent.id), weekNum, d)) {
        push(agent.id, { employeeId: agent.id, date, cellType: 'off', note: 'راحة' })
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
        // الموظف المخصص متاح
        push(dedId, {
          employeeId: dedId, branchId: brId, date,
          cellType: 'branch', startTime: '09:00', endTime: '16:00',
          note: 'AI — فرع صغير',
        })
      } else {
        // الموظف في إجازة → أقرب IBS بديل (ليس مخصص لفرع صغير آخر، ليس في استخدام)
        const sub = agents
          .filter(e =>
            !usedToday.has(e.id) && !isVac(e.id) &&
            classifyEmp(e) === 'IBS'           &&
            !DEDICATED_IDS.has(e.id)           &&
            !SMALL_BRANCHES.has(getHome(e)),
          )
          .sort((a, b) => geoIdx(getHome(a)) - geoIdx(getHome(b)) || Math.random() - 0.5)

        if (sub.length > 0) {
          push(sub[0].id, {
            employeeId: sub[0].id, branchId: brId, date,
            cellType: 'branch', startTime: '09:00', endTime: '16:00',
            note: 'AI — فرع صغير (بديل)',
          })
        } else {
          const br = brMap.get(brId)
          warnings.push({ date, branchId: brId, branchNameAr: br?.storeNameAr ?? brId, need: 1, got: 0 })
        }
      }
    }

    // ══ الخطوة 2: دير مواس br-02 + المنيا الجديدة br-06 ══════════════════════
    // كل فرع: موظف واحد يومياً
    // (الموظفون غير العاملين اليوم موجودون بالفعل في usedToday بعد خطوة الراحة)

    for (const brId of ['br-02', 'br-06'] as const) {
      // 1. من نفس الفرع — العاملون اليوم فقط
      const fromBranch = agents.filter(e => getHome(e) === brId && avail(e.id))

      if (fromBranch.length > 0) {
        push(fromBranch[0].id, {
          employeeId: fromBranch[0].id, branchId: brId, date,
          cellType: 'branch', startTime: '09:00', endTime: '21:00',
          note: `AI — شيفت ${getShift(fromBranch[0].id)}`,
        })
        continue
      }

      // 2. تعويض: أقرب فرع متاح
      const nearest = agents
        .filter(e => avail(e.id))
        .sort((a, b) => {
          const da = Math.abs(geoIdx(getHome(a)) - geoIdx(brId))
          const db = Math.abs(geoIdx(getHome(b)) - geoIdx(brId))
          return da !== db ? da - db : Math.random() - 0.5
        })

      if (nearest.length > 0) {
        push(nearest[0].id, {
          employeeId: nearest[0].id, branchId: brId, date,
          cellType: 'branch', startTime: '09:00', endTime: '21:00',
          note: 'AI — تعويض (أقرب فرع)',
        })
      } else {
        const br = brMap.get(brId)
        warnings.push({ date, branchId: brId, branchNameAr: br?.storeNameAr ?? brId, need: 1, got: 0 })
      }
    }

    // ══ الخطوة 3: ملوي br-01 + أبوقرقاص br-04 ═════════════════════════════════
    // كل فرع: موظفان يومياً

    for (const brId of ['br-01', 'br-04'] as const) {
      const needed = 2
      let placed   = 0

      // 1. من نفس الفرع — العاملون اليوم فقط
      const fromBranch = agents.filter(e => getHome(e) === brId && avail(e.id))
      for (const emp of fromBranch) {
        if (placed >= needed) break
        push(emp.id, {
          employeeId: emp.id, branchId: brId, date,
          cellType: 'branch', startTime: '09:00', endTime: '21:00',
          note: `AI — شيفت ${getShift(emp.id)}`,
        })
        placed++
      }

      // 2. تعويض: أقرب فرع متاح (ليس مخصص لفرع صغير)
      if (placed < needed) {
        const nearest = agents
          .filter(e => avail(e.id) && !DEDICATED_IDS.has(e.id) && !SMALL_BRANCHES.has(getHome(e)))
          .sort((a, b) => {
            const da = Math.abs(geoIdx(getHome(a)) - geoIdx(brId))
            const db = Math.abs(geoIdx(getHome(b)) - geoIdx(brId))
            return da !== db ? da - db : Math.random() - 0.5
          })
        for (const emp of nearest) {
          if (placed >= needed) break
          push(emp.id, {
            employeeId: emp.id, branchId: brId, date,
            cellType: 'branch', startTime: '09:00', endTime: '21:00',
            note: 'AI — تعويض (أقرب فرع)',
          })
          placed++
        }
      }

      if (placed < needed) {
        const br = brMap.get(brId)
        warnings.push({ date, branchId: brId, branchNameAr: br?.storeNameAr ?? brId, need: needed, got: placed })
      }
    }

    // ══ الخطوة 4: الفيزيت (أحد → خميس) ════════════════════════════════════════

    if (visitId && d <= 4 && avail(visitId)) { // أحد(0)–خميس(4)
      push(visitId, {
        employeeId: visitId, date,
        cellType: 'visit', startTime: '09:00', endTime: '17:00',
        note: 'AI — زيارة خارجية',
      })
    }

    // ══ الخطوة 5: المنيا — امتصاص الفائض ══════════════════════════════════════

    for (const agent of agents) {
      if (!avail(agent.id)) continue
      push(agent.id, {
        employeeId: agent.id, branchId: 'br-05', date,
        cellType: 'branch', startTime: '09:00', endTime: '21:00',
        note: 'AI — المنيا',
      })
    }

    // تحقق: المنيا ≥ 2 وكلاء (غير السينيورز)
    const minyaAgents = [...usedToday].filter(id =>
      agents.some(a => a.id === id) &&
      entries.some(e => e.employeeId === id && e.date === date && e.branchId === 'br-05'),
    ).length
    if (minyaAgents < 2) {
      const br = brMap.get('br-05')
      warnings.push({ date, branchId: 'br-05', branchNameAr: br?.storeNameAr ?? 'المنيا', need: 2, got: minyaAgents })
    }

    // ══ إدخالات "راحة" للسينيورز في أيام عدم العمل ════════════════════════════

    // سينيور ملوي: راحة جمعة + سبت
    if (!usedToday.has(SENIOR_MALLAWY) && !isVac(SENIOR_MALLAWY)) {
      entries.push({ employeeId: SENIOR_MALLAWY, date, cellType: 'off', note: 'راحة' })
    }
    // سينيورز المنيا: إن لم يُوضَعوا اليوم، راحة
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
