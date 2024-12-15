// Get the API URL from environment variables
export const getApiUrl = () => {
  // In development, we use the proxy configured in vite.config.ts
  if (import.meta.env.DEV) {
    return ''
  }
  
  // In production, we use the full URL from environment variables
  return import.meta.env.VITE_API_URL || ''
}

// Helper function to build API URLs
export const buildApiUrl = (path: string) => {
  const baseUrl = getApiUrl()
  return `${baseUrl}${path}`
}
