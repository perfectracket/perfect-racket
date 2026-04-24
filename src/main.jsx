import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PerfectRacket from './PerfectRacket.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PerfectRacket />
  </StrictMode>
)
