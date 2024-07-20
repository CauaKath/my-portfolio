/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          default: '#0F172A',
        },
        text: '#F4F4F5',
        gray_text: '#64748B',
        background: '#E2E8F0',
        border: '#334155',
        light_border: '#CBD5E1',
        register: {
          from: '#0369A1',
          to: '#0EA5E9'
        }
      }
    },
    fontFamily: {
      'roboto': ['Roboto', 'sans-serif'],
    }
  },
  plugins: [],
}

