"use client";

import type { LucideIcon } from "lucide-react";
import { motion, type HTMLMotionProps, type MotionProps } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type SidebarIconButtonProps = {
  className?: string;
  disabled?: boolean;
  icon: LucideIcon;
  title?: string | null;
  label: string;
  motionProps?: Pick<MotionProps, "animate" | "initial" | "transition">;
  onClick?: () => void;
  isActive?: boolean;
  children?: React.ReactNode;
};

export const SidebarIconButton = forwardRef<
  HTMLButtonElement,
  SidebarIconButtonProps & Omit<HTMLMotionProps<"button">, "children" | "title" | "onClick">
>(function SidebarIconButton(
  {
    className,
    disabled = false,
    icon: Icon,
    title,
    label,
    motionProps,
    onClick,
    isActive = false,
    children,
    ...rest
  },
  ref,
) {
  const buttonTitle = title === undefined ? label : title;

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      disabled={disabled}
      title={buttonTitle ?? undefined}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg border border-transparent p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
      initial={motionProps?.initial}
      animate={motionProps?.animate}
      onClick={onClick}
      transition={motionProps?.transition}
      {...rest}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Icon className="h-5 w-5" />
        {children}
      </span>
    </motion.button>
  );
});
