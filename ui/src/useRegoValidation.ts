import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://localhost:8787'

export interface RegoDiagnostic {
  message: string
  severity: 'error' | 'warning' | 'info'
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export function useRegoValidation(code: string, schema: string) {
  const [diagnostics, setDiagnostics] = useState<RegoDiagnostic[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/rego/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, schema, filename: 'policy.rego' }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`API responded with ${res.status}`)
          return res.json()
        })
        .then((data) => {
          setDiagnostics(data?.diagnostics ?? [])
          setError(null)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setDiagnostics([])
          setError(`Cannot reach validation API at ${API_BASE_URL} — is it running?`)
        })
    }, 400)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [code, schema])

  return { diagnostics, error }
}
