export function PartialType<T>(classRef: new (...args: any[]) => T): new (...args: any[]) => Partial<T> {
  return class {} as any;
}

