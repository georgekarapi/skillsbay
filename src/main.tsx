import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthorAuthProvider } from './components/providers/author-auth-provider.tsx'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}><AuthorAuthProvider><App /></AuthorAuthProvider></QueryClientProvider>,
)
