import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const inputVariants = cva(
  'flex w-full rounded-lg border bg-white px-4 py-3 text-sm text-secondary-900 placeholder:text-secondary-500 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-secondary-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
        error: 'border-error-300 focus:border-error-500 focus:ring-1 focus:ring-error-500',
        success: 'border-success-300 focus:border-success-500 focus:ring-1 focus:ring-success-500',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-12 px-4 text-sm',
        lg: 'h-14 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  success?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    type = 'text',
    label,
    error,
    success,
    hint,
    leftIcon,
    rightIcon,
    leftAddon,
    rightAddon,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const hasSuccess = !!success && !hasError
    
    // Determine variant based on state
    const finalVariant = hasError ? 'error' : hasSuccess ? 'success' : variant

    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={clsx(
            inputVariants({ variant: finalVariant, size }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          id={inputId}
          aria-describedby={
            clsx(
              error && `${inputId}-error`,
              success && `${inputId}-success`,
              hint && `${inputId}-hint`
            ) || undefined
          }
          aria-invalid={hasError}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500">
            {rightIcon}
          </div>
        )}
      </div>
    )

    const inputWithAddons = leftAddon || rightAddon ? (
      <div className="flex">
        {leftAddon && (
          <div className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-secondary-300 bg-secondary-50 text-secondary-500 text-sm">
            {leftAddon}
          </div>
        )}
        <div className={clsx('flex-1', leftAddon && 'rounded-l-none', rightAddon && 'rounded-r-none')}>
          {inputElement}
        </div>
        {rightAddon && (
          <div className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-secondary-300 bg-secondary-50 text-secondary-500 text-sm">
            {rightAddon}
          </div>
        )}
      </div>
    ) : inputElement

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-900"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-error-500" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        {inputWithAddons}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {success && !error && (
          <p
            id={`${inputId}-success`}
            className="text-sm text-success-600"
            role="status"
          >
            {success}
          </p>
        )}
        {hint && !error && !success && (
          <p
            id={`${inputId}-hint`}
            className="text-sm text-secondary-600"
          >
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
export { Input, inputVariants }