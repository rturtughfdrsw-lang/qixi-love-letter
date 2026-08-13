export function rotateStack(order) {
  return order.length < 2 ? [...order] : [...order.slice(1), order[0]];
}
