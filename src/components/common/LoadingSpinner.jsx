import { useState, useEffect } from 'react'

const LoadingSpinner = () => {
  const [dots, setDots] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 0 : prev + Math.random() * 10)
    }, 200)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-black"></div>
      
      {/* Animated particles - Responsive count and positioning */}
      <div className="absolute inset-0">
        {[...Array(window.innerWidth < 640 ? 12 : 20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 bg-cyan-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main loading content */}
      <div className="relative z-10 text-center max-w-sm mx-auto">
        {/* Spinner - Responsive sizing */}
        <div className="relative mb-6 sm:mb-8 mx-auto">
          {/* Outer ring */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border-2 sm:border-3 lg:border-4 border-gray-700 rounded-full animate-spin mx-auto">
            <div className="absolute inset-0 border-2 sm:border-3 lg:border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
          
          {/* Inner ring */}
          <div className="absolute inset-1 sm:inset-1.5 lg:inset-2 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-2 sm:border-3 lg:border-4 border-gray-600 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}>
            <div className="absolute inset-0 border-2 sm:border-3 lg:border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 bg-blue-400 rounded-full animate-ping"></div>
        </div>

        {/* Loading text - Responsive typography */}
        <div className="mb-4 sm:mb-6 px-2">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2 leading-tight">
            Loading Treasure Hunt{dots}
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            Preparing your adventure
          </p>
        </div>

        {/* Progress bar - Responsive width */}
        <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto px-2">
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-1 sm:mt-2">{Math.round(progress)}%</p>
        </div>

        {/* Glowing effects - Responsive sizing */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-42 sm:h-42 lg:w-48 lg:h-48 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner