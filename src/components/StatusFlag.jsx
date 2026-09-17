const STYLES = {
  open: 'bg-success/10 text-success border-success/30',
  filling: 'bg-warn/10 text-warn border-warn/30',
  full: 'bg-danger/10 text-danger border-danger/30',
}

const DOT = {
  open: 'bg-success',
  filling: 'bg-warn',
  full: 'bg-danger',
}

export default function StatusFlag({ flag, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border ${STYLES[flag] || STYLES.open}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[flag] || DOT.open}`} aria-hidden="true" />
      {label}
    </span>
  )
}
