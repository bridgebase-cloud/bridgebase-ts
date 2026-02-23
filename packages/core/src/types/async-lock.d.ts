declare module "async-lock" {
  class AsyncLock {
    acquire<T = unknown>(
      key: string,
      fn: () => Promise<T> | T,
      options?: { timeout?: number }
    ): Promise<T>;
  }

  export = AsyncLock;
}
