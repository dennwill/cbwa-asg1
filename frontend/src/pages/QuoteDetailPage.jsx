import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, deleteQuote, getQuote } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatDate, formatMoney } from '../format'

function Row({ label, detail, value, strong }) {
  return (
    <tr className={strong ? 'total-row' : undefined}>
      <th scope="row">
        {label}
        {detail && <span className="row-detail">{detail}</span>}
      </th>
      <td className="num">{value}</td>
    </tr>
  )
}

export default function QuoteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    getQuote(id)
      .then((data) => !cancelled && setQuote(data))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteQuote(id)
      navigate('/', { state: { notice: `Quote for ${quote.customerName} was deleted.` } })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/')
        return
      }
      setDeleteError(err.message)
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (error) {
    return (
      <>
        <div className="banner banner-error" role="alert">
          {error}
        </div>
        <Link to="/">Back to quotes</Link>
      </>
    )
  }
  if (!quote) return <p>Loading quote...</p>

  const c = quote.calculation
  const yearly = quote.paymentFrequency === 'Yearly'
  const hasSecond = quote.coverType !== 'Single'
  const hospitalNone = quote.hospitalCover === 'None'

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{quote.customerName}</h1>
          <p className="muted">
            Quote #{quote.id} &middot; created {formatDate(quote.createdAt)}
          </p>
        </div>
        <div className="heading-actions">
          <Link to={`/quotes/${quote.id}/edit`} className="btn">
            Edit
          </Link>
          <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
            Delete
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="banner banner-error" role="alert">
          {deleteError}
        </div>
      )}

      {c.warnings.length > 0 && (
        <section className="banner banner-warning" aria-label="Warnings">
          <strong>{c.warnings.length === 1 ? 'Warning' : 'Warnings'}</strong>
          <ul>
            {c.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card total-card" aria-label="Estimated total">
        <p className="total-label">
          {yearly ? 'Estimated yearly total (after discount)' : 'Estimated monthly premium'}
        </p>
        <p className="total-amount">
          {formatMoney(c.finalTotal)}
          <span className="per"> / {c.finalTotalPeriod}</span>
        </p>
      </section>

      <section className="card">
        <h2>Premium breakdown</h2>
        <table className="breakdown">
          <tbody>
            <Row
              label="Hospital premium"
              detail={hospitalNone ? 'No hospital cover' : `${quote.hospitalCover}, per month`}
              value={formatMoney(c.hospitalPremium)}
            />
            {c.applicants.map((a) => (
              <tr key={a.applicant} className="sub-row">
                <th scope="row">
                  Applicant {a.applicant} (age {a.age})
                  <span className="row-detail">
                    LHC loading {a.loadingPercent}%
                    {a.coverHistory === 'Not sure' && ' (cover history unknown)'}
                  </span>
                </th>
                <td className="num">{formatMoney(a.hospitalPremium)}</td>
              </tr>
            ))}
            <Row
              label="Extras premium"
              detail={quote.extrasCover === 'None' ? 'No extras cover' : `${quote.extrasCover}, per month`}
              value={formatMoney(c.extrasPremium)}
            />
            {quote.coverType === 'Family' && (
              <Row label="Family upgrade fee" detail="per month" value={formatMoney(c.familyFee)} />
            )}
            <Row label="Monthly premium" value={formatMoney(c.monthlyPremium)} strong />
            <Row label="Yearly premium before discount" value={formatMoney(c.yearlyBeforeDiscount)} />
            {yearly && (
              <>
                <Row label="Annual-payment discount" value={`${c.discountPercent}%`} />
                <Row label="Yearly premium after discount" value={formatMoney(c.yearlyAfterDiscount)} strong />
              </>
            )}
          </tbody>
        </table>
      </section>

      <section className="card note-card" aria-label="Lifetime Health Cover">
        <p>{c.lhcStatement}</p>
      </section>

      <section className="card">
        <h2>How this was calculated</h2>
        <ol className="explanation">
          {c.explanation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>Quote details</h2>
        <dl className="details">
          <dt>Cover type</dt>
          <dd>{quote.coverType}</dd>
          <dt>Hospital cover</dt>
          <dd>{quote.hospitalCover}</dd>
          <dt>Extras cover</dt>
          <dd>{quote.extrasCover}</dd>
          <dt>Applicant 1</dt>
          <dd>
            Age {quote.applicant1Age}, previous cover: {quote.applicant1CoverHistory}
          </dd>
          {hasSecond && (
            <>
              <dt>Applicant 2</dt>
              <dd>
                Age {quote.applicant2Age}, previous cover: {quote.applicant2CoverHistory}
              </dd>
            </>
          )}
          <dt>Payment</dt>
          <dd>
            {quote.paymentFrequency}
            {yearly && ` (${quote.annualDiscount}% discount)`}
          </dd>
          {quote.notes && (
            <>
              <dt>Notes</dt>
              <dd className="notes">{quote.notes}</dd>
            </>
          )}
        </dl>
      </section>

      <p>
        <Link to="/">&larr; Back to all quotes</Link>
      </p>

      <ConfirmDialog
        open={confirming}
        title="Delete this quote?"
        confirmLabel="Delete quote"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      >
        <p>
          The quote for <strong>{quote.customerName}</strong> will be permanently deleted. This cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  )
}
