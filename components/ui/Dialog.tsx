const Dialog = ({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-lg mx-auto my-8 rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95">
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className = "" }: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1.5 pb-4">{children}</div>
);

const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{children}</h2>
);

const DialogFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50 mt-4">{children}</div>
);

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter };
