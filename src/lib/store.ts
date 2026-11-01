export type Listener<T> = (state: T) => void;

export interface Store<T> {
  get(): T;
  set(next: T): void;
  update(patch: Partial<T>): void;
  /** Calls the listener now and on every change. Returns an unsubscribe. */
  subscribe(listener: Listener<T>): () => void;
}

export const createStore = <T extends object>(initial: T): Store<T> => {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  const emit = () => listeners.forEach((listener) => listener(state));
  return {
    get: () => state,
    set(next) {
      state = next;
      emit();
    },
    update(patch) {
      state = { ...state, ...patch };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
};
