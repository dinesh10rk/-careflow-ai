import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { label, count } = payload[0].payload
  return (
    <div className="chart-tip">
      <div>
        <strong>Week of {label}</strong>
        <span>{count} enquir{count === 1 ? 'y' : 'ies'}</span>
      </div>
    </div>
  )
}

/** Enquiries received per week (Monday start) over the last eight weeks. Single series, so no legend. */
export default function WeeklyChart({ data }) {
  const [asTable, setAsTable] = useState(false)
  const lastIndex = data.length - 1
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="weekly-chart">
      <div className="chart-switch">
        <button type="button" className="link-btn" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {asTable ? (
        <table className="mini-table">
          <caption className="sr-only">Enquiries received per week</caption>
          <thead>
            <tr><th scope="col">Week starting</th><th scope="col">Enquiries</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week_start}><th scope="row">{d.label}</th><td>{d.count}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-label={`Enquiries per week for the last ${data.length} weeks. ${data.map((d) => `Week of ${d.label}: ${d.count}`).join(', ')}.`}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--line-soft)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
              <YAxis allowDecimals={false} domain={[0, Math.max(4, max + 1)]} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(14,36,56,0.05)' }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={38} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={d.week_start} fill={i === lastIndex ? '#0e2438' : '#4a9a9d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-note"><span className="legend-swatch" style={{ background: '#0e2438' }} aria-hidden="true" /> This week so far</p>
        </div>
      )}
    </div>
  )
}
