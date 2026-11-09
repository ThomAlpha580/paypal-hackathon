import { getQuotaError } from "@/lib/service"

export const isActiveAlphaRun = (run: API.AlphaChatRun | null) =>
  run?.status === "queued" || run?.status === "running"

export type AlphaDelta = {
  message_id: string
  revision: number
  start_offset: number
  text: string
  updated_at: string
}

export function mergeAlphaMessages(
  current: API.AlphaChatMessage[],
  incoming: API.AlphaChatMessage[]
) {
  const rows = new Map(current.map((row) => [row.id, row]))
  for (const row of incoming) {
    const previous = rows.get(row.id)
    if (!previous || row.revision > previous.revision) rows.set(row.id, row)
  }
  // Callers pass earlier turns first. seq is only ordered within a run.
  const runOrder = new Map<string, number>()
  for (const row of rows.values()) {
    if (!runOrder.has(row.run_id)) runOrder.set(row.run_id, runOrder.size)
  }
  return [...rows.values()].sort(
    (a, b) => runOrder.get(a.run_id)! - runOrder.get(b.run_id)! || a.seq - b.seq
  )
}

export function replaceAlphaSnapshot(
  rows: API.AlphaChatMessage[],
  runId: string,
  messages: API.AlphaChatMessage[]
) {
  return mergeAlphaMessages(
    rows.filter((row) => row.run_id !== runId),
    messages
  )
}

export function applyAlphaDelta(
  rows: API.AlphaChatMessage[],
  delta: AlphaDelta
) {
  const message = rows.find((row) => row.id === delta.message_id)
  if (!message) throw new Error("stream_gap")
  if (delta.revision <= message.revision) return rows
  // Backend offsets use Python Unicode code points, including emoji.
  const content = Array.from(message.content ?? "")
  if (delta.start_offset > content.length) throw new Error("stream_gap")
  const overlap = Math.max(0, content.length - delta.start_offset)
  return rows.map((row) =>
    row.id === message.id
      ? {
          ...row,
          content:
            content.join("") + Array.from(delta.text).slice(overlap).join(""),
          revision: delta.revision,
          updated_at: delta.updated_at,
        }
      : row
  )
}

export function alphaErrorKey(error: unknown): string {
  if (getQuotaError(error)) return "alpha.errors.quota"
  const candidate = error as {
    data?: { detail?: unknown }
    response?: { status?: number }
  }
  if (
    candidate?.response?.status === 401 ||
    candidate?.response?.status === 403
  )
    return "alpha.errors.auth"
  if (candidate?.response?.status === 402)
    return "alpha.errors.paymentRequired"
  const detail = candidate?.data?.detail
  if (detail === "chat_busy") return "alpha.errors.busy"
  if (detail === "chat_not_found" || detail === "chat_deleted")
    return "alpha.errors.notFound"
  return "alpha.errors.generic"
}

const pending = new Map<string, { content: string; request_id: string }>()
export function pendingAlphaRequest(
  userId: string,
  chatId: string,
  content: string
) {
  const key = `easystock.alpha.pending.${userId}.${chatId}`
  let previous = pending.get(key)
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null")
    if (
      saved &&
      typeof saved === "object" &&
      "content" in saved &&
      "request_id" in saved &&
      typeof saved.content === "string" &&
      typeof saved.request_id === "string"
    ) {
      previous = { content: saved.content, request_id: saved.request_id }
    }
  } catch {
    /* Storage can be disabled; memory still protects retries. */
  }
  const request =
    previous?.content === content
      ? previous
      : { content, request_id: crypto.randomUUID() }
  pending.set(key, request)
  try {
    sessionStorage.setItem(key, JSON.stringify(request))
  } catch {
    /* Memory fallback. */
  }
  return request
}

export function clearAlphaRequest(userId: string, chatId: string) {
  const key = `easystock.alpha.pending.${userId}.${chatId}`
  pending.delete(key)
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* Storage can be disabled. */
  }
}

export function safeAlphaSource(value: unknown) {
  try {
    const url = new URL(String(value))
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null
  } catch {
    return null
  }
}
