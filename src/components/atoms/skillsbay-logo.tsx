import type { ImgHTMLAttributes } from "react"

export interface SkillsbayLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  variant?: "default" | "dark" | "light"
}

export function SkillsbayLogo({
  className = "h-8 w-auto",
  alt = "Skillsbay",
  variant,
  ...props
}: SkillsbayLogoProps) {
  if (variant === "dark") {
    return (
      <img
        src="/skillsbay-logo-dark.svg"
        alt={alt}
        className={className}
        {...props}
      />
    )
  }

  if (variant === "light") {
    return (
      <img
        src="/skillsbay-logo.svg"
        alt={alt}
        className={className}
        {...props}
      />
    )
  }

  return (
    <>
      <img
        src="/skillsbay-logo.svg"
        alt={alt}
        className={`dark:hidden ${className}`}
        {...props}
      />
      <img
        src="/skillsbay-logo-dark.svg"
        alt={alt}
        className={`hidden dark:block ${className}`}
        {...props}
      />
    </>
  )
}
