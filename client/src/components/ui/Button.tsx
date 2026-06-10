import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          variant === "primary" && "btn-primary",
          variant === "secondary" && "btn-secondary",
          variant === "ghost" && "text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl px-4 py-2 text-sm transition-colors",
          variant === "danger" && "bg-red-600 text-white hover:bg-red-500 rounded-xl px-4 py-2 text-sm transition-colors",
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
