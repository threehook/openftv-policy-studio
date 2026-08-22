import { useCallback, useRef, useState } from 'react'

export interface FileTypeOption {
  description: string
  accept: Record<string, string[]>
}

interface UseFileEditorOptions {
  initialContent: string
  defaultFileName: string
  types: FileTypeOption[]
}

function openViaInput(types: FileTypeOption[]): Promise<{ name: string; content: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = types.flatMap((t) => Object.values(t.accept).flat()).join(',')
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, content: String(reader.result ?? '') })
      reader.readAsText(file)
    }
    input.click()
  })
}

function downloadAsFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function useFileEditor({ initialContent, defaultFileName, types }: UseFileEditorOptions) {
  const [content, setContentState] = useState(initialContent)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleRef = useRef<FileSystemFileHandle | null>(null)
  const savedContentRef = useRef(initialContent)

  const setContent = useCallback((value: string) => {
    setContentState(value)
    setDirty(value !== savedContentRef.current)
  }, [])

  const newFile = useCallback(() => {
    handleRef.current = null
    setFileName(null)
    savedContentRef.current = ''
    setContentState('')
    setDirty(false)
    setError(null)
  }, [])

  const open = useCallback(async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      let handles: FileSystemFileHandle[]
      try {
        handles = await window.showOpenFilePicker({ types })
      } catch (err) {
        if (!isAbortError(err)) setError(`Couldn't open file: ${errorMessage(err)}`)
        return
      }
      try {
        const file = await handles[0].getFile()
        const text = await file.text()
        handleRef.current = handles[0]
        setFileName(handles[0].name)
        savedContentRef.current = text
        setContentState(text)
        setDirty(false)
        setError(null)
      } catch (err) {
        setError(`Couldn't read file: ${errorMessage(err)}`)
      }
      return
    }
    const result = await openViaInput(types)
    if (!result) return
    handleRef.current = null
    setFileName(result.name)
    savedContentRef.current = result.content
    setContentState(result.content)
    setDirty(false)
    setError(null)
  }, [types])

  const save = useCallback(async () => {
    if (handleRef.current) {
      try {
        const writable = await handleRef.current.createWritable()
        await writable.write(content)
        await writable.close()
        savedContentRef.current = content
        setDirty(false)
        setError(null)
      } catch (err) {
        setError(`Couldn't save file: ${errorMessage(err)}`)
      }
      return
    }
    if (typeof window.showSaveFilePicker === 'function') {
      let handle: FileSystemFileHandle
      try {
        handle = await window.showSaveFilePicker({ suggestedName: defaultFileName, types })
      } catch (err) {
        if (!isAbortError(err)) setError(`Couldn't save file: ${errorMessage(err)}`)
        return
      }
      try {
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        handleRef.current = handle
        setFileName(handle.name)
        savedContentRef.current = content
        setDirty(false)
        setError(null)
      } catch (err) {
        setError(`Couldn't save file: ${errorMessage(err)}`)
      }
      return
    }
    downloadAsFile(content, fileName ?? defaultFileName)
    savedContentRef.current = content
    setDirty(false)
    setError(null)
  }, [content, defaultFileName, fileName, types])

  return { content, setContent, fileName, dirty, error, newFile, open, save }
}
