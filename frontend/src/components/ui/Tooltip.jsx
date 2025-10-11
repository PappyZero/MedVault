import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * A reusable Tooltip component that shows additional information on hover or focus.
 */
const Tooltip = ({ 
  children, 
  content, 
  position = 'top',
  className = '',
  tooltipClassName = '',
  showArrow = true,
  delay = 100,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({});
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);
  let timeoutId = null;

  // Position classes based on the position prop
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Arrow classes based on the position prop
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-black',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-black',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-black',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-black',
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      }
      setIsVisible(true);
    }, delay);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        triggerRef.current && 
        !triggerRef.current.contains(event.target)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <div
        ref={triggerRef}
        className="inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        tabIndex={0}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-sm font-medium text-white bg-black rounded-md shadow-lg
            transition-opacity duration-200 ${positionClasses[position]} ${tooltipClassName}
          `}
          style={{
            maxWidth: '300px',
            minWidth: '100px',
          }}
        >
          {content}
          {showArrow && (
            <div
              className={`
                absolute w-0 h-0 border-4 border-transparent
                ${arrowClasses[position]}
              `}
              style={{
                borderWidth: '6px',
              }}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
};

Tooltip.propTypes = {
  /** The content that triggers the tooltip */
  children: PropTypes.node.isRequired,
  /** The tooltip content */
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  /** Position of the tooltip relative to the trigger */
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  /** Additional class names for the tooltip container */
  className: PropTypes.string,
  /** Additional class names for the tooltip content */
  tooltipClassName: PropTypes.string,
  /** Whether to show the arrow */
  showArrow: PropTypes.bool,
  /** Delay before showing the tooltip in milliseconds */
  delay: PropTypes.number,
};

export default Tooltip;