"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { cva } from "class-variance-authority";
import { ChevronDown, Check } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SelectContextType {
  value: string;
  onValueChange?: (val: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ value, defaultValue, onValueChange, children }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (val: string) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const selectVariants = cva(
  "inline-flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-8 rounded-md text-xs",
        lg: "h-12 rounded-lg text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      type="button"
      ref={ref}
      className={cn(selectVariants(), className)}
      onClick={() => ctx?.setOpen(!ctx?.open)}
      aria-expanded={ctx?.open}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0 transition-transform duration-200" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx?.open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-0 top-full mt-1 z-50 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 text-gray-900 dark:text-white shadow-lg animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    const isSelected = ctx?.value === value;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-3 pr-8 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/60 focus:bg-gray-100 dark:focus:bg-gray-700/60",
          isSelected && "font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={() => {
          if (!disabled) {
            ctx?.onValueChange?.(value);
          }
        }}
        {...props}
      >
        <span className="truncate">{children}</span>
        {isSelected && (
          <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    const displayValue = children || ctx?.value || placeholder;
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-x-2 truncate", !ctx?.value && placeholder && "text-gray-400", className)}
        {...props}
      >
        {displayValue}
      </span>
    );
  }
);
SelectValue.displayName = "SelectValue";

const SelectGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative py-1", className)} {...props} />
));
SelectGroup.displayName = "SelectGroup";

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup };
