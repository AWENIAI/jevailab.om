import { cn } from "@/lib/utils"
import { IconLoader } from "@tabler/icons-react"
import { m } from "@/locale/paraglide/messages"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <IconLoader data-slot="spinner" role="status" aria-label={m.common_loading()} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
