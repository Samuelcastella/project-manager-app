const idempotencyStore = new Map<string, unknown>();

export function getIdempotentResult<T>(key: string): T | undefined {
  return idempotencyStore.get(key) as T | undefined;
}

export function setIdempotentResult<T>(key: string, value: T): void {
  idempotencyStore.set(key, value);
}

export function buildIdempotencyKey(parts: string[]): string {
  return parts.join("::");
}
