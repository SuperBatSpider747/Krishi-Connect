import { Star } from 'lucide-react'

export default function RatingStars({ value, label }) {
  const full = Math.round(value)
  return (
    <div className="flex items-center gap-1" aria-label={label ? `${label}: ${value} out of 5` : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= full ? 'fill-gold text-gold' : 'text-ink/20'}
          aria-hidden="true"
        />
      ))}
      <span className="text-xs text-ink/60 ml-1">{value.toFixed(1)}</span>
    </div>
  )
}
