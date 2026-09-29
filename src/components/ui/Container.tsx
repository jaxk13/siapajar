import type { ReactNode } from "react";

const SIZES = {
  marketing: "max-w-[70rem]", // 1120px
  content: "max-w-[60rem]", // 960px
  narrow: "max-w-[25rem]", // 400px
} as const;

interface ContainerProps {
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}

export default function Container({ size = "marketing", className = "", children }: ContainerProps) {
  return <div className={`mx-auto w-full px-4 sm:px-6 ${SIZES[size]} ${className}`}>{children}</div>;
}
