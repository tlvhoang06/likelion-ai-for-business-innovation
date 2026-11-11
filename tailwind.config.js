/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#11151B',
        panel: '#161B23',
        panelAlt: '#1C222D',
        line: '#3D495F',
        lineStrong: '#5A6C88',
        ink: '#EAE8E1',
        inkMuted: '#9CA6B4',
        inkDim: '#6B7686',
      },
    },
  },
  plugins: [],
}

