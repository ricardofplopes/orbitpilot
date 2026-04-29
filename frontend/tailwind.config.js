/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orbit: {
          blue: '#2563EB',
          purple: '#7C3AED',
          green: '#10B981',
          amber: '#F59E0B',
          navy: '#0F172A',
          'navy-light': '#1E293B',
          'navy-lighter': '#334155',
          slate: '#64748B',
          light: '#F1F5F9',
          card: '#1E293B',
          'card-hover': '#263548',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #2563EB, #7C3AED)',
        'gradient-brand-hover': 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(37, 99, 235, 0.3)',
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
      },
    },
  },
  plugins: [],
};
