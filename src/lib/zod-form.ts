import type { TypedSchema } from 'vee-validate'
import type { z } from 'zod'

/**
 * Zod 4 -> VeeValidate adapter (`@vee-validate/zod` only supports Zod 3).
 * Usage: `useForm({ validationSchema: toTypedSchema(schema) })`.
 */
export function toTypedSchema<S extends z.ZodType>(
  schema: S,
): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      const byPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.')
        byPath.set(path, [...(byPath.get(path) ?? []), issue.message])
      }
      return { errors: [...byPath].map(([path, errors]) => ({ path, errors })) }
    },
  }
}
