import { Search, SlidersHorizontal } from 'lucide-react'
import type { Branch } from '@/types/hr'

interface Props {
  branches: Branch[]
  filterBranch: string
  filterSearch: string
  onBranchChange: (v: string) => void
  onSearchChange: (v: string) => void
}

export default function EmployeeFilter({
  branches, filterBranch, filterSearch, onBranchChange, onSearchChange,
}: Props) {
  const hasFilter = filterBranch || filterSearch
  return (
    <div className="card p-3 mb-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <SlidersHorizontal size={14} className="text-tertiary" />
          <span className="text-xs font-bold text-secondary">تصفية</span>
        </div>

        <select
          value={filterBranch}
          onChange={e => onBranchChange(e.target.value)}
          className="we-input sm:w-44"
        >
          <option value="">جميع الفروع</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.storeName}</option>
          ))}
        </select>

        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-3 text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="بحث باسم الموظف..."
            value={filterSearch}
            onChange={e => onSearchChange(e.target.value)}
            className="we-input pr-8"
          />
        </div>

        {hasFilter && (
          <button
            onClick={() => { onBranchChange(''); onSearchChange('') }}
            className="text-xs text-tertiary hover:text-primary transition-colors flex-shrink-0"
          >
            مسح
          </button>
        )}
      </div>
    </div>
  )
}
