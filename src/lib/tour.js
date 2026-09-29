export function tourNext(index, steps) {
  return Math.min(index + 1, steps.length - 1)
}

export function tourBack(index, _steps) {
  return Math.max(index - 1, 0)
}

export function tourSkip(steps) {
  return steps.length - 1
}

export function isLastStep(index, steps) {
  return index === steps.length - 1
}
