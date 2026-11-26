import Icon from '../ui/Icon'
import Button from '../ui/Button'
import { CATEGORIES, PRIORITIES, STATUSES, UNCLASSIFIED } from '../../utils/constants'

export default function EnquiryFilters({ filters, onChange, onClear }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value })
  const active = Boolean(filters.search || filters.category || filters.status || filters.priority)

  return (
    <div className="filters" role="search">
      <label className="search-box">
        <Icon name="search" size={17} />
        <input
          type="search"
          className="input"
          placeholder="Search by name, subject, message or ID"
          value={filters.search}
          onChange={set('search')}
          aria-label="Search enquiries"
        />
      </label>
      <select className="select" value={filters.category} onChange={set('category')} aria-label="Filter by category">
        <option value="">All categories</option>
        {[...CATEGORIES, UNCLASSIFIED].map((c) => <option key={c}>{c}</option>)}
      </select>
      <select className="select" value={filters.status} onChange={set('status')} aria-label="Filter by status">
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <select className="select" value={filters.priority} onChange={set('priority')} aria-label="Filter by priority">
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
      </select>
      {active && <Button variant="ghost" icon="x" onClick={onClear}>Clear</Button>}
    </div>
  )
}
