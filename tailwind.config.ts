import type { Config } from 'tailwindcss';

export default <Partial<Config>>{
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0984e3',
          50: '#f1f8fe',
          100: '#e1f0fc',
          200: '#bde0f9',
          300: '#86c6f6',
          400: '#48a6f0',
          500: '#0984e3', // Base color
          600: '#026aa7',
          700: '#035486',
          800: '#07476f',
          900: '#0a3b5b',
          950: '#06263d',
        },
        'background-light': '#f8fafc', // Slate 50
        'background-dark': '#020617', // Slate 950
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'], // Override default sans to Manrope as well for consistency
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
    },
  },
};
