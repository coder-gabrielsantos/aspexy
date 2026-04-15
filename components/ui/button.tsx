import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/10 hover:from-indigo-600 hover:to-indigo-700 active:from-indigo-700 active:to-indigo-800",
        secondary:
          "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200/90",
        outline:
          "border border-slate-200 bg-white shadow-sm hover:border-indigo-300/90 hover:bg-indigo-50/50 hover:text-slate-900",
        ghost:
          "hover:bg-indigo-50/70 hover:text-slate-900"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
