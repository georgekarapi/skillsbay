export interface PartnerAudit {
  risk: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  alerts?: number;
  score?: number;
  analyzedAt: string;
}

export type SkillAuditData = Record<string, PartnerAudit>;
export type AuditResponse = Record<string, SkillAuditData>;

export function setDetectedAgent(_agentName: string | null): void {}
export function setVersion(_version: string): void {}
export function track(_data: unknown): void {}
export async function flushTelemetry(): Promise<void> {}
export async function fetchAuditData(
  _source: string,
  _skillSlugs: string[],
  _timeoutMs = 3000
): Promise<AuditResponse | null> {
  return null;
}
export function initTelemetry(_version: string): void {}
