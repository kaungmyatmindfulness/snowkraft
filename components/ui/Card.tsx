import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const BASE_STYLES = 'rounded-xl bg-white dark:bg-slate-800'

const VARIANTS = {
  default: 'shadow-md',
  elevated: 'shadow-lg hover:shadow-xl transition-shadow duration-300',
  bordered: 'border border-gray-200 dark:border-slate-700 shadow-sm',
  interactive:
    'shadow-md hover:shadow-lg transition-[box-shadow,transform] duration-200 cursor-pointer hover:-translate-y-0.5',
} as const

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = 'default', padding = 'md', children, ...props },
    ref
  ): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(BASE_STYLES, VARIANTS[variant], PADDINGS[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'

type CardHeaderProps = HTMLAttributes<HTMLDivElement>

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref): React.JSX.Element => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} />
  )
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', ...props }, ref): React.JSX.Element => (
    <Component
      ref={ref}
      className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref): React.JSX.Element => (
    <p ref={ref} className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props} />
  )
)

CardDescription.displayName = 'CardDescription'

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const CONTENT_PADDINGS = {
  none: '',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
} as const

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'md', ...props }, ref): React.JSX.Element => (
    <div ref={ref} className={cn(CONTENT_PADDINGS[padding], className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

type CardFooterProps = HTMLAttributes<HTMLDivElement>

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref): React.JSX.Element => (
    <div ref={ref} className={cn('flex items-center pt-4', className)} {...props} />
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
