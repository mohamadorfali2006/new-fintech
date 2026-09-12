import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
        warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[variant=default]:border-border data-[variant=default]:text-foreground data-[variant=default]:hover:bg-accent data-[variant=default]:hover:text-accent-foreground data-[variant=destructive]:border-destructive/50 data-[variant=destructive]:text-destructive-foreground data-[variant=destructive]:hover:bg-destructive/10 data-[variant=success]:border-emerald-300 data-[variant=success]:text-emerald-700 data-[variant=success]:hover:bg-emerald-100 data-[variant=warning]:border-amber-300 data-[variant=warning]:text-amber-700 data-[variant=warning]:hover:bg-amber-100",
        className
      )}
      {...props}
    />
  );
});
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-0 transition-opacity hover:text-gray-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 dark:text-gray-400 dark:hover:text-gray-500",
        className
      )}
      toast-close=""
      {...props}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
});
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h4
      ref={ref}
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
});
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm opacity-90", className)}
      {...props}
    />
  );
});
ToastDescription.displayName = "ToastDescription";

type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof toastVariants>;

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Toast.displayName = "Toast";

type ToastHavingChildrenProps = Omit<ToastProps, "children"> & {
  children?: React.ReactNode;
};

const ToastWithChildren = React.forwardRef<HTMLDivElement, ToastHavingChildrenProps>(
  ({ className, ...props }, ref) => {
    return <Toast ref={ref} className={className} {...props} />;
  }
);
ToastWithChildren.displayName = "ToastWithChildren";

const ToastViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col md:max-w-[420px] md:inset-x-4 md:flex-col",
        className
      )}
      {...props}
    />
  );
});
ToastViewport.displayName = "ToastViewport";

export {
  type ToastProps,
  type ToastActionProps,
  Toast,
  ToastWithChildren as ToastContent,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastViewport,
};

// Toast context
import { createContext, useContext, useState, useCallback, useId } from "react";

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  action?: React.ReactNode;
};

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
