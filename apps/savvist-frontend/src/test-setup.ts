class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as any;
if (typeof window !== 'undefined') {
  (window as any).ResizeObserver = ResizeObserverMock;
}
