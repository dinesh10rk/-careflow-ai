import Icon from './Icon'

export default function Pagination({ page, limit, total, onPage, noun = 'results' }) {
  if (!total) return null
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        Showing {from}–{to} of {total} {noun}
      </span>
      <div className="pagination-buttons">
        <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevronLeft" size={15} /> Previous
        </button>
        <span className="pagination-page">
          Page {page} of {pages}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <Icon name="chevronRight" size={15} />
        </button>
      </div>
    </nav>
  )
}
