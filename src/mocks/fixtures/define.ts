import type { z } from 'zod'

/**
 * Validates a fixture against its Zod schema at creation time. A fixture that
 * violates the contract throws on import, which fails every test using it (T9).
 * Returns the data typed as the schema's input.
 */
export function defineFixture<S extends z.ZodType>(
  name: string,
  schema: S,
  data: z.input<S>,
): z.input<S> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Fixture "${name}" no cumple su esquema Zod: ${detail}`)
  }
  return data
}
