// Force import of Tailwind CSS styles
import '../styles/index.css';
import { withTailwind } from './decorator';

// Global decorators for all stories
export const decorators = [withTailwind];

// Set the default theme class for Tailwind
document.documentElement.className = 'light';

// Global configuration for all stories
export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#f8fafc',
      },
      {
        name: 'dark',
        value: '#0f172a',
      },
    ],
  },
};