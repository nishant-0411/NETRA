/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5EFEB',        // Warm Sand Beige canvas
        surface: '#FFFFFF',       // Clean white surface
        brand: {
          dark: '#261B16',        // Deep roasted espresso brown
          darker: '#1A120E',      // Deepest dark mocha
          surface: '#382822',     // Rich dark mocha surface
          accent: '#8C532B',      // Warm saddle brown / cognac leather
          accentHover: '#703F1E', // Deep saddle brown hover
          beige: '#EDE4D8',       // Light warm beige card/tab fill
          beigeDark: '#D8CAB8',   // Medium warm beige
          border: '#DDD4C7',      // Warm beige stone border
          text: '#2B211C',        // Deep espresso charcoal text
          muted: '#7A6D63',       // Warm stone umber muted text
          success: '#4A6B53',     // Earthy sage green
          warning: '#C27D26',     // Warm amber ochre
          danger: '#A83A32',      // Warm terracotta / rust red
        }
      }
    },
  },
  plugins: [],
}
