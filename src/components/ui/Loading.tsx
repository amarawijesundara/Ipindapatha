import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      color: {
        primary: 'text-primary-600',
        secondary: 'text-secondary-600',
        white: 'text-white',
        current: 'text-current',
      },
    },
    defaultVariants: {
      size: 'default',
      color: 'primary',
    },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, color, label = 'Loading', ...props }, ref) => (
    <div
      ref={ref}
      className={spinnerVariants({ size, color, className })}
      role="status"
      aria-label={label}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </div>
  )
)

const LoadingDots = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label?: string }
>(({ className, label = 'Loading', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex space-x-1 ${className || ''}`}
    role="status"
    aria-label={label}
    {...props}
  >
    <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce"></div>
    <span className="sr-only">{label}</span>
  </div>
))

const LoadingSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    lines?: number
    height?: string
  }
>(({ className, lines = 3, height = 'h-4', ...props }, ref) => (
  <div
    ref={ref}
    className={`animate-pulse space-y-2 ${className || ''}`}
    role="status"
    aria-label="Loading content"
    {...props}
  >
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`bg-secondary-200 rounded ${height} ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
    <span className="sr-only">Loading content</span>
  </div>
))

const LoadingPage = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    message?: string
  }
>(({ className, message = 'Loading...', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col items-center justify-center min-h-[200px] space-y-4 ${className || ''}`}
    role="status"
    aria-live="polite"
    {...props}
  >
    <Spinner size="xl" />
    <p className="text-secondary-600 text-sm font-medium">{message}</p>
  </div>
))

Spinner.displayName = 'Spinner'
LoadingDots.displayName = 'LoadingDots'
LoadingSkeleton.displayName = 'LoadingSkeleton'
LoadingPage.displayName = 'LoadingPage'

// Default export the main Loading component (Spinner)
const Loading = Spinner

export default Loading
export { Spinner, LoadingDots, LoadingSkeleton, LoadingPage, spinnerVariants }