export default function Field({
  name,
  label,
  type = 'text',
  options,
  value,
  error,
  hint,
  onChange,
  onBlur,
  disabled,
  required,
  ...inputProps
}) {
  const id = `field-${name}`
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')

  const shared = {
    id,
    name,
    value,
    disabled,
    onBlur: () => onBlur?.(name),
    onChange: (e) => onChange(name, e.target.value),
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
    ...inputProps,
  }

  let control
  if (type === 'select') {
    control = (
      <select {...shared}>
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  } else if (type === 'textarea') {
    control = <textarea rows={3} {...shared} />
  } else {
    control = <input type={type} {...shared} />
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {control}
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
