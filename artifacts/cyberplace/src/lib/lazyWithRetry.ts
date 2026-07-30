import { lazy, ComponentType } from "react";

/**
 * Robust wrapper around React.lazy that automatically handles dynamic import failures.
 * This prevents 'Failed to fetch dynamically imported module' errors caused by deployment chunk hash changes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageRefreshedKey = "page_chunk_retry_refreshed";
    try {
      const component = await factory();
      // Reset the flag on successful load
      sessionStorage.removeItem(pageRefreshedKey);
      return component;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.name === "TypeError";

      if (isChunkError) {
        const hasBeenRefreshed = sessionStorage.getItem(pageRefreshedKey) === "true";
        if (!hasBeenRefreshed) {
          sessionStorage.setItem(pageRefreshedKey, "true");
          window.location.reload();
          return new Promise(() => {}); // never resolves, page reloads
        }
      }
      throw error;
    }
  });
}
