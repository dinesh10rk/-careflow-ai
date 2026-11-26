import { Link, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Enquiries from './pages/Enquiries'
import AiAssistant from './pages/AiAssistant'
import Reminders from './pages/Reminders'
import ActivityHistory from './pages/ActivityHistory'
import Settings from './pages/Settings'
import { EmptyState } from './components/ui/Feedback'

function NotFound() {
  return (
    <div className="card">
      <EmptyState icon="search" title="That page does not exist" action={<Link className="btn btn-primary btn-md" to="/">Back to dashboard</Link>}>
        Check the address, or use the menu to find what you need.
      </EmptyState>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="enquiries" element={<Enquiries />} />
        <Route path="assistant" element={<AiAssistant />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="activity" element={<ActivityHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
