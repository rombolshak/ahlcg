const store = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => {
    store.set(key, value);
  },
  removeItem: key => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: index => Array.from(store.keys())[index] ?? null,
  get length() {
    return store.size;
  },
};

globalThis.localStorage = localStorageMock;
