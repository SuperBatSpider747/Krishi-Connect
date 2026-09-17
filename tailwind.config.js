/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#14274E',
          dark: '#0D1B38',
          light: '#24406E',
        },
        gold: {
          DEFAULT: '#C98A2C',
          light: '#E3A94E',
        },
        field: {
          DEFAULT: '#2F5233',
          light: '#3E6B44',
        },
        paper: '#F6F7F5',
        ink: '#1C1F22',
        danger: '#B3261E',
        success: '#1E7B4D',
        warn: '#B7791B',
      },
      fontFamily: {
        serif: ['"Noto Serif"', 'Georgia', 'serif'],
        sans: ['"Noto Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
