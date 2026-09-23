import { cn } from "cn"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
