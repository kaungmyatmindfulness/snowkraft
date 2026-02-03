import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/Icons'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  placeholder?: string
  error?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, ...props }, ref): React.JSX.Element => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full cursor-pointer appearance-none rounded-lg border bg-white px-3 py-2.5 text-gray-900',
            'transition-colors duration-200',
            'focus:ring-2 focus:ring-offset-0 focus:outline-none',
            error === true
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-sky-500 focus:ring-sky-500/20',
            'pr-10',
            className
          )}
          {...props}
        >
          {placeholder !== undefined && placeholder !== '' && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
          <Icons.ChevronDown size={18} />
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
