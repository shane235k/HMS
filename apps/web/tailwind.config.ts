import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          white: '#FFFFFF',
          neutral: '#F7F7F7',
        },
        plum: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#D4D4D4',
          300: '#A3A3A3',
          400: '#525252',
          500: '#000000', // Pure Black
          600: '#000000',
          700: '#000000',
          800: '#000000',
          900: '#000000',
        },
        magenta: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#D4D4D4',
          300: '#A3A3A3',
          400: '#525252',
          500: '#000000', // Pure Black
          600: '#000000',
          700: '#000000',
        },
        charcoal: {
          900: '#29252A', // Primary Text
          700: '#4A434C',
          600: '#6E6670', // Muted Text
          400: '#9E97A0', // Placeholder
          300: '#C5BFC7',
          200: '#EAE5E8', // Borders & Dividers
          100: '#F5F3F4',
        },
        status: {
          ready: '#1B7A4D',
          'ready-bg': '#EBF7F0',
          'ready-border': '#B4E5CA',
          occupied: '#2B5EA7',
          'occupied-bg': '#EFF5FC',
          'occupied-border': '#B8D3F2',
          dirty: '#C05621',
          'dirty-bg': '#FEF5EE',
          'dirty-border': '#FBD38D',
          cleaning: '#4C51BF',
          'cleaning-bg': '#EBF4FF',
          'cleaning-border': '#C3DAFE',
          inspection: '#713B59',
          'inspection-bg': '#F8EDF3',
          'inspection-border': '#E5C4D7',
          maintenance: '#C53030',
          'maintenance-bg': '#FFF5F5',
          'maintenance-border': '#FEB2B2',
        },
      },
      fontFamily: {
        sans: ['Calibri', 'Candara', 'Segoe', 'sans-serif'],
        serif: ['Calibri', 'Georgia', 'serif'],
        mono: ['Calibri', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(41, 37, 42, 0.04), 0 1px 2px -1px rgba(41, 37, 42, 0.03)',
        floating: '0 12px 32px -4px rgba(84, 38, 63, 0.10), 0 4px 12px -2px rgba(41, 37, 42, 0.05)',
        dropdown: '0 8px 24px -2px rgba(41, 37, 42, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;

