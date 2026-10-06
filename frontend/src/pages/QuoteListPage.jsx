import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listQuotes } from '../api'

// Placeholder until the real list page is built
export default function QuoteListPage() {
  const [quotes, setQuotes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listQuotes()
      .then(setQuotes)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="banner banner-error" role="alert">
        {error}
      </div>
    )
  }
  if (!quotes) return <p>Loading...</p>

  return (
    <>
      <h1>Quotes</h1>
      {quotes.length === 0 && <p>No quotes yet.</p>}
      <ul>
        {quotes.map((q) => (
          <li key={q.id}>
            <Link to={`/quotes/${q.id}`}>
              #{q.id} {q.customerName}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
