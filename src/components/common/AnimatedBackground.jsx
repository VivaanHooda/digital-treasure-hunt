import { useEffect, useRef } from 'react'

const AnimatedBackground = () => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      
      // Set canvas size accounting for device pixel ratio for crisp rendering
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      
      // Scale context to account for device pixel ratio
      ctx.scale(dpr, dpr)
      
      // Set display size
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
    }
    
    // Initial resize
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle class - Optimized for mobile performance
    class Particle {
      constructor() {
        const rect = canvas.getBoundingClientRect()
        this.x = Math.random() * rect.width
        this.y = Math.random() * rect.height
        this.size = Math.random() * 1.5 + 0.5 // Smaller particles for mobile
        this.speedX = (Math.random() - 0.5) * 0.3 // Slower movement for mobile
        this.speedY = (Math.random() - 0.5) * 0.3
        this.opacity = Math.random() * 0.4 + 0.2 // Slightly more transparent
        this.color = this.getRandomColor()
        this.life = 1
        this.decay = Math.random() * 0.003 + 0.001 // Slower decay
      }

      getRandomColor() {
        const colors = [
          'rgba(56, 189, 248, ', // cyan-400
          'rgba(139, 92, 246, ', // violet-400
          'rgba(59, 130, 246, ',  // blue-500
          'rgba(168, 85, 247, ',  // purple-500
          'rgba(34, 197, 94, ',   // emerald-500
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.life -= this.decay

        const rect = canvas.getBoundingClientRect()
        
        // Wrap around screen edges
        if (this.x < 0) this.x = rect.width
        if (this.x > rect.width) this.x = 0
        if (this.y < 0) this.y = rect.height
        if (this.y > rect.height) this.y = 0

        // Reset particle if life is over
        if (this.life <= 0) {
          this.x = Math.random() * rect.width
          this.y = Math.random() * rect.height
          this.life = 1
          this.opacity = Math.random() * 0.4 + 0.2
          this.color = this.getRandomColor()
        }
      }

      draw() {
        const finalOpacity = this.opacity * this.life
        ctx.globalAlpha = finalOpacity
        ctx.fillStyle = this.color + finalOpacity + ')'
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()

        // Reduced glow effect for performance
        if (finalOpacity > 0.3) {
          ctx.shadowBlur = 10
          ctx.shadowColor = this.color + '0.3)'
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
    }

    // Initialize particles - Responsive particle count
    const initParticles = () => {
      particlesRef.current = []
      const rect = canvas.getBoundingClientRect()
      const area = rect.width * rect.height
      
      // Responsive particle count based on screen size and device capabilities
      const isMobile = window.innerWidth < 768
      const baseCount = isMobile ? 30 : 60 // Fewer particles on mobile
      const densityFactor = Math.min(area / 500000, 1.5) // Scale with screen size
      const particleCount = Math.floor(baseCount * densityFactor)
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(new Particle())
      }
    }

    // Performance-optimized animation loop
    let lastTime = 0
    const targetFPS = window.innerWidth < 768 ? 30 : 60 // Lower FPS on mobile

    const animate = (currentTime) => {
      // Throttle to target FPS
      if (currentTime - lastTime < 1000 / targetFPS) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = currentTime

      const rect = canvas.getBoundingClientRect()
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(17, 24, 39, 0.05)' // gray-900 with low opacity
      ctx.fillRect(0, 0, rect.width, rect.height)

      // Reduce connection calculations on mobile
      const maxConnections = window.innerWidth < 768 ? 50 : 100
      const connectionDistance = window.innerWidth < 768 ? 80 : 100
      let connectionCount = 0

      // Draw particles and connections
      particlesRef.current.forEach((particle, index) => {
        particle.update()
        
        // Draw connections (limited for performance)
        if (connectionCount < maxConnections) {
          const startIndex = Math.max(0, index - 5) // Check fewer particles for connections
          particlesRef.current.slice(startIndex, index).forEach(otherParticle => {
            const dx = particle.x - otherParticle.x
            const dy = particle.y - otherParticle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance < connectionDistance) {
              const opacity = 0.1 * (1 - distance / connectionDistance)
              ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`
              ctx.lineWidth = 0.5
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(otherParticle.x, otherParticle.y)
              ctx.stroke()
              connectionCount++
            }
          })
        }
        
        particle.draw()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    // Initialize and start animation
    initParticles()
    
    // Delay initial animation start to ensure smooth loading
    setTimeout(() => {
      animate(0)
    }, 100)

    // Reinitialize particles on resize
    const handleResize = () => {
      resizeCanvas()
      initParticles()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <>
      {/* Canvas for particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none w-full h-full"
        style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          willChange: 'auto' // Optimize for performance
        }}
      />
      
      {/* Gradient overlay - Simplified for mobile */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-gray-900/95 to-black/90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-cyan-500/5"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent"></div>
      </div>

      {/* Grid pattern overlay - Responsive grid size */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px', // Smaller grid on mobile
          animation: 'gridMove 25s linear infinite' // Slower animation
        }}
      ></div>

      {/* CSS for grid animation - Smaller movement on mobile */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 30px); }
        }
        
        @media (min-width: 768px) {
          .grid-overlay {
            background-size: 50px 50px;
          }
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
        }
      ` }} />
    </>
  )
}

export default AnimatedBackground