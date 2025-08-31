import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-medium hover:shadow-large',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus:ring-secondary-500 border border-secondary-300',
        outline: 'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-500 border border-primary-300 hover:border-primary-400',
        ghost: 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900 focus:ring-secondary-500',
        success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-medium',
        error: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 shadow-medium',
        warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 shadow-medium',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    children, 
    asChild,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    // Filter out asChild from props passed to DOM element
    const { asChild: _, ...domProps } = props

    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, className })}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...domProps}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
export { Button, buttonVariants }