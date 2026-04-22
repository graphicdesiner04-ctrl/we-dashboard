/**
 * exportBranchAssets.ts
 * Generates an Excel file matching the official WE device-inventory template.
 *
 * Template layout (based on نموذج جرد الاجهزه الرقميه):
 *   Row 1–2  : merged title
 *   Row 3    : 25 column headers
 *   Row 4+   : one row per asset
 *   (gap)    : committee section at the bottom
 */

import * as XLSX from 'xlsx'
import type { Branch, BranchAsset } from '@/types/hr'

// ── Arabic device-type labels ─────────────────────────────────────────────
const DEVICE_LABELS: Record<string, string> = {
  PC:             'حاسب شخصي',
  Laptop:         'لابتوب',
  Monitor:        'شاشة',
  MF_Printer:     'طابعة متعددة المهام',
  Color_Scanner:  'الماسح الضوئي',
  Corded_Barcode: 'باركود',
  Phone:          'تيليفون',
  Router:         'راوتر',
  Switch:         'سويتش',
  UPS:            'UPS',
  Fingerprint:    'بصمة',
  // legacy types used in older seed data
  Desktop:        'حاسب شخصي',
  Screen:         'شاشة',
  Avaya:          'تيليفون',
  Sales_Printer:  'طابعة',
  Other:          'أخرى',
}

function deviceLabel(assetType: string) {
  return DEVICE_LABELS[assetType] ?? assetType
}

/** Extract brand from model string (first word) or asset type. */
function deriveBrand(model: string, assetType: string): string {
  if (!model) return ''
  const first = model.split(/[-\s]/)[0]
  return first || assetType
}

// ── Column widths (roughly matching original) ─────────────────────────────
const COL_WIDTHS = [
  4, 10, 22, 18, 14, 14, 12, 10, 18, 16,
  12, 10, 10, 10, 6, 8, 14, 14, 20, 22,
  18, 10, 18, 22, 14,
]

const HEADERS = [
  'م',
  'رقم العامل',
  'اسم الموظف',
  'الوظيفة',
  'الادارة',
  'الادارة العامة',
  'القطاع',
  'المنطقه',
  'إسم الفرع/السنترال',
  'كود الفرع/السنترال',
  'النيابة',
  'الشركة',
  'المحافظة',
  'المبنى',
  'الدور',
  'الغرفة',
  'رقم التليفون',
  'رقم الموبايل',
  'User Name',
  'الرقم المسلسل',
  'نوع الجهاز',
  'عهدة مكان',
  'جهاز شخصي من الخارج',
  'Model',
  'Brand',
]

// ── Committee members (static, from original template) ────────────────────
const COMMITTEE = [
  { role: 'رئيس اللجنة',      id: '2112', name: 'محمود سعد محمود مهني' },
  { role: 'عضو اللجنة رقم 1', id: '5214', name: 'محمد محمود محمد شلقامي' },
  { role: 'عضو اللجنة رقم 2', id: '6813', name: 'أحمد جلال حسن حافظ' },
]

// ── Cell style helpers (xlsx doesn't support full styling without Pro) ────
// We use basic formatting that xlsx supports (border, alignment, font).
// Full colour styling requires xlsx-style or a Pro license — keep it simple.

export function exportBranchAssetsXlsx(branch: Branch, assets: BranchAsset[]) {
  const branchAssets = assets.filter(a => a.branchId === branch.id)
  const wb = XLSX.utils.book_new()

  // ── Build worksheet data (array-of-arrays) ────────────────────────────
  const aoa: (string | number)[][] = []

  // Row 1: title (will be merged A1:Y2)
  aoa.push(['نموذج بيانات موظفين لطلب أجهزة', ...Array(24).fill('')])
  // Row 2: empty (part of merge)
  aoa.push(Array(25).fill(''))
  // Row 3: headers
  aoa.push([...HEADERS])

  // Data rows
  branchAssets.forEach((asset, i) => {
    aoa.push([
      i + 1,                                         // م
      '',                                            // رقم العامل
      '',                                            // اسم الموظف
      '',                                            // الوظيفة
      '',                                            // الادارة
      '',                                            // الادارة العامة
      'شمال الصعيد',                                 // القطاع
      'المنيا',                                       // المنطقه
      branch.storeNameAr ?? branch.storeName,        // إسم الفرع/السنترال
      branch.ou,                                     // كود الفرع/السنترال
      'خدمة العملاء',                                // النيابة
      'WE Data',                                     // الشركة
      'المنيا',                                       // المحافظة
      '',                                            // المبنى
      '',                                            // الدور
      '',                                            // الغرفة
      '',                                            // رقم التليفون
      '',                                            // رقم الموبايل
      '',                                            // User Name
      asset.serial,                                  // الرقم المسلسل
      deviceLabel(asset.assetType),                  // نوع الجهاز
      'نعم',                                         // عهدة مكان
      'لا',                                          // جهاز شخصي من الخارج
      asset.model,                                   // Model
      deriveBrand(asset.model, asset.assetType),     // Brand
    ])
  })

  // Empty gap before committee
  aoa.push(Array(25).fill(''))
  aoa.push(Array(25).fill(''))

  // Committee header row
  aoa.push(['بيانات اعضاء لجنة الجرد', ...Array(24).fill('')])
  aoa.push(['الدور', 'رقم العامل', 'الاسم', ...Array(22).fill('')])

  COMMITTEE.forEach(m => {
    aoa.push([m.role, m.id, m.name, ...Array(22).fill('')])
  })

  // ── Create worksheet ──────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Column widths
  ws['!cols'] = COL_WIDTHS.map(w => ({ wch: w }))

  // Merge title across A1:Y2
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 24 } },
  ]

  // Right-to-left sheet direction
  if (!ws['!sheetView']) ws['!sheetView'] = {}
  // Note: xlsx doesn't expose sheetViews as an object — set via props
  ;(ws as Record<string, unknown>)['!sheetView'] = { rightToLeft: true }

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // ── Download ──────────────────────────────────────────────────────────
  const fileName = `جرد_${branch.storeNameAr ?? branch.storeName}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}
