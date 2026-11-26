import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import Icon from '../components/ui/Icon'
import Button from '../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback'
import CategoryChart from '../components/charts/CategoryChart'
import WeeklyChart from '../components/charts/WeeklyChart'
import ActivityItem from '../components/activity/ActivityItem'
import { useAsync } from '../hooks/useAsync'
import { enquiryService } from '../services/enquiryService'
import { activityService, statsService } from '../services/activityService'
import { getClinicSettings } from '../config'
import { greeting, relativeTime } from '../utils/format'

function StatCard({ label, value, note, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" aria-hidden="true"><Icon name={icon} size={16} /></span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-note">{note}</span>
    </div>
  )
}

function ReviewQueue({ count, items, onOpen }) {
  if (count === 0) {
    return (
      <section className="queue queue-clear" aria-label="Enquiries waiting for a person">
        <span className="queue-clear-icon"><Icon name="check" size={22} /></span>
        <div>
          <h2 className="queue-title">Nothing is waiting for a person</h2>
          <p className="queue-sub">No enquiry is currently flagged as urgent or needing human review.</p>
        </div>
      </section>
    )
  }
  return (
    <section className="queue" aria-label="Enquiries waiting for a person">
      <div className="queue-head">
        <strong className="queue-count">{count}</strong>
        <div>
          <h2 className="queue-title">{count === 1 ? 'enquiry is' : 'enquiries are'} waiting for a person</h2>
          <p className="queue-sub">Flagged for possible urgent wording. CareFlow AI does not assess medical urgency; staff decide what happens next.</p>
        </div>
      </div>
      <ul className="queue-list">
        {items.map((e) => (
          <li key={e.id}>
            <div className="queue-item-text">
              <span className="queue-ref">{e.reference}</span>
              <span className="queue-subject">{e.subject}</span>
              <span className="queue-when">{e.patient_name} · {relativeTime(e.created_at)}</span>
            </div>
            <button type="button" className="queue-open" onClick={() => onOpen(e.id)}>
              Review now
              <Icon name="arrowRight" size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

const QUICK_ACTIONS = [
  { to: '/assistant', icon: 'sparkles', title: 'Add an enquiry', text: 'Paste a fictional message and analyse it' },
  { to: '/enquiries?priority=Urgent', icon: 'alert', title: 'Review urgent enquiries', text: 'Everything flagged for a person' },
  { to: '/reminders', icon: 'bell', title: 'Draft a reminder', text: 'Appointment reminder by email or SMS' },
  { to: '/enquiries', icon: 'inbox', title: 'Open all enquiries', text: 'Search, filter and update status' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { clinicName } = getClinicSettings()
  const { data, error, loading, reload } = useAsync(async () => {
    const [stats, activity, urgent] = await Promise.all([
      statsService.get(),
      activityService.list({ limit: 6 }),
      enquiryService.list({ priority: 'Urgent', limit: 20 }),
    ])
    return { stats, activity: activity.items, urgent: urgent.items.filter((e) => e.status !== 'Resolved') }
  }, [])

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader
        title={greeting()}
        description={`${today}. Here is what needs attention at ${clinicName}.`}
        actions={<Button variant="primary" icon="plus" onClick={() => navigate('/assistant')}>New enquiry</Button>}
      />

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={reload} title="Could not load the dashboard" /></div>
      ) : loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="hero-grid">
            <ReviewQueue count={data.stats.urgent_awaiting_review} items={data.urgent.slice(0, 3)} onOpen={(id) => navigate(`/enquiries?open=${id}`)} />
            <div className="stat-grid">
              <StatCard label="Total enquiries" value={data.stats.total} note="All time" icon="inbox" />
              <StatCard label="Pending" value={data.stats.pending} note="Not yet resolved" icon="clock" />
              <StatCard label="Processed" value={data.stats.processed} note="Resolved by staff" icon="check" />
              <StatCard label="AI analysed" value={data.stats.ai_processed} note="Classified and summarised" icon="sparkles" />
            </div>
          </div>

          <div className="chart-grid">
            <section className="card" aria-labelledby="weekly-title">
              <header className="card-head">
                <div>
                  <h2 id="weekly-title" className="card-title">Enquiries per week</h2>
                  <p className="card-sub">Last eight weeks</p>
                </div>
              </header>
              <WeeklyChart data={data.stats.weekly} />
            </section>
            <section className="card" aria-labelledby="cat-title">
              <header className="card-head">
                <div>
                  <h2 id="cat-title" className="card-title">By category</h2>
                  <p className="card-sub">Where enquiries are coming from</p>
                </div>
              </header>
              {data.stats.category_breakdown.length ? (
                <CategoryChart data={data.stats.category_breakdown} />
              ) : (
                <EmptyState icon="inbox" title="No data yet">Categories appear once enquiries exist.</EmptyState>
              )}
            </section>
          </div>

          <div className="lower-grid">
            <section className="card" aria-labelledby="act-title">
              <header className="card-head">
                <div>
                  <h2 id="act-title" className="card-title">Recent activity</h2>
                  <p className="card-sub">Latest actions by staff and AI</p>
                </div>
                <Link className="link" to="/activity">View all</Link>
              </header>
              {data.activity.length ? (
                <ul className="activity-list">{data.activity.map((a) => <ActivityItem key={a.id} item={a} />)}</ul>
              ) : (
                <EmptyState icon="clock" title="No activity yet">Actions show up here as soon as someone works on an enquiry.</EmptyState>
              )}
            </section>

            <section className="card" aria-labelledby="qa-title">
              <header className="card-head">
                <div>
                  <h2 id="qa-title" className="card-title">Quick actions</h2>
                </div>
              </header>
              <ul className="quick-list">
                {QUICK_ACTIONS.map((a) => (
                  <li key={a.to}>
                    <Link to={a.to} className="quick-link">
                      <span className="quick-icon" aria-hidden="true"><Icon name={a.icon} size={18} /></span>
                      <span>
                        <strong>{a.title}</strong>
                        <small>{a.text}</small>
                      </span>
                      <Icon name="chevronRight" size={16} className="quick-chevron" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="hero-grid">
        <Skeleton height={230} radius={18} />
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={108} radius={14} />)}
        </div>
      </div>
      <div className="chart-grid">
        <Skeleton height={320} radius={16} />
        <Skeleton height={320} radius={16} />
      </div>
    </div>
  )
}
