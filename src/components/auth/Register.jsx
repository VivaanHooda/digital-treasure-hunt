import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Plus, Trash2, Users, Mail, Lock, User, Phone, MapPin, Trophy, Zap, Target, Clock, UserPlus, Eye, EyeOff, AlertTriangle, GraduationCap } from 'lucide-react'

const Register = () => {
  const { register, error, loading } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    teamName: '',
    email: '',
    password: '',
    confirmPassword: '',
    teamLeaderName: '',
    teamLeaderMobile: '',
    teamLeaderDepartment: '',
    teamMembers: [
      { name: '', mobile: '', department: '' },
      { name: '', mobile: '', department: '' },
      { name: '', mobile: '', department: '' }
    ]
  })

  const [formErrors, setFormErrors] = useState({})
  const [isVisible, setIsVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Department options
  const departments = [
    'Computer Science & Engineering (AIML)',
    'Computer Science & Engineering',
    'Computer Science & Engineering (Data Science)',
    'Computer Science & Engineering (Cyber Security)',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Electronics & Telecommunication Engineering',
    'Mechanical Engineering',
    'Aerospace Engineering',
    'Chemical Engineering',
    'Civil Engineering',
    'Biotechnology',
    'Industrial Engineering & Management'
  ]

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const validateMobile = (mobile) => {
    // Remove country code and check if it's a valid 10-digit Indian mobile number
    const cleanMobile = mobile.replace(/^\+91\s*/, '').replace(/\D/g, '')
    return /^[6-9]\d{9}$/.test(cleanMobile)
  }

  const formatMobile = (mobile) => {
    // Auto-format with +91 prefix
    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile.startsWith('91')) {
      return '+91 ' + cleanMobile.substring(2)
    } else if (cleanMobile.length <= 10) {
      return '+91 ' + cleanMobile
    }
    return mobile
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.teamName) {
      errors.teamName = 'Team name is required'
    }

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.teamLeaderName) {
      errors.teamLeaderName = 'Team leader name is required'
    }

    if (!formData.teamLeaderMobile) {
      errors.teamLeaderMobile = 'Team leader mobile number is required'
    } else if (!validateMobile(formData.teamLeaderMobile)) {
      errors.teamLeaderMobile = 'Please enter a valid Indian mobile number'
    }

    if (!formData.teamLeaderDepartment) {
      errors.teamLeaderDepartment = 'Team leader department is required'
    }

    // Validate all 3 team members (exactly 4 total including leader)
    const validMembers = formData.teamMembers.filter(member => 
      member.name.trim() && member.mobile.trim() && member.department.trim()
    )
    
    if (validMembers.length !== 3) {
      errors.teamMembers = 'All 3 team members are required (4 total including team leader)'
    }

    // Check for duplicate mobile numbers including leader's
    const allMobileNumbers = [
      formData.teamLeaderMobile.replace(/^\+91\s*/, '').replace(/\D/g, ''),
      ...validMembers.map(m => m.mobile.replace(/^\+91\s*/, '').replace(/\D/g, ''))
    ].filter(num => num)
    
    const duplicates = allMobileNumbers.filter((num, index) => 
      allMobileNumbers.indexOf(num) !== index
    )
    
    if (duplicates.length > 0) {
      errors.teamMembers = 'Mobile numbers must be unique (including team leader)'
    }

    // Validate each team member's mobile number
    formData.teamMembers.forEach((member, index) => {
      if (member.mobile.trim() && !validateMobile(member.mobile)) {
        errors[`member${index}Mobile`] = `Member ${index + 2}: Invalid mobile number`
      }
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    
    try {
      // Format all mobile numbers
      const formattedTeamMembers = formData.teamMembers.map(member => ({
        ...member,
        mobile: member.mobile.replace(/^\+91\s*/, '').replace(/\D/g, '')
      }))

      await register(formData.email, formData.password, {
        teamName: formData.teamName,
        teamLeaderName: formData.teamLeaderName,
        teamLeaderMobile: formData.teamLeaderMobile.replace(/^\+91\s*/, '').replace(/\D/g, ''),
        teamLeaderDepartment: formData.teamLeaderDepartment,
        teamMembers: formattedTeamMembers
      })
      
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTeamMember = (index, field, value) => {
    const updatedMembers = formData.teamMembers.map((member, i) => {
      if (i === index) {
        if (field === 'mobile') {
          return { ...member, [field]: formatMobile(value) }
        }
        return { ...member, [field]: value }
      }
      return member
    })
    setFormData({ ...formData, teamMembers: updatedMembers })
  }

  const handleMobileChange = (value) => {
    setFormData({ ...formData, teamLeaderMobile: formatMobile(value) })
  }

  const stats = [
    { icon: Target, label: '30 Pictures', color: 'text-cyan-400' },
    { icon: Zap, label: '10 Riddles', color: 'text-purple-400' },
    { icon: Clock, label: '2 Hours', color: 'text-green-400' },
    { icon: Users, label: '4 Members', color: 'text-yellow-400' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      
      {/* Animated Background - Mobile optimized */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30 sm:opacity-50">
          <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-cyan-500/5 sm:bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-purple-500/5 sm:bg-purple-500/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-blue-500/5 sm:bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Floating Elements - Reduced for mobile */}
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
        max-w-sm sm:max-w-2xl lg:max-w-4xl w-full transition-all duration-1000 transform
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
      `}>
        
        {/* Header - Responsive sizing */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/25 mb-3 sm:mb-4">
              <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 animate-pulse"></div>
            </div>
            
            {/* Glow effects */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-cyan-500/20 rounded-full blur-xl -z-10 animate-pulse"></div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 sm:mb-3">
            Join the Hunt
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Register your team for the ultimate adventure
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 mb-6 sm:mb-8">
          <div className="flex items-start">
            <AlertTriangle className="text-orange-400 mr-3 mt-0.5 flex-shrink-0 w-5 h-5" />
            <div>
              <p className="text-orange-300 font-medium text-sm mb-1">Important Notice</p>
              <p className="text-orange-400 text-sm">
                Only <strong>1 device is allowed to login at a time</strong>. Logging in from another device will automatically log out the previous session.
              </p>
            </div>
          </div>
        </div>

        {/* Stats - Mobile optimized grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
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

        {/* Registration Form - Enhanced mobile layout */}
        <form onSubmit={handleSubmit} className="bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-4 sm:p-6 lg:p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 sm:px-4 py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm sm:text-base">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6 sm:space-y-8">
            
            {/* Team Name Section */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Team Information</h3>
              </div>

              {/* Team Name Field */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <div className="relative group">
                  <Users className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                    className="
                      w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                      rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                      focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                      hover:border-gray-600/50 text-sm sm:text-base
                      min-h-[48px] sm:min-h-[56px]
                    "
                    placeholder="Enter your team name"
                  />
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                </div>
                {formErrors.teamName && (
                  <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                    <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                    {formErrors.teamName}
                  </p>
                )}
              </div>
            </div>

            {/* Team Leader Section */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Team Leader Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Email Field */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Team Leader Email
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
                      placeholder="team.leader@email.com"
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

                {/* Team Leader Name */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="text"
                      value={formData.teamLeaderName}
                      onChange={(e) => setFormData({...formData, teamLeaderName: e.target.value})}
                      className="
                        w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                        rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                        focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                        hover:border-gray-600/50 text-sm sm:text-base
                        min-h-[48px] sm:min-h-[56px]
                      "
                      placeholder="Enter your full name"
                    />
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                  </div>
                  {formErrors.teamLeaderName && (
                    <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                      <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                      {formErrors.teamLeaderName}
                    </p>
                  )}
                </div>

                {/* Team Leader Mobile Number */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="tel"
                      value={formData.teamLeaderMobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      className="
                        w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                        rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                        focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                        hover:border-gray-600/50 text-sm sm:text-base
                        min-h-[48px] sm:min-h-[56px]
                      "
                      placeholder="+91 9876543210"
                    />
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                  </div>
                  {formErrors.teamLeaderMobile && (
                    <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                      <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                      {formErrors.teamLeaderMobile}
                    </p>
                  )}
                </div>

                {/* Team Leader Department */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Department
                  </label>
                  <div className="relative group">
                    <GraduationCap className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                    <select
                      value={formData.teamLeaderDepartment}
                      onChange={(e) => setFormData({...formData, teamLeaderDepartment: e.target.value})}
                      className="
                        w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                        rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-cyan-400 
                        focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                        hover:border-gray-600/50 text-sm sm:text-base
                        min-h-[48px] sm:min-h-[56px]
                      "
                    >
                      <option value="" className="bg-gray-800">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept} className="bg-gray-800">
                          {dept}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                  </div>
                  {formErrors.teamLeaderDepartment && (
                    <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                      <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                      {formErrors.teamLeaderDepartment}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="
                        w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                        rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                        focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                        hover:border-gray-600/50 text-sm sm:text-base
                        min-h-[48px] sm:min-h-[56px]
                      "
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors duration-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                      <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="
                        w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3.5 sm:py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 
                        rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 
                        focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300
                        hover:border-gray-600/50 text-sm sm:text-base
                        min-h-[48px] sm:min-h-[56px]
                      "
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors duration-300 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-focus-within:from-cyan-500/10 group-focus-within:via-cyan-500/5 group-focus-within:to-cyan-500/10 transition-all duration-500 pointer-events-none"></div>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="text-red-400 text-xs sm:text-sm mt-2 flex items-center">
                      <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members Section - Fixed to 3 members */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 shadow-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    Team Members (3 Required)
                  </h3>
                </div>
                <div className="text-sm text-gray-400 bg-gray-700/30 px-3 py-1 rounded-full">
                  Total: 4 members (including leader)
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {formData.teamMembers.map((member, index) => (
                  <div key={index} className="group">
                    <div className="p-3 sm:p-4 bg-gray-900/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-400">
                          Member {index + 2}
                        </span>
                        <span className="text-xs text-green-400">Required</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {/* Member Name */}
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-400 mb-2">
                            Full Name
                          </label>
                          <div className="relative group">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                              className="
                                w-full pl-10 pr-3 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 
                                rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 
                                focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-sm
                                min-h-[44px]
                              "
                              placeholder="Enter full name"
                              required
                            />
                          </div>
                          {formErrors[`member${index}Name`] && (
                            <p className="text-red-400 text-xs mt-1">{formErrors[`member${index}Name`]}</p>
                          )}
                        </div>

                        {/* Mobile Number */}
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-400 mb-2">
                            Mobile Number
                          </label>
                          <div className="relative group">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                            <input
                              type="tel"
                              value={member.mobile}
                              onChange={(e) => updateTeamMember(index, 'mobile', e.target.value)}
                              className="
                                w-full pl-10 pr-3 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 
                                rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 
                                focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-sm
                                min-h-[44px]
                              "
                              placeholder="+91 9876543210"
                              required
                            />
                          </div>
                          {formErrors[`member${index}Mobile`] && (
                            <p className="text-red-400 text-xs mt-1">{formErrors[`member${index}Mobile`]}</p>
                          )}
                        </div>

                        {/* Department */}
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-400 mb-2">
                            Department
                          </label>
                          <div className="relative group">
                            <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                            <select
                              value={member.department}
                              onChange={(e) => updateTeamMember(index, 'department', e.target.value)}
                              className="
                                w-full pl-10 pr-3 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 
                                rounded-lg text-white focus:outline-none focus:border-cyan-400 
                                focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-sm
                                min-h-[44px]
                              "
                              required
                            >
                              <option value="" className="bg-gray-800">Select Department</option>
                              {departments.map((dept) => (
                                <option key={dept} value={dept} className="bg-gray-800">
                                  {dept}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formErrors.teamMembers && (
                <p className="text-red-400 text-xs sm:text-sm flex items-center">
                  <div className="w-1 h-1 bg-red-400 rounded-full mr-2"></div>
                  {formErrors.teamMembers}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="
                w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700
                text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30
                relative overflow-hidden group text-sm sm:text-base
                min-h-[48px] sm:min-h-[56px] active:scale-95 sm:active:scale-[1.02]
              "
            >
              {loading || isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 sm:mr-3"></div>
                  <span className="text-sm sm:text-base">Creating Your Team...</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10">Register Team & Join Hunt</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </>
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-2">
              <Link 
                to="/login" 
                className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 relative group text-sm sm:text-base inline-block py-2 px-4 -mx-4"
              >
                Already have a team? 
                <span className="text-cyan-400 ml-1 group-hover:text-cyan-300">Sign in here</span>
                <div className="absolute bottom-2 left-4 w-0 h-0.5 bg-cyan-400 group-hover:w-[calc(100%-32px)] transition-all duration-300"></div>
              </Link>
            </div>
          </div>
        </form>

        {/* Team Guidelines */}
        <div className="mt-6 sm:mt-8 bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-700/50 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
            <Trophy className="text-yellow-400 mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Team Guidelines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              'Team must have exactly 4 members (including leader)',
              'One team leader manages the account',  
              'All members need unique mobile numbers',
              'Team leader receives all communications',
              'Physical presence required for verification',
              'Only 1 device login allowed at a time'
            ].map((rule, index) => (
              <div key={index} className="flex items-start group">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <span className="text-gray-300 text-xs sm:text-sm group-hover:text-white transition-colors leading-relaxed">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Styles - Mobile optimized animations */}
      <style jsx>{`
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
        
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(15px, -25px) sm:translate(30px, -50px) scale(1.05) sm:scale(1.1);
          }
          66% {
            transform: translate(-10px, 10px) sm:translate(-20px, 20px) scale(0.95) sm:scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-float {
          animation: float 4s sm:6s ease-in-out infinite;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.5s sm:0.6s ease-out forwards;
        }
        
        .animate-blob {
          animation: blob 5s sm:7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 640px) {
          /* Ensure proper touch targets */
          button, a, input, select, textarea {
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
          
          /* Reduce shadow intensity on mobile */
          .shadow-2xl {
            box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
          .animate-pulse,
          .animate-blob {
            animation: none;
          }
          
          .transition-all {
            transition: none;
          }
        }
        
        /* Landscape mobile optimization */
        @media (max-height: 500px) and (orientation: landscape) {
          .min-h-screen {
            min-height: auto;
          }
          
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Register