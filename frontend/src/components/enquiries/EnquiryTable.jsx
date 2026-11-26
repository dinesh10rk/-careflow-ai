import Icon from '../ui/Icon'
import { Skeleton } from '../ui/Feedback'
import { CategoryBadge, PriorityBadge, StatusBadge } from '../ui/Badges'
import { formatDate } from '../../utils/format'

export function TableSkeleton({ rows = 6 }) {
  return (
    <tbody aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td data-label="ID"><Skeleton width={64} /></td>
          <td data-label="Enquiry"><Skeleton width="80%" /></td>
          <td data-label="Category"><Skeleton width={110} /></td>
          <td data-label="Priority"><Skeleton width={56} height={22} radius={11} /></td>
          <td data-label="Status"><Skeleton width={76} height={22} radius={11} /></td>
          <td data-label="Received"><Skeleton width={72} /></td>
          <td />
        </tr>
      ))}
    </tbody>
  )
}

export default function EnquiryTable({ items, loading, onOpen, selectedId }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Enquiry</th>
            <th scope="col">Category</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Received</th>
            <th scope="col"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        {loading ? (
          <TableSkeleton />
        ) : (
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className={`${selectedId === e.id ? 'is-selected' : ''} ${e.priority === 'Urgent' && e.status !== 'Resolved' ? 'row-urgent' : ''}`.trim()} onClick={() => onOpen(e.id)}>
                <td data-label="ID" className="cell-ref">{e.reference}</td>
                <td data-label="Enquiry">
                  <button type="button" className="row-link" onClick={(ev) => { ev.stopPropagation(); onOpen(e.id) }}>
                    <span className="row-subject">{e.subject}</span>
                    <span className="row-patient">{e.patient_name}</span>
                  </button>
                </td>
                <td data-label="Category"><CategoryBadge category={e.category} /></td>
                <td data-label="Priority"><PriorityBadge priority={e.priority} /></td>
                <td data-label="Status"><StatusBadge status={e.status} /></td>
                <td data-label="Received" className="cell-date">{formatDate(e.created_at)}</td>
                <td className="cell-chevron" aria-hidden="true"><Icon name="chevronRight" size={16} /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}
