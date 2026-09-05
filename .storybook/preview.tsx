import type { Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/index.css'
import { AuthorAuthProvider } from '../src/components/providers/author-auth-provider'

const preview: Preview = {
  decorators: [(Story) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthorAuthProvider><Story /></AuthorAuthProvider></QueryClientProvider>],
  parameters: {
    backgrounds: { default: 'skillsbay', values: [{ name: 'skillsbay', value: '#f8fafc' }] },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
