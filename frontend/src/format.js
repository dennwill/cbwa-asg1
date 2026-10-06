const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' })

export const formatMoney = (amount) => money.format(amount)
export const formatDate = (iso) => dateFormat.format(new Date(iso))
