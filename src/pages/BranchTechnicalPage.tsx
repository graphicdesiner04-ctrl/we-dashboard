import { useState, useEffect } from 'react'
import { Server, Wifi, Printer, Monitor, Cpu, ChevronDown, Info } from 'lucide-react'
import { BRANCHES, BRANCH_TECHNICAL } from '@/data/mockData'
import { storage } from '@/lib/storage'
import type { Branch, BranchTechnicalProfile } from '@/types/hr'

const WE = '#6B21A8'

// ── Small info row inside a card ──────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-theme last:border-0">
      <span className="text-xs text-tertiary flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-semibold text-primary text-left num break-all">{value || '—'}</span>
    </div>
  )
}

// ── Tag list (IPs, MACs, PCs) ─────────────────────────────────────────────
function TagList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-xs text-tertiary">—</span>
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((item, i) => (
        <span key={i}
          className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
          style={{ background: `${WE}12`, color: WE }}>
          {item}
        </span>
      ))}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon, title, children,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${WE}14` }}>
          <Icon size={14} style={{ color: WE }} />
        </div>
        <h3 className="text-xs font-black uppercase tracking-widest text-secondary">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Branch selector bar ───────────────────────────────────────────────────
function BranchSelectorBar({
  branches, selected, onChange,
}: {
  branches: Branch[]; selected: string; onChange: (id: string) => void
}) {
  return (
    <div className="card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Server size={15} style={{ color: WE }} />
        <span className="text-sm font-bold text-primary">اختر الفرع</span>
      </div>
      <div className="relative flex-1 w-full sm:w-auto sm:max-w-xs">
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          className="we-input appearance-none pr-8"
        >
          <option value="">— اختر فرعاً لعرض بياناته التقنية —</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.storeName}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute top-1/2 -translate-y-1/2 left-3 text-tertiary pointer-events-none" />
      </div>
      {selected && (
        <span className="text-xs text-tertiary">
          {branches.find(b => b.id === selected)?.ou}
        </span>
      )}
    </div>
  )
}

// ── Technical profile display ─────────────────────────────────────────────
function TechnicalView({
  branch, profile,
}: {
  branch: Branch; profile: BranchTechnicalProfile
}) {
  return (
    <div className="space-y-5 fade-up">
      {/* Branch header strip */}
      <div className="card p-4 flex items-center gap-4"
        style={{ borderRight: `4px solid ${WE}` }}>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${WE},#4C1D95)` }}>
          {branch.storeName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-primary">{branch.storeName}</p>
          <p className="text-xs text-tertiary">{branch.ou} · Code: {profile.code}</p>
        </div>
        <span className="hidden sm:block text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ background: `${WE}14`, color: WE }}>
          قراءة فقط
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Network */}
        <SectionCard icon={Wifi} title="الشبكة">
          <Row label="Gateway"     value={profile.gateway}    />
          <Row label="Subnet Mask" value={profile.subnetMask} />
          <div className="py-2 border-b border-theme last:border-0">
            <span className="text-xs text-tertiary">DNS</span>
            <TagList items={profile.dnsEntries} />
          </div>
        </SectionCard>

        {/* Devices */}
        <SectionCard icon={Printer} title="الأجهزة">
          <Row label="Printer"      value={profile.printer}     />
          <Row label="Fingerprint"  value={profile.fingerPrint} />
          {profile.extraRows.length > 0 && (
            profile.extraRows.map(r => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))
          )}
        </SectionCard>

        {/* User IPs & PCs */}
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

        {/* MAC Addresses */}
        <SectionCard icon={Cpu} title="عناوين MAC">
          <div className="py-2">
            <TagList items={profile.macAddresses} />
          </div>
        </SectionCard>

      </div>

      {/* CSO / Branch Info */}
      <SectionCard icon={Info} title="معلومات الفرع (CSO)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
          <Row label="OU"          value={branch.ou}          />
          <Row label="EXT 1"       value={branch.ext1}        />
          <Row label="EXT 2"       value={branch.ext2}        />
          <Row label="EXT 3"       value={branch.ext3}        />
          <Row label="EXT Senior"  value={branch.extSenior}   />
          <Row label="Test 1"      value={branch.test1}       />
          <Row label="Test 2"      value={branch.test2}       />
        </div>
      </SectionCard>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BranchTechnicalPage() {
  const [selectedId, setSelectedId] = useState<string>(() =>
    storage.get('bt-branch', '')
  )

  useEffect(() => { storage.set('bt-branch', selectedId) }, [selectedId])

  const branch  = BRANCHES.find(b => b.id === selectedId)
  const profile = BRANCH_TECHNICAL.find(p => p.branchId === selectedId)

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(107,33,168,0.14)' }}>
            <Server size={16} color={WE} strokeWidth={2} />
          </div>
          <h1 className="text-xl font-black text-primary">البنية التقنية للفروع</h1>
        </div>
        <p className="text-sm text-secondary">
          بيانات البنية التحتية التقنية لكل فرع · للاطلاع فقط
        </p>
      </div>

      {/* Branch selector */}
      <BranchSelectorBar branches={BRANCHES} selected={selectedId} onChange={setSelectedId} />

      {/* Content */}
      {!selectedId && (
        <div className="card p-16 flex flex-col items-center gap-3 text-center">
          <Server size={40} className="text-tertiary" strokeWidth={1.3} />
          <p className="text-secondary font-semibold text-sm">اختر فرعاً لعرض بياناته التقنية</p>
          <p className="text-tertiary text-xs">يتم عرض بيانات الشبكة والأجهزة والاتصالات لكل فرع</p>
        </div>
      )}

      {selectedId && !profile && (
        <div className="card p-16 flex flex-col items-center gap-3 text-center">
          <Server size={40} className="text-tertiary" strokeWidth={1.3} />
          <p className="text-secondary font-semibold text-sm">لا توجد بيانات تقنية لهذا الفرع</p>
          <p className="text-tertiary text-xs">لم يتم رفع ملف البنية التقنية بعد</p>
        </div>
      )}

      {selectedId && profile && branch && (
        <TechnicalView branch={branch} profile={profile} />
      )}
    </div>
  )
}
