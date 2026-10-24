if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = function ResizeObserver(_callback: any) {
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {},
    };
  } as any;
}
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  (window as any).ResizeObserver = globalThis.ResizeObserver;
}
