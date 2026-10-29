class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    void callback;
  }
  observe(): void {
    // Intentionally empty mock implementation
  }
  unobserve(): void {
    // Intentionally empty mock implementation
  }
  disconnect(): void {
    // Intentionally empty mock implementation
  }
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
if (typeof window !== 'undefined') {
  (window as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}
