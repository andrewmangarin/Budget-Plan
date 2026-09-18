import React from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, title, subtitle, onClose, children }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}
