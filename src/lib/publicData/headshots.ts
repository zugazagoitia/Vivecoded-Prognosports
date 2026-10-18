import { z } from 'zod'
import { OPENF1_BASE_URL } from './openf1'
import { parseResponse } from './schemas'
import { sharedQueue, type RequestQueue } from './queue'

/** The only image host accepted (it is also the only one allowed in `img-src`). */
export const HEADSHOT_HOST = 'media.formula1.com'

const headshotsSchema = z.array(
  z.object({
    name_acronym: z.string().nullable(),
    headshot_url: z.string().nullable().optional(),
  }),
)

/** Driver code -> headshot URL, from OpenF1's latest session. Licence not cleared: flag-gated. */
export async function fetchHeadshots({
  signal,
  queue = sharedQueue,
}: { signal?: AbortSignal; queue?: RequestQueue } = {}): Promise<Map<string, string>> {
  const url = `${OPENF1_BASE_URL}/drivers?session_key=latest`
  const rows = await parseResponse(await queue.get(url, signal), headshotsSchema, url, signal)
  const out = new Map<string, string>()
  for (const r of rows) {
    if (!r.name_acronym || !r.headshot_url) continue
    try {
      const u = new URL(r.headshot_url)
      if (u.protocol === 'https:' && u.hostname === HEADSHOT_HOST) out.set(r.name_acronym, u.href)
    } catch {
      // Malformed URL: that driver keeps the avatar.
    }
  }
  return out
}
