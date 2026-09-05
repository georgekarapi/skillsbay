import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthorAuthProvider } from './components/providers/author-auth-provider.tsx'
import { ThemeProvider } from './components/providers/theme-provider.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="dark" storageKey="skillsbay-ui-theme">
    <QueryClientProvider client={queryClient}>
      <AuthorAuthProvider>
        <App />
      </AuthorAuthProvider>
    </QueryClientProvider>
  </ThemeProvider>,
)

