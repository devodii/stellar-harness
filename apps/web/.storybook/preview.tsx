import type { Preview } from '@storybook/nextjs-vite';
import { Instrument_Serif, Outfit } from 'next/font/google';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';
import '../app/globals.css';

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'] });

const instrumentSerif = Instrument_Serif({
  variable: '--font-display-instrument',
  subsets: ['latin'],
  weight: '400',
});

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'todo' },
    backgrounds: { disable: true },
    nextjs: { appDirectory: true },
  },
  globalTypes: {
    theme: {
      description: 'Light and dark token theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
      return (
        <div
          className={`${outfit.variable} ${instrumentSerif.variable} ${theme} min-h-screen bg-background p-6 font-sans text-foreground antialiased`}
        >
          <TooltipProvider>
            <Story />
          </TooltipProvider>
          <Toaster />
        </div>
      );
    },
  ],
};

export default preview;
