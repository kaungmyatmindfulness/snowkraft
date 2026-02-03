import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/Icons'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, type = 'text', ...props }, ref): React.JSX.Element => {
    return (
      <div className="relative">
        {icon !== undefined && (
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">{icon}</div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2.5 text-gray-900',
            'transition-colors duration-200',
            'placeholder:text-gray-400',
            'focus:ring-2 focus:ring-offset-0 focus:outline-none',
            error === true
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-sky-500 focus:ring-sky-500/20',
            icon !== undefined && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

// Search input with built-in icon
const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'icon' | 'type'>>(
  ({ className, ...props }, ref): React.JSX.Element => {
    return (
      <Input
        ref={ref}
        type="search"
        icon={<Icons.Search size={18} />}
        className={className}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export { Input, SearchInput }
