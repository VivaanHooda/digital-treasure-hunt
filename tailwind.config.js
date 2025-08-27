/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'slideInUp': 'slideInUp 0.6s ease-out',
        'slideInDown': 'slideInDown 0.6s ease-out',
        'slideInLeft': 'slideInLeft 0.6s ease-out',
        'slideInRight': 'slideInRight 0.6s ease-out',
        'fadeIn': 'fadeIn 0.6s ease-out',
        'scaleIn': 'scaleIn 0.4s ease-out',
        'rotateIn': 'rotateIn 0.6s ease-out',
        'bounceIn': 'bounceIn 0.6s ease-out',
        'typewriter': 'typewriter 3s steps(30) infinite',
        'gradient': 'gradient 6s ease infinite',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite alternate',
        'matrix': 'matrix 20s linear infinite',
        'particle': 'particle 10s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { 
            transform: 'translateY(0px) rotate(0deg)',
            opacity: '0.7'
          },
          '50%': { 
            transform: 'translateY(-20px) rotate(180deg)',
            opacity: '1'
          },
        },
        glow: {
          '0%': { 
            boxShadow: '0 0 5px theme(colors.cyan.400), 0 0 10px theme(colors.cyan.400), 0 0 15px theme(colors.cyan.400)',
          },
          '100%': { 
            boxShadow: '0 0 10px theme(colors.cyan.400), 0 0 20px theme(colors.cyan.400), 0 0 30px theme(colors.cyan.400)',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInLeft: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        rotateIn: {
          '0%': {
            opacity: '0',
            transform: 'rotate(-200deg)',
          },
          '100%': {
            opacity: '1',
            transform: 'rotate(0)',
          },
        },
        bounceIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.3)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.05)',
          },
          '70%': {
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        typewriter: {
          '0%': { width: '0' },
          '50%': { width: '100%' },
          '100%': { width: '0' },
        },
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'neon-pulse': {
          '0%': {
            textShadow: '0 0 5px theme(colors.cyan.400), 0 0 10px theme(colors.cyan.400), 0 0 15px theme(colors.cyan.400), 0 0 20px theme(colors.cyan.400)',
          },
          '100%': {
            textShadow: '0 0 2px theme(colors.cyan.400), 0 0 5px theme(colors.cyan.400), 0 0 8px theme(colors.cyan.400), 0 0 12px theme(colors.cyan.400)',
          },
        },
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        particle: {
          '0%': {
            transform: 'translateY(100vh) rotate(0deg)',
            opacity: '0',
          },
          '10%': {
            opacity: '1',
          },
          '90%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(-100vh) rotate(360deg)',
            opacity: '0',
          },
        },
      },
      colors: {
        // Custom neon colors
        neon: {
          cyan: '#00ffff',
          purple: '#bf00ff',
          pink: '#ff0080',
          green: '#39ff14',
          yellow: '#ffff00',
          orange: '#ff8000',
        },
        // Custom glass colors
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          black: 'rgba(0, 0, 0, 0.1)',
          gray: 'rgba(107, 114, 128, 0.1)',
          blue: 'rgba(59, 130, 246, 0.1)',
          cyan: 'rgba(6, 182, 212, 0.1)',
          purple: 'rgba(147, 51, 234, 0.1)',
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      boxShadow: {
        'neon-cyan': '0 0 5px theme(colors.cyan.400), 0 0 20px theme(colors.cyan.400), 0 0 40px theme(colors.cyan.400)',
        'neon-purple': '0 0 5px theme(colors.purple.400), 0 0 20px theme(colors.purple.400), 0 0 40px theme(colors.purple.400)',
        'neon-pink': '0 0 5px theme(colors.pink.400), 0 0 20px theme(colors.pink.400), 0 0 40px theme(colors.pink.400)',
        'neon-blue': '0 0 5px theme(colors.blue.400), 0 0 20px theme(colors.blue.400), 0 0 40px theme(colors.blue.400)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-cyber': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-neon': 'linear-gradient(45deg, #ff006e, #8338ec, #3a86ff)',
        'gradient-matrix': 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
      },
      fontFamily: {
        'cyber': ['Orbitron', 'monospace'],
        'matrix': ['Courier New', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderWidth: {
        '3': '3px',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      blur: {
        '4xl': '72px',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'cyber': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        '400': '400ms',
        '2000': '2000ms',
      },
    },
  },
  plugins: [
    // Custom plugin for glassmorphism
    function({ addUtilities }) {
      const glassUtilities = {
        '.glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glass-dark': {
          background: 'rgba(0, 0, 0, 0.1)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-cyan': {
          background: 'rgba(6, 182, 212, 0.1)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
        },
        '.glass-purple': {
          background: 'rgba(147, 51, 234, 0.1)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(147, 51, 234, 0.2)',
        },
      }
      
      const neonUtilities = {
        '.text-neon-cyan': {
          color: '#00ffff',
          'text-shadow': '0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff',
        },
        '.text-neon-purple': {
          color: '#bf00ff',
          'text-shadow': '0 0 5px #bf00ff, 0 0 10px #bf00ff, 0 0 15px #bf00ff',
        },
        '.text-neon-pink': {
          color: '#ff0080',
          'text-shadow': '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 15px #ff0080',
        },
        '.border-neon-cyan': {
          'border-color': '#00ffff',
          'box-shadow': '0 0 5px #00ffff',
        },
        '.border-neon-purple': {
          'border-color': '#bf00ff',
          'box-shadow': '0 0 5px #bf00ff',
        },
      }

      const cyberUtilities = {
        '.cyber-grid': {
          'background-image': `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          'background-size': '50px 50px',
        },
        '.cyber-border': {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0',
            padding: '2px',
            background: 'linear-gradient(45deg, #00ffff, #bf00ff)',
            'border-radius': 'inherit',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            'mask-composite': 'xor',
            '-webkit-mask-composite': 'xor',
          },
        },
      }

      addUtilities({
        ...glassUtilities,
        ...neonUtilities,
        ...cyberUtilities,
      })
    },
  ],
}
