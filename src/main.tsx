import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { missingFirebaseEnv } from './lib/env'
import { ConfigErrorPage } from './pages/ConfigErrorPage'

const root = createRoot(document.getElementById('root')!)
const missing = missingFirebaseEnv()

if (missing.length > 0) {
  root.render(<ConfigErrorPage missing={missing} />)
} else {
  // Loaded lazily so Firebase is never initialised with an incomplete config.
  void import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
