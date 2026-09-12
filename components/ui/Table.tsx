import * as React from "react";
import { cn } from "@/lib/utils";

const Table = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("relative w-full overflow-auto", className)} {...props} />
);
Table.displayName = "Table";

const TableHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("border-b", className)} {...props} />
);
TableHeader.displayName = "TableHeader";

const TableBody = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y", className)} {...props} />
);
TableBody.displayName = "TableBody";

const TableRow = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50", className)} {...props} />
);
TableRow.displayName = "TableRow";

const TableHead = ({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-12 px-4 text-left align-middle font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider", className)} {...props} />
);
TableHead.displayName = "TableHead";

const TableCell = ({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...props} />
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
