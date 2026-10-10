type Reporter = (error: unknown, context?: string) => void

let reporter: Reporter = (error, context) => console.error('[PrognoSports]', context ?? '', error)

/** T14 plugs the real logger here. */
export function setErrorReporter(r: Reporter): void {
  reporter = r
}

export function reportError(error: unknown, context?: string): void {
  reporter(error, context)
}
