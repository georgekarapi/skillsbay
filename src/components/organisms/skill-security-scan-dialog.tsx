import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import { hasBlockingSkillSecurityFinding, scanSkillBundle } from "@skillsbay/shared/skill-security"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function SkillSecurityScanDialog({
  open,
  markdown,
  onOpenChange,
  onProceed,
  proceedLabel,
}: {
  open: boolean
  markdown: string
  onOpenChange: (open: boolean) => void
  onProceed: () => void
  proceedLabel: string
}) {
  const findings = useMemo(() => scanSkillBundle(markdown), [markdown])
  const blocked = hasBlockingSkillSecurityFinding(findings)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Security scan complete
          </DialogTitle>
          <DialogDescription>
            Deterministic checks inspect instructions for high-risk commands and prompt-injection patterns. This is a review gate, not a guarantee of safety.
          </DialogDescription>
        </DialogHeader>
        {findings.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p>No high-risk patterns were detected. Review the full skill before publishing.</p>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-auto">
            {findings.map((finding) => (
              <div className={`rounded-lg border p-3 text-sm ${finding.severity === "block" ? "border-destructive/35 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}`} key={`${finding.rule}-${finding.line}`}>
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className={`size-4 ${finding.severity === "block" ? "text-destructive" : "text-amber-600"}`} />
                  {finding.severity === "block" ? "Blocked" : "Review required"} · line {finding.line}
                </div>
                <p className="mt-1 text-muted-foreground">{finding.message}</p>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">Back to edit</Button>
          <Button disabled={blocked} onClick={onProceed} type="button">
            {blocked ? "Resolve blocked findings" : proceedLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
