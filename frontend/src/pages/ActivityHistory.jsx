import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import ActivityItem from '../components/activity/ActivityItem'
import Pagination from '../components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { activityService } from '../services/activityService'
import { ACTION_LABELS } from '../utils/constants'

const LIMIT = 12

export default function ActivityHistory() {
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useAsync(() => activityService.list({ action_type: type, page, limit: LIMIT }), [type, page])

  useEffect(() => setPage(1), [type])

  return (
    <>
      <PageHeader
        title="Activity history"
        description="A record of what staff and AI did, newest first. Message text and patient details are never stored in this log."
      />

      <div className="card card-flush">
        <div className="card-toolbar">
          <label className="inline-field">
            <span>Show</span>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by action">
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={reload} title="Could not load activity" />
        ) : loading ? (
          <ul className="activity-list activity-list-flush" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="activity-item"><Skeleton width={32} height={32} radius={16} /><div className="activity-main"><Skeleton width="55%" /><Skeleton width="25%" height={11} /></div></li>
            ))}
          </ul>
        ) : data.items.length === 0 ? (
          <EmptyState icon="clock" title="No activity to show">
            {type ? 'Nothing matches this action yet. Choose All actions to see everything.' : 'Actions appear here as soon as someone works on an enquiry.'}
          </EmptyState>
        ) : (
          <ul className="activity-list activity-list-flush">
            {data.items.map((a) => <ActivityItem key={a.id} item={a} detailed />)}
          </ul>
        )}

        {data && !error && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} noun="entries" />}
      </div>
    </>
  )
}
