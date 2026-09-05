export type BundleRecord = {
  skillId: string
  objectKey: string
  contentSha256: string
  storageFormat: string
}

async function sha256(value: Uint8Array) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", value))].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

// R2 remains private: it is reachable only through the Worker binding. The
// access boundary is the entitlement check, not a global key whose loss could
// make every publisher bundle unrecoverable.
export async function putBundle(input: { db: D1Database; bucket: R2Bucket; skillId: string; markdown: string }) {
  const bytes = new TextEncoder().encode(input.markdown)
  const objectKey = `bundles/${encodeURIComponent(input.skillId)}/${crypto.randomUUID()}.md`
  const contentSha256 = await sha256(bytes)
  await input.bucket.put(objectKey, bytes, { httpMetadata: { contentType: "text/markdown; charset=utf-8" }, customMetadata: { skillId: input.skillId, contentSha256, storageFormat: "r2-private-v1" } })
  await input.db.prepare(`INSERT INTO skill_bundles (skill_id, object_key, iv_base64, content_sha256, storage_format, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(skill_id) DO UPDATE SET object_key = excluded.object_key, iv_base64 = excluded.iv_base64, content_sha256 = excluded.content_sha256, storage_format = excluded.storage_format, updated_at = CURRENT_TIMESTAMP`)
    .bind(input.skillId, objectKey, "r2-private-v1", contentSha256, "r2-private-v1").run()
  return { objectKey, contentSha256 }
}

export async function getBundle(input: { db: D1Database; bucket: R2Bucket; skillId: string }) {
  const record = await input.db.prepare("SELECT skill_id AS skillId, object_key AS objectKey, content_sha256 AS contentSha256, storage_format AS storageFormat FROM skill_bundles WHERE skill_id = ?").bind(input.skillId).first<BundleRecord>()
  if (!record) return null
  if (record.storageFormat !== "r2-private-v1") throw new Error(`Bundle ${input.skillId} uses a legacy storage format and must be migrated`)
  const object = await input.bucket.get(record.objectKey)
  if (!object) throw new Error(`Bundle object is missing for ${input.skillId}`)
  const bytes = new Uint8Array(await object.arrayBuffer())
  if (await sha256(bytes) !== record.contentSha256) throw new Error(`Bundle integrity check failed for ${input.skillId}`)
  return new TextDecoder().decode(bytes)
}
