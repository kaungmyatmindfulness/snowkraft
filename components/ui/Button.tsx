import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/Icons'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const BASE_STYLES =
  'inline-flex items-center justify-center font-medium rounded-lg transition-[background-color,box-shadow,transform] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS = {
  primary:
    'bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-500 shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 active:scale-[0.98]',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-sm hover:shadow-md active:scale-[0.98]',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm hover:shadow-md active:scale-[0.98]',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-400',
  outline:
    'border-2 border-sky-500 text-sky-600 hover:bg-sky-50 focus:ring-sky-500 active:scale-[0.98]',
} as const

const SIZES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[36px]',
  md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]', // 44px is recommended minimum touch target
  lg: 'px-6 py-3 text-base gap-2 min-h-[48px]',
} as const

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props },
    ref
  ): React.JSX.Element => (
    <button
      ref={ref}
      disabled={disabled ?? isLoading ?? false}
      className={cn(BASE_STYLES, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {isLoading === true && (
        <Icons.Loader2 className="-ml-1 size-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'

export { Button }
