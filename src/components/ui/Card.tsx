import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const cardVariants = cva(
  'bg-white border border-secondary-200 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'shadow-medium',
        elevated: 'shadow-large hover:shadow-xl',
        flat: 'shadow-soft',
        outline: 'shadow-none border-2',
      },
      size: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-lg',
        default: 'rounded-xl',
        lg: 'rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, rounded, ...props }, ref) => (
    <div
      ref={ref}
      className={cardVariants({ variant, size, rounded, className })}
      {...props}
    />
  )
)

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('border-b border-secondary-200 pb-4 mb-6', className)}
    {...props}
  />
))

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  }
>(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={clsx('text-lg font-semibold text-secondary-900 leading-none', className)}
    {...props}
  />
))

const CardSubtitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx('text-sm text-secondary-600 mt-2', className)}
    {...props}
  />
))

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('space-y-4', className)}
    {...props}
  />
))

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('border-t border-secondary-200 pt-4 mt-6 flex items-center justify-between', className)}
    {...props}
  />
))

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardSubtitle.displayName = 'CardSubtitle'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardFooter, cardVariants }