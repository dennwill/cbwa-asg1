import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Esc fires "cancel"; let React state close the dialog instead of the browser
  const handleEscape = (e) => {
    e.preventDefault()
    if (!busy) onCancel()
  }

  return (
    <dialog ref={ref} className="confirm-dialog" onCancel={handleEscape}>
      <h2>{title}</h2>
      <div>{children}</div>
      <div className="form-actions">
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting...' : confirmLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </dialog>
  )
}
