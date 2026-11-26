import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import EnquiryFilters from '../components/enquiries/EnquiryFilters'
import EnquiryTable from '../components/enquiries/EnquiryTable'
import EnquiryDetail from '../components/enquiries/EnquiryDetail'
import Pagination from '../components/ui/Pagination'
import { Drawer } from '../components/ui/Overlays'
import { EmptyState, ErrorState } from '../components/ui/Feedback'
import { useAsync, useDebouncedValue } from '../hooks/useAsync'
import { enquiryService } from '../services/enquiryService'

const LIMIT = 8

export default function Enquiries() {
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState({
    search: params.get('search') || '',
    category: params.get('category') || '',
    status: params.get('status') || '',
    priority: params.get('priority') || '',
  })
  const [page, setPage] = useState(1)
  const openId = params.get('open')
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, error, loading, reload } = useAsync(
    () => enquiryService.list({ ...filters, search: debouncedSearch, page, limit: LIMIT }),
    [debouncedSearch, filters.category, filters.status, filters.priority, page],
  )

  // Any filter change returns to the first page.
  useEffect(() => setPage(1), [debouncedSearch, filters.category, filters.status, filters.priority])

  const setOpen = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('open', id)
    else next.delete('open')
    setParams(next, { replace: false })
  }

  const clear = () => setFilters({ search: '', category: '', status: '', priority: '' })
  const items = data?.items || []
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Review incoming patient messages, check what the AI suggests, and approve every reply before it is used."
        actions={<Link className="btn btn-primary btn-md" to="/assistant">New enquiry</Link>}
      />

      <div className="card card-flush">
        <div className="card-toolbar">
          <EnquiryFilters filters={filters} onChange={setFilters} onClear={clear} />
        </div>

        {error ? (
          <ErrorState error={error} onRetry={reload} title="Could not load enquiries" />
        ) : !loading && items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? 'search' : 'inbox'}
            title={hasFilters ? 'No enquiries match these filters' : 'No enquiries yet'}
            action={hasFilters ? <button type="button" className="btn btn-secondary btn-md" onClick={clear}>Clear filters</button> : <Link className="btn btn-primary btn-md" to="/assistant">Add the first enquiry</Link>}
          >
            {hasFilters ? 'Try a different search term or remove a filter.' : 'Add a fictional enquiry in the AI Assistant to see it here.'}
          </EmptyState>
        ) : (
          <EnquiryTable items={items} loading={loading} onOpen={setOpen} selectedId={openId} />
        )}

        {data && !error && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} noun="enquiries" />}
      </div>

      <Drawer open={Boolean(openId)} onClose={() => setOpen(null)} title="Enquiry details" subtitle="AI output is a draft for staff review.">
        {openId && (
          <EnquiryDetail
            key={openId}
            id={openId}
            onChanged={() => reload({ silent: true })}
            onDeleted={() => {
              setOpen(null)
              reload({ silent: true })
            }}
          />
        )}
      </Drawer>
    </>
  )
}
