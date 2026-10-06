import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ApiError, deleteQuote, listQuotes } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate, formatMoney } from '../format'

const SEARCH_DELAY_MS = 300

export default function QuoteListPage() {
  const location = useLocation()
  const [quotes, setQuotes] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  // wait for a pause in typing before asking the server
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    listQuotes(query)
      .then((data) => {
        if (cancelled) return
        setQuotes(data)
        setError('')
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [query])

  const clearSearch = () => {
    setSearch('')
    setQuery('')
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await deleteQuote(toDelete.id)
      setQuotes((prev) => prev.filter((q) => q.id !== toDelete.id))
      setNotice(`Quote for ${toDelete.customerName} was deleted.`)
    } catch (err) {
      // already gone elsewhere, so just drop it from the list
      if (err instanceof ApiError && err.status === 404) {
        setQuotes((prev) => prev.filter((q) => q.id !== toDelete.id))
      } else {
        setError(err.message)
      }
    }
    setDeleting(false)
    setToDelete(null)
  }

  return (
    <>
      <div className="page-heading">
        <h1>Quotes</h1>
        <Link to="/quotes/new" className="btn btn-primary">
          New quote
        </Link>
      </div>

      <div className="search-bar">
        <label htmlFor="quote-search" className="visually-hidden">
          Search quotes
        </label>
        <input
          id="quote-search"
          type="search"
          value={search}
          maxLength={100}
          placeholder="Search by customer name or notes"
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="btn" onClick={clearSearch}>
            Clear
          </button>
        )}
      </div>

      {notice && (
        <div className="banner banner-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      {!quotes && !error && <p>Loading quotes...</p>}

      {quotes && query && (
        <p className="muted search-summary" role="status">
          {quotes.length === 0
            ? `No quotes match “${query}”.`
            : `${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'} matching “${query}”`}
        </p>
      )}

      {quotes && quotes.length === 0 && !query && (
        <div className="empty-state">
          <p>No quotes yet.</p>
          <Link to="/quotes/new">Create your first quote</Link>
        </div>
      )}

      {quotes && quotes.length > 0 && (
        <div className="table-wrap">
          <table className="quote-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Cover</th>
                <th>Hospital / Extras</th>
                <th>Payment</th>
                <th className="num">Total</th>
                <th>Created</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>
                    <Link to={`/quotes/${q.id}`}>{q.customerName}</Link>
                  </td>
                  <td>{q.coverType}</td>
                  <td>
                    {q.hospitalCover} / {q.extrasCover}
                  </td>
                  <td>{q.paymentFrequency}</td>
                  <td className="num">
                    {formatMoney(q.summary.finalTotal)}
                    <span className="per"> / {q.summary.finalTotalPeriod}</span>
                  </td>
                  <td>{formatDate(q.createdAt)}</td>
                  <td className="row-actions">
                    <Link to={`/quotes/${q.id}`}>View</Link>
                    <Link to={`/quotes/${q.id}/edit`}>Edit</Link>
                    <button type="button" className="link-button danger" onClick={() => setToDelete(q)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this quote?"
        confirmLabel="Delete quote"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          The quote for <strong>{toDelete?.customerName}</strong> will be permanently deleted. This cannot be
          undone.
        </p>
      </ConfirmDialog>
    </>
  )
}
