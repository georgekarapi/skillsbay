import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CommandText } from "@/components/molecules/command-text"

export function CommandCopy({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = command
        textarea.setAttribute("readonly", "")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        const copied = document.execCommand("copy")
        document.body.removeChild(textarea)
        if (!copied) throw new Error("Clipboard access was denied")
      }
      setCopied(true)
      toast.success("Install command copied")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Could not copy the command")
    }
  }
  return <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/45 px-3 py-2 font-mono text-xs text-foreground"><span className="truncate">$ <CommandText text={command} /></span><Button aria-label="Copy install command" className="ml-auto shrink-0" onClick={copy} size="icon-xs" variant="ghost">{copied ? <Check /> : <Copy />}</Button></div>
}
