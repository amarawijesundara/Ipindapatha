import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const containerVariants = cva(
  'mx-auto px-4 sm:px-6 lg:px-8',
  {
    variants: {
      size: {
        sm: 'max-w-2xl',
        default: 'max-w-4xl',
        md: 'max-w-5xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-w-full',
      },
      centered: {
        true: 'text-center',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, centered, as: Component = 'div', ...props }, ref) => (
    <Component
      ref={ref}
      className={containerVariants({ size, centered, className })}
      {...props}
    />
  )
)

Container.displayName = 'Container'

export default Container
export { Container, containerVariants }