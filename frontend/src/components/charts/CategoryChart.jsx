import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CATEGORY_COLORS } from '../../utils/constants'

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const { category, count } = payload[0].payload
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div className="chart-tip">
      <span className="chart-tip-dot" style={{ background: CATEGORY_COLORS[category] }} aria-hidden="true" />
      <div>
        <strong>{category}</strong>
        <span>{count} enquir{count === 1 ? 'y' : 'ies'} · {pct}%</span>
      </div>
    </div>
  )
}

/**
 * Category breakdown. Legend with counts is always visible (identity is never colour alone),
 * and a table view is available for screen readers and for anyone who prefers numbers.
 */
export default function CategoryChart({ data }) {
  const [hovered, setHovered] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="category-chart">
      <div className="chart-switch">
        <button type="button" className="link-btn" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {asTable ? (
        <table className="mini-table">
          <caption className="sr-only">Enquiries by category</caption>
          <thead>
            <tr><th scope="col">Category</th><th scope="col">Enquiries</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.category}><th scope="row">{d.category}</th><td>{d.count}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="donut-layout">
          <div className="donut" role="img" aria-label={`Enquiries by category. ${data.map((d) => `${d.category}: ${d.count}`).join(', ')}.`}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={2}
                  stroke="var(--paper)"
                  strokeWidth={2}
                  cornerRadius={4}
                  isAnimationActive={false}
                  onMouseEnter={(_, i) => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {data.map((d, i) => (
                    <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} fillOpacity={hovered === null || hovered === i ? 1 : 0.35} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip total={total} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-hidden="true">
              <strong>{total}</strong>
              <span>enquiries</span>
            </div>
          </div>

          <ul className="legend">
            {data.map((d, i) => (
              <li key={d.category} className={hovered === i ? 'is-hot' : ''} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                <span className="legend-swatch" style={{ background: CATEGORY_COLORS[d.category] }} aria-hidden="true" />
                <span className="legend-name">{d.category}</span>
                <span className="legend-count">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
