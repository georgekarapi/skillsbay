export type SkillSecuritySeverity = "block" | "warning"

export type SkillSecurityFinding = {
  severity: SkillSecuritySeverity
  rule: string
  line: number
  message: string
}

type Rule = {
  severity: SkillSecuritySeverity
  rule: string
  message: string
  pattern: RegExp
}

const RULES: Rule[] = [
  {
    severity: "block",
    rule: "download-and-execute",
    message: "Downloads content and pipes it directly into a shell.",
    pattern: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba)?sh\b/i,
  },
  {
    severity: "block",
    rule: "instruction-override",
    message: "Attempts to override higher-priority or prior instructions.",
    pattern: /\b(?:ignore|disregard|override)\b.{0,80}\b(?:previous|prior|system|developer)\b.{0,80}\b(?:instruction|prompt|rule)s?\b/i,
  },
  {
    severity: "block",
    rule: "credential-exfiltration",
    message: "Combines sensitive credential locations with an outbound request.",
    pattern: /(?:\.ssh|id_rsa|\.aws\/credentials|\.env|keychain).{0,160}\b(?:curl|wget|fetch|http)\b|\b(?:curl|wget|fetch|http)\b.{0,160}(?:\.ssh|id_rsa|\.aws\/credentials|\.env|keychain)/i,
  },
  {
    severity: "warning",
    rule: "encoded-payload",
    message: "Contains a command that decodes an encoded payload; review its source and destination.",
    pattern: /\b(?:base64|openssl)\b[^\n]*(?:-d|--decode|enc)/i,
  },
  {
    severity: "warning",
    rule: "privileged-command",
    message: "Requests elevated privileges or modifies executable permissions.",
    pattern: /\b(?:sudo|chmod\s+\+x)\b/i,
  },
  {
    severity: "warning",
    rule: "destructive-command",
    message: "Contains a potentially destructive filesystem command.",
    pattern: /\brm\s+-[^\n]*r[^\n]*f\b|\b(?:mkfs|dd\s+if=)\b/i,
  },
]

export function scanSkillBundle(markdown: string): SkillSecurityFinding[] {
  return markdown.split("\n").flatMap((line, index) =>
    RULES.filter((rule) => rule.pattern.test(line)).map((rule) => ({
      severity: rule.severity,
      rule: rule.rule,
      line: index + 1,
      message: rule.message,
    })),
  )
}

export function hasBlockingSkillSecurityFinding(findings: SkillSecurityFinding[]) {
  return findings.some((finding) => finding.severity === "block")
}
