import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function enableMocking() {
  // MSWを有効化: DEVモードかつVITE_ENABLE_MSWがfalseでない場合
  const shouldEnableMSW =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== 'false'

  if (shouldEnableMSW) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
