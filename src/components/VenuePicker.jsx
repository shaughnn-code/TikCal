import { useEffect, useState } from 'react'
import { Sel, Inp } from './ui.jsx'
import { NYC_VENUES } from '../lib/constants.js'

// Venue dropdown that reveals a free-text box when "Other" is picked, so users
// can write in a venue that isn't listed. `value` holds the actual venue
// string (a known venue, or whatever they typed).
export function VenuePicker({ label, value, onChange, placeholder = 'Type in your venue' }) {
  const inList = value !== '' && value !== 'Other' && NYC_VENUES.includes(value)
  const [other, setOther] = useState(value !== '' && !inList)

  // Keep "Other" mode in sync when value is set externally (e.g. Smart Add).
  useEffect(() => {
    if (value !== '' && !inList) setOther(true)
    else if (inList) setOther(false)
  }, [value, inList])

  const onSelect = (v) => {
    if (v === 'Other') {
      setOther(true)
      onChange('') // clear, await the write-in
    } else {
      setOther(false)
      onChange(v)
    }
  }

  const selectValue = other ? 'Other' : inList ? value : ''

  return (
    <div>
      <Sel label={label} value={selectValue} onChange={onSelect} options={NYC_VENUES} />
      {other && <Inp value={value} onChange={onChange} placeholder={placeholder} cls="mt-2" />}
    </div>
  )
}
