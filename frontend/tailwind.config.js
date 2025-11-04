/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokyo Night color palette
        'tokyo': {
          bg: '#1a1b26',
          bgDark: '#16161e',
          bgHighlight: '#292e42',
          terminal: '#414868',
          fg: '#c0caf5',
          fgDark: '#a9b1d6',
          comment: '#565f89',
          cyan: '#7dcfff',
          blue: '#7aa2f7',
          purple: '#bb9af7',
          magenta: '#c678dd',
          red: '#f7768e',
          orange: '#ff9e64',
          yellow: '#e0af68',
          green: '#9ece6a',
          teal: '#73daca',
        }
      },
    },
  },
  plugins: [],
}
