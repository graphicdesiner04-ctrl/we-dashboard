import { useState, useMemo, useEffect } from 'react'
import {
  Server, Wifi, Printer, Monitor, Cpu, ChevronDown, Info, Package,
  Plus, Pencil, Trash2, X, Save, AlertTriangle, Building2, Download,
} from 'lucide-react'
import { useRegion }   from '@/context/RegionContext'
import { useBranches } from '@/hooks/useBranches'
import type { BranchInput } from '@/hooks/useBranches'
import { useBranchTechnical } from '@/hooks/useBranchTechnical'
import type { Branch, BranchTechnicalProfile, BranchAsset } from '@/types/hr'
import type { ProfileInput, AssetInput } from '@/hooks/useBranchTechnical'
import { exportBranchAssetsXlsx } from '@/lib/exportBranchAssets'

const WE = '#6B21A8'

const ASSET_TYPES = [
  'MF_Printer','Color_Scanner','Corded_Barcode','Router','Switch',
  'UPS','Fingerprint','PC','Laptop','Monitor','Phone','Other',
]

// ── Helpers ───────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-theme last:border-0">
      <span className="text-xs text-tertiary flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-semibold text-primary text-left num break-all">{value || '—'}</span>
    </div>
  )
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-xs text-tertiary">—</span>
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((item, i) => (
        <span key={i} className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
          style={{ background: `${WE}12`, color: WE }}>{item}</span>
      ))}
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${WE}14` }}>
          <Icon size={14} style={{ color: WE }} />
        </div>
        <h3 className="text-xs font-black uppercase tracking-widest text-secondary">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Multi-value input (comma-separated tags) ──────────────────────────────
function MultiInput({ label, values, onChange }: {
  label: string; values: string[]; onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState(values.join(', '))
  return (
    <div>
      <label className="block text-xs font-bold text-secondary mb-1">{label}</label>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => onChange(draft.split(',').map(s => s.trim()).filter(Boolean))}
        className="we-input text-xs w-full font-mono"
        placeholder="افصل بين القيم بفاصلة ,"/>
    </div>
  )
}

// ── Extra rows editor ─────────────────────────────────────────────────────
function ExtraRowsEditor({ rows, onChange }: {
  rows: { label: string; value: string }[]
  onChange: (r: { label: string; value: string }[]) => void
}) {
  function update(i: number, k: 'label' | 'value', v: string) {
    const next = rows.map((r, j) => j === i ? { ...r, [k]: v } : r)
    onChange(next)
  }
  function addRow()    { onChange([...rows, { label: '', value: '' }]) }
  function removeRow(i: number) { onChange(rows.filter((_, j) => j !== i)) }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-secondary">صفوف إضافية (Router, Switch, UPS…)</label>
        <button onClick={addRow} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-bold transition-colors hover:opacity-80"
          style={{ background: `${WE}14`, color: WE }}><Plus size={9} /> إضافة</button>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input value={r.label} onChange={e => update(i, 'label', e.target.value)}
            placeholder="Label (e.g. Router)" className="we-input text-xs flex-1" />
          <input value={r.value} onChange={e => update(i, 'value', e.target.value)}
            placeholder="Value" className="we-input text-xs flex-1 font-mono" />
          <button onClick={() => removeRow(i)} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Profile form modal ────────────────────────────────────────────────────
function ProfileModal({ editing, branchId, branchName, onClose, onSave, onDelete }: {
  editing:    BranchTechnicalProfile | null
  branchId:   string
  branchName: string
  onClose:    () => void
  onSave:     (input: ProfileInput) => void
  onDelete?:  () => void
}) {
  const empty: ProfileInput = {
    branchId, code: '', gateway: '', subnetMask: '', printer: '',
    fingerPrint: '', userIps: [], dnsEntries: [], pcNames: [],
    pcSenior: '', macAddresses: [], extraRows: [],
  }
  const [form, setForm] = useState<ProfileInput>(
    editing ? { ...editing } : empty
  )
  function f(k: keyof ProfileInput, v: unknown) { setForm(p => ({ ...p, [k]: v })) }
  const Inp = ({ k, placeholder }: { k: keyof ProfileInput; placeholder?: string }) => (
    <input value={String(form[k] ?? '')} onChange={e => f(k, e.target.value)}
      placeholder={placeholder} className="we-input text-xs w-full font-mono" />
  )
  const L = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-secondary mb-1">{children}</label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              <Server size={14} style={{ color: WE }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary">{editing ? 'تعديل البيانات التقنية' : 'إضافة بيانات تقنية'}</h2>
              <p className="text-xs text-secondary">{branchName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && <button onClick={onDelete} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>}
            <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors"><X size={16} /></button>
          </div>
        </div>
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ direction: 'rtl' }}>
          <div className="grid grid-cols-2 gap-3">
            <div><L>كود الفرع (Code)</L><Inp k="code" placeholder="wS09Bi010921" /></div>
            <div><L>Gateway</L><Inp k="gateway" placeholder="10.227.3.33" /></div>
            <div><L>Subnet Mask</L><Inp k="subnetMask" placeholder="255.255.255.240" /></div>
            <div><L>Printer IP</L><Inp k="printer" placeholder="10.227.3.36" /></div>
            <div><L>Fingerprint IP</L><Inp k="fingerPrint" placeholder="10.227.3.37" /></div>
            <div><L>PC Senior</L><Inp k="pcSenior" placeholder="EGCACSODT042" /></div>
          </div>
          <MultiInput label="User IPs (افصل بفاصلة)" values={form.userIps} onChange={v => f('userIps', v)} />
          <MultiInput label="DNS Entries" values={form.dnsEntries} onChange={v => f('dnsEntries', v)} />
          <MultiInput label="PC Names" values={form.pcNames} onChange={v => f('pcNames', v)} />
          <MultiInput label="MAC Addresses" values={form.macAddresses} onChange={v => f('macAddresses', v)} />
          <ExtraRowsEditor rows={form.extraRows} onChange={v => f('extraRows', v)} />
        </div>
        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0 border-t pt-4" style={{ borderColor: 'var(--border)', direction: 'rtl' }}>
          <button onClick={() => { if (!form.code) { alert('يرجى إدخال كود الفرع'); return } onSave(form) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            {editing ? <><Save size={14} /> حفظ</> : <><Plus size={14} /> إضافة</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ── Asset form modal ──────────────────────────────────────────────────────
function AssetModal({ editing, branchId, onClose, onSave, onDelete }: {
  editing:   BranchAsset | null
  branchId:  string
  onClose:   () => void
  onSave:    (input: AssetInput) => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState<AssetInput>(
    editing ? { branchId: editing.branchId, assetType: editing.assetType, serial: editing.serial, model: editing.model }
            : { branchId, assetType: 'MF_Printer', serial: '', model: '' }
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${WE}14` }}>
              <Package size={13} style={{ color: WE }} />
            </div>
            <h2 className="text-sm font-black text-primary">{editing ? 'تعديل جهاز' : 'إضافة جهاز'}</h2>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && <button onClick={onDelete} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>}
            <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors"><X size={15} /></button>
          </div>
        </div>
        <div className="p-5 space-y-3" style={{ direction: 'rtl' }}>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">نوع الجهاز</label>
            <select value={form.assetType} onChange={e => setForm(p => ({ ...p, assetType: e.target.value }))} className="we-input text-xs w-full">
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">السيريال *</label>
            <input value={form.serial} onChange={e => setForm(p => ({ ...p, serial: e.target.value }))}
              placeholder="PHC6J51831" className="we-input text-xs w-full font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">الموديل</label>
            <input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
              placeholder="HP LaserJet Pro M402n" className="we-input text-xs w-full" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0 border-t pt-4" style={{ borderColor: 'var(--border)', direction: 'rtl' }}>
          <button onClick={() => { if (!form.serial.trim()) { alert('يرجى إدخال السيريال'); return } onSave(form) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            {editing ? <><Save size={13} /> حفظ</> : <><Plus size={13} /> إضافة</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ── Profile display (view mode) ───────────────────────────────────────────
function ProfileView({ profile, onEdit }: { profile: BranchTechnicalProfile; onEdit: () => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard icon={Wifi} title="الشبكة">
        <Row label="Code"        value={profile.code}       />
        <Row label="Gateway"     value={profile.gateway}    />
        <Row label="Subnet Mask" value={profile.subnetMask} />
        <div className="py-2 border-b border-theme last:border-0">
          <span className="text-xs text-tertiary">DNS</span>
          <TagList items={profile.dnsEntries} />
        </div>
      </SectionCard>

      <SectionCard icon={Printer} title="الأجهزة">
        <Row label="Printer"     value={profile.printer}     />
        <Row label="Fingerprint" value={profile.fingerPrint} />
        {profile.extraRows.map(r => <Row key={r.label} label={r.label} value={r.value} />)}
      </SectionCard>

      <SectionCard icon={Monitor} title="المستخدمون والأجهزة">
        <div className="py-2 border-b border-theme">
          <span className="text-xs text-tertiary">User IPs</span>
          <TagList items={profile.userIps} />
        </div>
        <div className="py-2 border-b border-theme">
          <span className="text-xs text-tertiary">PC Names</span>
          <TagList items={profile.pcNames} />
        </div>
        <Row label="PC Senior" value={profile.pcSenior} />
      </SectionCard>

      <SectionCard icon={Cpu} title="عناوين MAC">
        <div className="py-2">
          <TagList items={profile.macAddresses} />
        </div>
      </SectionCard>

      <div className="md:col-span-2 flex justify-end">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
          style={{ background: `${WE}14`, color: WE }}>
          <Pencil size={12} /> تعديل البيانات التقنية
        </button>
      </div>
    </div>
  )
}

// ── Assets table ──────────────────────────────────────────────────────────
function AssetsSection({ branchId, branch, assets, onAdd, onEdit, onDelete }: {
  branchId: string
  branch:   Branch
  assets:   BranchAsset[]
  onAdd:    () => void
  onEdit:   (a: BranchAsset) => void
  onDelete: (id: string) => void
}) {
  const branchAssets = assets.filter(a => a.branchId === branchId)

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${WE}14` }}>
            <Package size={13} style={{ color: WE }} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-secondary">
            سيريال الأجهزة · Device Serials
          </h3>
          {branchAssets.length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${WE}14`, color: WE }}>
              {branchAssets.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {branchAssets.length > 0 && (
            <button
              onClick={() => exportBranchAssetsXlsx(branch, assets)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ background: '#16A34A14', color: '#16A34A' }}
              title="تصدير إلى Excel بنفس شكل نموذج الجرد">
              <Download size={11} /> تصدير Excel
            </button>
          )}
          <button onClick={onAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)`, color: '#fff' }}>
            <Plus size={11} /> إضافة جهاز
          </button>
        </div>
      </div>

      {branchAssets.length === 0 ? (
        <div className="p-10 flex flex-col items-center gap-3 text-center">
          <Package size={32} className="text-tertiary" strokeWidth={1.3} />
          <p className="text-sm text-secondary font-semibold">لا توجد أجهزة مسجلة</p>
          <button onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            <Plus size={12} /> إضافة أول جهاز
          </button>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="we-table w-full min-w-[420px]">
            <thead>
              <tr>
                <th className="text-right">نوع الجهاز</th>
                <th className="text-right">الموديل</th>
                <th className="text-right">السيريال</th>
                <th className="text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {branchAssets.map(a => (
                <tr key={a.id}>
                  <td><span className="text-xs font-semibold text-primary">{a.assetType.replace(/_/g,' ')}</span></td>
                  <td><span className="text-xs text-secondary">{a.model || '—'}</span></td>
                  <td><span className="text-xs font-mono font-bold" style={{ color: WE }}>{a.serial}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(a)} className="p-1.5 rounded-lg text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => onDelete(a.id)} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Branch info / EXT modal ───────────────────────────────────────────────
function BranchInfoModal({ editing, region, onClose, onSave, onDelete }: {
  editing:   Branch | null   // null = add new
  region:    'south' | 'north'
  onClose:   () => void
  onSave:    (input: BranchInput & { region?: 'south' | 'north' }) => void
  onDelete?: () => void
}) {
  const empty: BranchInput & { region?: 'south' | 'north' } = {
    storeName: '', storeNameAr: '', ou: '',
    ext1: '', ext2: '', ext3: '', extSenior: '', test1: '', test2: '',
    region,
  }
  const [form, setForm] = useState<BranchInput & { region?: 'south' | 'north' }>(
    editing
      ? {
          storeName: editing.storeName, storeNameAr: editing.storeNameAr ?? '',
          ou: editing.ou, ext1: editing.ext1, ext2: editing.ext2,
          ext3: editing.ext3, extSenior: editing.extSenior,
          test1: editing.test1, test2: editing.test2, region: editing.region ?? 'south',
        }
      : empty
  )
  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const L = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-bold text-secondary mb-1">{children}</label>
  )
  const Inp = ({ k, placeholder }: { k: keyof typeof form; placeholder?: string }) => (
    <input value={String(form[k] ?? '')} onChange={e => f(k, e.target.value)}
      placeholder={placeholder} className="we-input text-xs w-full font-mono" />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${WE}16` }}>
              <Building2 size={14} style={{ color: WE }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary">{editing ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h2>
              <p className="text-xs text-secondary">بيانات CSO والامتدادات</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-elevated transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ direction: 'rtl' }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><L>اسم الفرع (إنجليزي) *</L><Inp k="storeName" placeholder="Mallawy" /></div>
            <div className="col-span-2"><L>اسم الفرع (عربي)</L>
              <input value={form.storeNameAr ?? ''} onChange={e => f('storeNameAr', e.target.value)}
                placeholder="الملوي" className="we-input text-xs w-full" style={{ direction: 'rtl' }} />
            </div>
          </div>
          <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">بيانات CSO</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><L>OU</L><Inp k="ou" placeholder="wS09Bi010921" /></div>
              <div><L>EXT 1</L><Inp k="ext1" placeholder="9070" /></div>
              <div><L>EXT 2</L><Inp k="ext2" placeholder="9071" /></div>
              <div><L>EXT 3</L><Inp k="ext3" placeholder="9072" /></div>
              <div><L>EXT Senior</L><Inp k="extSenior" placeholder="9073" /></div>
              <div><L>Test 1</L><Inp k="test1" placeholder="9920" /></div>
              <div><L>Test 2</L><Inp k="test2" placeholder="9921" /></div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0 border-t pt-4" style={{ borderColor: 'var(--border)', direction: 'rtl' }}>
          <button
            onClick={() => {
              if (!form.storeName.trim()) { alert('يرجى إدخال اسم الفرع'); return }
              onSave(form)
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
            {editing ? <><Save size={14} /> حفظ التغييرات</> : <><Plus size={14} /> إضافة فرع</>}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ── CSO / Branch info card ────────────────────────────────────────────────
function BranchInfoCard({ branch, onEdit }: { branch: Branch; onEdit: () => void }) {
  return (
    <SectionCard icon={Info} title="معلومات الفرع (CSO)">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
        <Row label="OU"         value={branch.ou}        />
        <Row label="EXT 1"      value={branch.ext1}      />
        <Row label="EXT 2"      value={branch.ext2}      />
        <Row label="EXT 3"      value={branch.ext3}      />
        <Row label="EXT Senior" value={branch.extSenior} />
        <Row label="Test 1"     value={branch.test1}     />
        <Row label="Test 2"     value={branch.test2}     />
      </div>
      <div className="flex justify-end mt-3">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
          style={{ background: `${WE}14`, color: WE }}>
          <Pencil size={12} /> تعديل بيانات الفرع
        </button>
      </div>
    </SectionCard>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BranchTechnicalPage() {
  const { region } = useRegion()
  const { branches: allBranches, addBranch, updateBranch, deleteBranch } = useBranches()
  const { profiles, assets, addProfile, updateProfile, deleteProfile, addAsset, updateAsset, deleteAsset } = useBranchTechnical()

  const branches = useMemo(
    () => allBranches.filter(b => (b.region ?? 'south') === region),
    [allBranches, region],
  )

  const [selectedId, setSelectedId] = useState<string>('')

  // Reset selection when region changes
  useEffect(() => { setSelectedId('') }, [region])

  // Modals
  const [profileModal, setProfileModal]     = useState(false)
  const [editingProfile, setEditingProfile] = useState<BranchTechnicalProfile | null>(null)
  const [assetModal, setAssetModal]         = useState(false)
  const [editingAsset, setEditingAsset]     = useState<BranchAsset | null>(null)
  const [branchModal, setBranchModal]       = useState(false)
  const [editingBranch, setEditingBranch]   = useState<Branch | null>(null)   // null = add new

  const branch  = useMemo(() => branches.find(b => b.id === selectedId), [branches, selectedId])
  const profile = useMemo(() => profiles.find(p => p.branchId === selectedId), [profiles, selectedId])

  function handleProfileSave(input: ProfileInput) {
    if (editingProfile) updateProfile(editingProfile.id, input)
    else                addProfile(input)
    setProfileModal(false); setEditingProfile(null)
  }
  function handleProfileDelete() {
    if (!editingProfile) return
    if (window.confirm('حذف البيانات التقنية لهذا الفرع؟')) {
      deleteProfile(editingProfile.id)
      setProfileModal(false); setEditingProfile(null)
    }
  }

  function handleAssetSave(input: AssetInput) {
    if (editingAsset) updateAsset(editingAsset.id, input)
    else              addAsset(input)
    setAssetModal(false); setEditingAsset(null)
  }
  function handleAssetDelete() {
    if (!editingAsset) return
    if (window.confirm('حذف هذا الجهاز؟')) {
      deleteAsset(editingAsset.id)
      setAssetModal(false); setEditingAsset(null)
    }
  }

  function handleBranchSave(input: BranchInput & { region?: 'south' | 'north' }) {
    if (editingBranch) {
      updateBranch(editingBranch.id, input)
    } else {
      addBranch({ ...input, region: region as 'south' | 'north' })
    }
    setBranchModal(false); setEditingBranch(null)
  }
  function handleBranchDelete() {
    if (!editingBranch) return
    if (window.confirm(`حذف فرع "${editingBranch.storeName}" نهائياً؟ لا يمكن التراجع.`)) {
      deleteBranch(editingBranch.id)
      setSelectedId('')
      setBranchModal(false); setEditingBranch(null)
    }
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(107,33,168,0.14)' }}>
              <Server size={16} color={WE} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-black text-primary">البنية التقنية للفروع</h1>
          </div>
          <p className="text-sm text-secondary">بيانات البنية التحتية التقنية لكل فرع — قابلة للتعديل والإضافة والحذف</p>
        </div>
        <button
          onClick={() => { setEditingBranch(null); setBranchModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          <Plus size={14} /> إضافة فرع
        </button>
      </div>

      {/* Branch selector */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Server size={15} style={{ color: WE }} />
          <span className="text-sm font-bold text-primary">اختر الفرع</span>
        </div>
        <div className="relative flex-1 w-full sm:w-auto sm:max-w-xs">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="we-input appearance-none pr-8">
            <option value="">— اختر فرعاً —</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.storeName}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute top-1/2 -translate-y-1/2 left-3 text-tertiary pointer-events-none" />
        </div>
        {selectedId && branch && (
          <span className="text-xs text-tertiary font-mono">{branch.ou}</span>
        )}
      </div>

      {/* No branch selected */}
      {!selectedId && (
        <div className="card p-16 flex flex-col items-center gap-3 text-center">
          <Server size={40} className="text-tertiary" strokeWidth={1.3} />
          <p className="text-secondary font-semibold text-sm">اختر فرعاً لعرض وتعديل بياناته التقنية</p>
          <p className="text-tertiary text-xs">يمكنك إضافة وتعديل وحذف كل بيانات البنية التحتية</p>
        </div>
      )}

      {/* Branch selected */}
      {selectedId && branch && (
        <div className="space-y-5 fade-up">
          {/* Branch header strip */}
          <div className="card p-4 flex items-center gap-4" style={{ borderRight: `4px solid ${WE}` }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
              {branch.storeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-primary">{branch.storeName}</p>
              <p className="text-xs text-tertiary">{branch.ou}{profile ? ` · Code: ${profile.code}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!profile && (
                <button
                  onClick={() => { setEditingProfile(null); setProfileModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
                  <Plus size={12} /> إضافة بيانات تقنية
                </button>
              )}
              <button
                onClick={() => { setEditingBranch(branch); setBranchModal(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: `${WE}14`, color: WE }}>
                <Pencil size={12} /> تعديل الفرع
              </button>
            </div>
          </div>

          {/* No profile warning */}
          {!profile && (
            <div className="card p-4 flex items-start gap-2" style={{ background: '#F59E0B08', border: '1px solid #F59E0B30' }}>
              <AlertTriangle size={13} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: '#F59E0B' }}>
                لا توجد بيانات تقنية لهذا الفرع. اضغط "إضافة بيانات تقنية" لإدخالها.
              </p>
            </div>
          )}

          {/* Profile view */}
          {profile && (
            <ProfileView profile={profile} onEdit={() => { setEditingProfile(profile); setProfileModal(true) }} />
          )}

          {/* Assets table */}
          <AssetsSection
            branchId={selectedId}
            branch={branch}
            assets={assets}
            onAdd={() => { setEditingAsset(null); setAssetModal(true) }}
            onEdit={a => { setEditingAsset(a); setAssetModal(true) }}
            onDelete={id => { if (window.confirm('حذف هذا الجهاز؟')) deleteAsset(id) }}
          />

          {/* CSO info */}
          <BranchInfoCard branch={branch} onEdit={() => { setEditingBranch(branch); setBranchModal(true) }} />
        </div>
      )}

      {/* Profile modal */}
      {profileModal && branch && (
        <ProfileModal
          editing={editingProfile}
          branchId={selectedId}
          branchName={branch.storeName}
          onClose={() => { setProfileModal(false); setEditingProfile(null) }}
          onSave={handleProfileSave}
          onDelete={editingProfile ? handleProfileDelete : undefined}
        />
      )}

      {/* Asset modal */}
      {assetModal && (
        <AssetModal
          editing={editingAsset}
          branchId={selectedId}
          onClose={() => { setAssetModal(false); setEditingAsset(null) }}
          onSave={handleAssetSave}
          onDelete={editingAsset ? handleAssetDelete : undefined}
        />
      )}

      {/* Branch info / EXT modal */}
      {branchModal && (
        <BranchInfoModal
          editing={editingBranch}
          region={region as 'south' | 'north'}
          onClose={() => { setBranchModal(false); setEditingBranch(null) }}
          onSave={handleBranchSave}
          onDelete={editingBranch ? handleBranchDelete : undefined}
        />
      )}
    </div>
  )
}
