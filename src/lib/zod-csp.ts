import { z } from 'zod'

// Zod's JIT probes `new Function('')`, which a CSP without 'unsafe-eval' reports as a violation
// even though it is caught. Disable the JIT (T13). Must be imported before any schema is built.
z.config({ jitless: true })
