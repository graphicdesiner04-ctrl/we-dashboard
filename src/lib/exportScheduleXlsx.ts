// ── Schedule Excel Export ─────────────────────────────────────────────────────
// Exports the schedule matrix as a colored Excel sheet.
// Branch fill colors match the official WE schedule (Schedule02.htm).

import * as XLSX from 'xlsx'
import type { Employee, Branch, ScheduleEntry } from '@/types/hr'

// xlsx doesn't export CellStyle — define locally
type XlsxStyle = {
  fill?:      { patternType: string; fgColor: { rgb: string }; bgColor: { rgb: string } }
  font?:      { name?: string; sz?: number; bold?: boolean; color?: { rgb: string } }
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean }
  border?:    { top?: { style: string }; bottom?: { style: string }; left?: { style: string }; right?: { style: string } }
}

// ── Branch fill colors (hex, from Schedule02.htm) ─────────────────────────────
const BRANCH_HEX: Record<string, string> = {
  'br-01': 'FF0000', // ملوي       — red
  'br-02': '7030A0', // دير مواس   — purple
  'br-03': '64DD6D', // دلجا       — light green
  'br-04': '006600', // أبوقرقاص   — dark green
  'br-05': '800000', // المنيا     — maroon
  'br-06': 'FFFF00', // المنيا ج.  — yellow
  'br-07': '527C03', // بني أحمد   — olive
  'br-08': '004080', // صفط        — dark blue
  // North
  'br-n01': '0E7490',
  'br-n02': '064E3B',
  'br-n03': 'C2410C',
  'br-n04': '6D28D9',
  'br-n05': '374151',
  'br-n06': 'B45309',
}

// Cell type fills (no branch)
const TYPE_HEX: Record<string, string> = {
  off:    'E0E0E0', // gray
  annual: 'FFCC99', // light orange
  sick:   'FF9999', // light red
  visit:  'FFE0B2', // peach
  swap:   'B2EBF2', // light cyan
  note:   'E8D5FF', // light purple
  empty:  'FFFFFF',
}

// Font color: white on dark fills, black on light fills
function fontColor(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? 'FFFFFF' : '000000'
}

function makeFill(hex: string): XlsxStyle['fill'] {
  return { patternType: 'solid', fgColor: { rgb: hex }, bgColor: { rgb: hex } }
}

function makeFont(hex: string, bold = false): XlsxStyle['font'] {
  return { name: 'Cairo', sz: 9, bold, color: { rgb: fontColor(hex) } }
}

function getEmpName(emp: Employee): string {
  return (emp.nameEn || emp.name || emp.domainName || emp.user).slice(0, 28)
}

function getBranchShort(branchId: string, branches: Branch[]): string {
  const b = branches.find(b => b.id === branchId)
  return b?.storeNameAr || b?.storeName || branchId
}

// ── Main export function ──────────────────────────────────────────────────────

