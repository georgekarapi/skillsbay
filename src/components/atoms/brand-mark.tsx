import type { ImgHTMLAttributes } from "react"

export interface BrandMarkProps extends ImgHTMLAttributes<HTMLImageElement> {}

export function BrandMark({
  className = "size-7",
  alt = "SkillsBay Mark",
  ...props
}: BrandMarkProps) {
  return (
    <img
      src="/favicon.svg"
      alt={alt}
      className={className}
      {...props}
    />
  )
}
