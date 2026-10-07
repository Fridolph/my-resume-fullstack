async function withErrorHandler<T>(
  fn: () => Promise<T>,
  handler: string | ((error: unknown) => void),
): Promise<T | null> {
  try {
    return await fn()
  }
  catch (error) {
    if (typeof handler === 'function') {
      handler(error)
    }
    else {
      console.error(handler, error)
    }
    return null
  }
}

export { withErrorHandler }
