import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e5ff',
          500: '#3b6ef6',
          600: '#2b55d4',
          700: '#2143a8'
        }
      }
    }
  },
  plugins: []
};

export default config;
