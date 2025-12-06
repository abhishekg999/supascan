export interface Event<T extends string, D> {
  type: T;
  data: D;
}
