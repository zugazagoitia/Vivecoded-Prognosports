/** T6 plugs the real flag store with `setFlagChecker`. Default: everything enabled. */
let isEnabled: (flag: string) => boolean = () => true

export function setFlagChecker(fn: (flag: string) => boolean): void {
  isEnabled = fn
}

export function isFlagEnabled(flag: string): boolean {
  return isEnabled(flag)
}
