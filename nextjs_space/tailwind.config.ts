import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Facebook color palette
        'fb': {
          'blue': '#1877f2',
          'blue-hover': '#166fe5',
          'blue-dark': '#1565c0',
          'blue-light': '#e7f3ff',
          'text': '#1c1e21',
          'text-secondary': '#65676b',
          'bg': '#f0f2f5',
          'card': '#ffffff',
          'border': '#dadde1',
          'green': '#42b72a',
          'red': '#fa3e3e',
          'gray-100': '#f5f6f7',
          'gray-200': '#e4e6eb',
          'gray-300': '#dadde1',
          'gray-400': '#bec3c9',
          'gray-500': '#8a8d91',
        },
        // Keep some legacy colors for compatibility
        'deep-purple': {
          50: '#e7f3ff',
          100: '#e7f3ff',
          200: '#e7f3ff',
          300: '#1877f2',
          400: '#1877f2',
          500: '#1877f2',
          600: '#166fe5',
          700: '#1565c0',
          800: '#1565c0',
          900: '#1565c0',
          950: '#f0f2f5',
          975: '#f0f2f5',
        },
        'gold': {
          50: '#e7f3ff',
          100: '#e7f3ff',
          200: '#e7f3ff',
          300: '#1877f2',
          400: '#1877f2',
          500: '#1877f2',
          600: '#1877f2',
          700: '#166fe5',
          800: '#1565c0',
          900: '#1565c0',
          950: '#1877f2',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'serif': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'fb-gradient': 'linear-gradient(135deg, #f0f2f5 0%, #ffffff 50%, #f0f2f5 100%)',
        'fb-blue-gradient': 'linear-gradient(135deg, #1877f2 0%, #166fe5 100%)',
      },
      boxShadow: {
        'fb': '0 1px 2px rgba(0, 0, 0, 0.1)',
        'fb-md': '0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1)',
        'fb-lg': '0 12px 28px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-in',
        'slideUp': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
