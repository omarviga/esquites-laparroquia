// Client-safe stub for @tanstack/start-storage-context
// The real module uses node:async_hooks.AsyncLocalStorage which is
// not available in the browser. All client code uses createIsomorphicFn
// with a .client() variant that never calls these, but the top-level
// import still triggers the module load.

const noop = () => {
  throw new Error(
    "@tanstack/start-storage-context is server-only and should not be called on the client."
  );
};

export const getStartContext: any = noop;
export const runWithStartContext: any = noop;