export function exportScheduleXlsx(
  employees: Employee[],
  branches: Branch[],
  entries: ScheduleEntry[],
  monthLabel: string,
  year: number,
  month: number, // 1-based
) {
  // Build list of days in the month
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  // Build entry lookup: empId+date → entry
  const entryMap = new Map<string, ScheduleEntry>()
  for (const e of entries) {
    if (e.date >= days[0] && e.date <= days[days.length - 1]) {
      entryMap.set(`${e.employeeId}:${e.date}`, e)
    }
  }

  // Day-of-week Arabic labels
  const DOW_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

  // ── Build worksheet data ───────────────────────────────────────────────────
  const ws: XLSX.WorkSheet = {}
  const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }

  // Header style
  const hdrFill = makeFill('2D1B69')
  const hdrFont = { name: 'Cairo', sz: 10, bold: true, color: { rgb: 'FFFFFF' } }
  const hdrStyle: XlsxStyle = { fill: hdrFill, font: hdrFont, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } }

  // Row 0: Title
  const titleCell: XLSX.CellObject = {
    t: 's',
    v: `جدول العمل — ${monthLabel}`,
    s: { ...hdrStyle, font: { ...hdrFont, sz: 14, bold: true } },
  }
  ws['A1'] = titleCell
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: employees.length } }]

  // Row 1: Column headers — Date | emp1 | emp2 | ...
  const setCell = (r: number, c: number, v: string | number, style?: XlsxStyle) => {
    const addr = XLSX.utils.encode_cell({ r, c })
    ws[addr] = { t: typeof v === 'number' ? 'n' : 's', v, s: style }
    if (r > range.e.r) range.e.r = r
    if (c > range.e.c) range.e.c = c
  }

  // Row 1: headers
  setCell(1, 0, 'التاريخ', hdrStyle)
  setCell(1, 1, 'اليوم', hdrStyle)
  for (let i = 0; i < employees.length; i++) {
    setCell(1, i + 2, getEmpName(employees[i]), hdrStyle)
  }

  // Rows 2+: one per day
  for (let di = 0; di < days.length; di++) {
    const date = days[di]
    const row  = di + 2
    const dow  = new Date(date).getDay()
    const isFri = dow === 5

    // Date cell style
    const dateFill = isFri ? makeFill('FFE0B2') : makeFill('F5F5F5')
    const dateFont = { name: 'Cairo', sz: 9, bold: true, color: { rgb: isFri ? 'C2410C' : '1A1A2E' } }
    const dateBorder = { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } }
    const dateStyle: XlsxStyle = { fill: dateFill, font: dateFont, alignment: { horizontal: 'center', vertical: 'center' }, border: dateBorder }

    setCell(row, 0, date.slice(5), dateStyle)
    setCell(row, 1, DOW_AR[dow], dateStyle)

    // Employee cells
    for (let ei = 0; ei < employees.length; ei++) {
      const emp   = employees[ei]
      const entry = entryMap.get(`${emp.id}:${date}`)
      let fillHex = 'F5F5F5'
      let label   = ''

      if (entry) {
        const ct = entry.cellType ?? 'branch'
        if (ct === 'branch' && entry.branchId) {
          fillHex = BRANCH_HEX[entry.branchId] ?? 'CCCCCC'
          label   = getBranchShort(entry.branchId, branches)
        } else if (ct === 'visit' && entry.branchId) {
          fillHex = TYPE_HEX.visit
          label   = `زيارة`
        } else if (ct === 'off')    { fillHex = TYPE_HEX.off;    label = 'راحة'   }
        else if (ct === 'annual')   { fillHex = TYPE_HEX.annual; label = 'سنوي'   }
        else if (ct === 'sick')     { fillHex = TYPE_HEX.sick;   label = 'مريض'   }
        else if (ct === 'swap')     { fillHex = TYPE_HEX.swap;   label = 'تبديل'  }
        else if (ct === 'note')     { fillHex = TYPE_HEX.note;   label = entry.note.slice(0, 12) }
        else if (ct === 'empty')    { fillHex = TYPE_HEX.empty;  label = '' }
      }

      const cellStyle: XlsxStyle = {
        fill:      makeFill(fillHex),
        font:      makeFont(fillHex, !!entry),
        alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
        border:    { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
      }

      setCell(row, ei + 2, label, cellStyle)
    }
  }

  // ── Column widths ──────────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 10 }, // date
    { wch: 7 },  // day name
    ...employees.map(() => ({ wch: 14 })),
  ]

  // ── Row heights ────────────────────────────────────────────────────────────
  ws['!rows'] = [
    { hpx: 28 }, // title
    { hpx: 40 }, // header
    ...days.map(() => ({ hpx: 22 })),
  ]

  ws['!ref'] = XLSX.utils.encode_range(range)

  // ── Color legend sheet ─────────────────────────────────────────────────────
  const wsLegend: XLSX.WorkSheet = {}
  wsLegend['A1'] = { t: 's', v: 'الفرع', s: hdrStyle }
  wsLegend['B1'] = { t: 's', v: 'اللون', s: hdrStyle }
  const legendItems = [
    ...branches.map(b => ({ label: b.storeNameAr || b.storeName, hex: BRANCH_HEX[b.id] ?? 'CCCCCC' })),
    { label: 'راحة',       hex: TYPE_HEX.off    },
    { label: 'إجازة سنوية', hex: TYPE_HEX.annual },
    { label: 'إجازة مرضية', hex: TYPE_HEX.sick   },
    { label: 'زيارة',       hex: TYPE_HEX.visit  },
  ]
  legendItems.forEach((item, i) => {
    const r = i + 1
    wsLegend[XLSX.utils.encode_cell({ r, c: 0 })] = {
      t: 's', v: item.label,
      s: { font: { name: 'Cairo', sz: 10 }, alignment: { horizontal: 'center' } },
    }
    wsLegend[XLSX.utils.encode_cell({ r, c: 1 })] = {
      t: 's', v: '',
      s: { fill: makeFill(item.hex), font: makeFont(item.hex) },
    }
  })
  wsLegend['!cols']  = [{ wch: 18 }, { wch: 10 }]
  wsLegend['!ref']   = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: legendItems.length, c: 1 } })

  // ── Workbook ───────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, monthLabel)
  XLSX.utils.book_append_sheet(wb, wsLegend, 'دليل الألوان')

  XLSX.writeFile(wb, `Schedule-${year}-${String(month).padStart(2, '0')}.xlsx`)
}
