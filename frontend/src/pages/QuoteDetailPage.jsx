import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getQuote } from '../api'

// Placeholder until the real explanation sheet is built
export default function QuoteDetailPage() {
  const { id } = useParams()
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getQuote(id)
      .then(setQuote)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <div className="banner banner-error" role="alert">
        {error}
      </div>
    )
  }
  if (!quote) return <p>Loading...</p>

  return (
    <>
      <h1>Quote #{quote.id}</h1>
      <p>
        <Link to={`/quotes/${quote.id}/edit`}>Edit</Link>
      </p>
      <pre>{JSON.stringify(quote, null, 2)}</pre>
    </>
  )
}
