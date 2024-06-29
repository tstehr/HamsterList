import deepFreeze, { DeepReadonly } from 'deep-freeze'

export default function updateInArray<T, U extends { readonly id: T }>(
  arr: readonly U[],
  toUpdate: U,
  insertIfNotFound = false,
): DeepReadonly<U[]> {
  const index = arr.findIndex((arrEl) => arrEl.id == toUpdate.id)
  if (index === -1) {
    if (!insertIfNotFound) {
      throw new Error('Element is not in array!')
    }
    const newArr = [...arr, toUpdate]
    return deepFreeze(newArr)
  }
  const newArr = [...arr]
  newArr.splice(index, 1, toUpdate)
  return deepFreeze(newArr)
}
