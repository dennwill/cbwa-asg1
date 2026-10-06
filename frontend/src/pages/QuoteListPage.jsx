import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ApiError, deleteQuote, listQuotes } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate, formatMoney } from '../format'

export default function QuoteListPage() {
  const location = useLocation()
  const [quotes, setQuotes] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listQuotes()
      .then((data) => !cancelled && setQuotes(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

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

      {quotes && quotes.length === 0 && (
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
