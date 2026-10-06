const BASE = '/api/quotes'

export class ApiError extends Error {
  constructor(status, message, details = {}) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(path = '', options = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.')
  }

  if (res.status === 204) return null

  let body = null
  try {
    body = await res.json()
  } catch {
    // non-JSON response, handled below
  }

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status}).`, body?.details)
  }
  return body
}

export const listQuotes = () => request()
export const getQuote = (id) => request(`/${id}`)
export const createQuote = (data) => request('', { method: 'POST', body: JSON.stringify(data) })
export const updateQuote = (id, data) =>
  request(`/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteQuote = (id) => request(`/${id}`, { method: 'DELETE' })
