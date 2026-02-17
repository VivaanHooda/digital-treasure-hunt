import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Mail, Lock, MapPin, Trophy, Zap, Target, Clock, Users, AlertTriangle, Smartphone } from 'lucide-react'

const Login = () => {
  const { login, error, loading } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [formErrors, setFormErrors] = useState({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const validateForm = () => {
    const errors = {}

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Admin check - Check credentials before Firebase
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD
    
    if (formData.email === adminEmail && formData.password === adminPassword) {
      console.log('Admin credentials detected - bypassing Firebase auth')
      // Set a flag to indicate admin mode and redirect directly
      sessionStorage.setItem('isAdmin', 'true')
      navigate('/admin')
      return
    }

    // Regular user login
    try {
      await login(formData.email, formData.password)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  const stats = [
    { icon: Target, label: '20 Pictures', color: 'text-cyan-400' },
    { icon: Zap, label: '20 Riddles', color: 'text-purple-400' },
    { icon: Clock, label: '2 Hours', color: 'text-green-400' },
    { icon: Users, label: '4 Members', color: 'text-yellow-400' }
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      
      {/* Floating Elements - Reduced count and optimized for mobile */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(window.innerWidth < 768 ? 8 : 15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className={`
        max-w-sm sm:max-w-md w-full transition-all duration-1000 transform flex-grow flex flex-col justify-center
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
      `}>
        
        {/* Header - Responsive sizing */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/25 mb-3 sm:mb-4">
              <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 animate-pulse"></div>
            </div>
            
            {/* Glow effects - Responsive sizing */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-cyan-500/20 rounded-full blur-xl -z-10 animate-pulse"></div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 sm:mb-3">
            Treasure Hunt
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Enter the digital realm of adventure
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 mb-6 sm:mb-8">
          <div className="flex items-start">
            <Smartphone className="text-orange-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5" />
            <div>
              <p className="text-orange-300 font-medium text-sm mb-1">Single Device Login</p>
              <p className="text-orange-400 text-sm">
                Only <strong>1 device is allowed to login at a time</strong>. Logging in from another device is prohibited.
              </p>
            </div>
          </div>
        </div>

        {/* Stats - Optimized grid for mobile */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`
                bg-gray-800/30 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-700/50
                hover:border-gray-600/50 transition-all duration-300 group hover:scale-105
                ${isVisible ? 'animate-slideInUp' : ''}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} group-hover:scale-110 transition-transform`} />
                <span className="text-white text-xs sm:text-sm font-medium">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Login Form - Enhanced mobile optimization */}
        <div className="bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 sm:px-4 py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm sm:text-base">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-4">
              {/* Email Field - Enhanced mobile UX */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="
                      w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                      rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                      focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                      hover:border-gray-600/50 text-sm sm:text-base
                      min-h-[48px] sm:min-h-[56px]
                    "
                    placeholder="Enter your email address"
                  />
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                </div>
                {formErrors.email && (
                  <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                    <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field - Enhanced mobile UX */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="
                      w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                      rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                      focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                      hover:border-gray-600/50 text-sm sm:text-base
                      min-h-[48px] sm:min-h-[56px]
                    "
                    placeholder="Enter your password"
                  />
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                </div>
                {formErrors.password && (
                  <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                    <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                    {formErrors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button - Enhanced mobile touch target */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700
                text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30
                relative overflow-hidden group text-sm sm:text-base
                min-h-[48px] sm:min-h-[56px] active:scale-95 sm:active:scale-[1.02]
              "
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 sm:mr-3"></div>
                  <span className="text-sm sm:text-base">Authenticating...</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10">Enter the Hunt</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </>
              )}
            </button>

            {/* Register Link - Enhanced mobile touch */}
            <div className="text-center pt-2">
              <Link 
                to="/register" 
                className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 relative group text-sm sm:text-base inline-block py-2 px-4 -mx-4"
              >
                Don't have a team? 
                <span className="text-cyan-400 ml-1 group-hover:text-cyan-300">Create one</span>
                <div className="absolute bottom-2 left-4 w-0 h-0.5 bg-cyan-400 group-hover:w-[calc(100%-32px)] transition-all duration-300"></div>
              </Link>
            </div>
          </form>
        </div>

        {/* Bottom Logos */}
        <div className={`
          mt-6 sm:mt-8 flex items-center justify-center space-x-8 sm:space-x-12 transition-all duration-1000 delay-500 transform
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
        `}>
          <div className="group">
            <img 
              src="/images/logos/RVSmall.png" 
              alt="RV Logo" 
              className="h-16 sm:h-20 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300 group-hover:scale-110 transform transition-transform"
              onError={(e) => {
                console.warn('RV Logo not found at /images/logos/RVSmall.png');
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="w-px h-16 sm:h-20 bg-gray-600/50"></div>
          <div className="group">
            <img 
              src="/images/logos/CCWhite.png" 
              alt="CC Logo" 
              className="h-20 sm:h-24 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300 group-hover:scale-110 transform transition-transform"
              onError={(e) => {
                console.warn('CC Logo not found at /images/logos/CCWhite.png');
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Game Rules - Responsive padding and text */}
        <div className="mt-6 sm:mt-8 bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
            <Trophy className="text-yellow-400 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Game Rules
          </h3>
          <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
            {[
              'Teams of exactly 4 members only',
              '1-minute cooldown between guesses',  
              '2-hour time limit for entire game',
              'Visit locations physically to verify'
            ].map((rule, index) => (
              <li key={index} className="flex items-start group">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <span className="group-hover:text-white transition-colors leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Custom Styles - Mobile optimized animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) sm:translateY(-20px) rotate(90deg) sm:rotate(180deg); }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px) sm:translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 4s sm:6s ease-in-out infinite;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.5s sm:0.6s ease-out forwards;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 640px) {
          /* Ensure proper touch targets */
          button, a, input {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Reduce blur effects for better mobile performance */
          .backdrop-blur-xl {
            backdrop-filter: blur(8px);
          }
          
          .backdrop-blur-sm {
            backdrop-filter: blur(4px);
          }
          
          .blur-xl {
            filter: blur(8px);
          }
          
          /* Optimize animations for mobile */
          .animate-pulse {
            animation-duration: 3s;
          }
        }
        
        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .shadow-2xl {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
        }
        
        /* Focus improvements for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-slideInUp,
          .animate-pulse {
            animation: none;
          }
          
          .transition-all {
            transition: none;
          }
        }
      ` }} />
    </div>
  )
}

export default Login