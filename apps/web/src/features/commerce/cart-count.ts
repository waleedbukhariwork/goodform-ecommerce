type Listener = (total: number) => void;
const listeners = new Set<Listener>();

export function cartQuantity(items: { quantity: number }[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function publishCartQuantity(items: { quantity: number }[]) {
  const total = cartQuantity(items);
  for (const listener of listeners) listener(total);
}

export function subscribeCartQuantity(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
