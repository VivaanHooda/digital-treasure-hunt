import { useEffect, useState } from 'react'

const PageTransition = ({ children, isTransitioning }) => {
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionClass, setTransitionClass] = useState('')

  useEffect(() => {
    if (isTransitioning) {
      // Mobile-optimized transition - reduced blur and scale for better performance
      const isMobile = window.innerWidth < 768
      const mobileTransition = 'opacity-0 scale-98 blur-sm'
      const desktopTransition = 'opacity-0 scale-95 blur-sm'
      
      setTransitionClass(isMobile ? mobileTransition : desktopTransition)
      
      // Faster transition on mobile for better performance
      const transitionDelay = isMobile ? 100 : 150
      
      setTimeout(() => {
        setDisplayChildren(children)
        setTransitionClass('opacity-100 scale-100 blur-0')
      }, transitionDelay)
    }
  }, [isTransitioning, children])

  return (
    <div className={`
      transition-all duration-200 sm:duration-300 ease-out transform
      will-change-transform
      ${transitionClass}
    `}>
      {displayChildren}
    </div>
  )
}

export default PageTransition