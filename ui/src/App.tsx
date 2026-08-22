import { useEffect, useRef, useState } from 'react'
import { CedarPolicyEditor, CedarSchemaEditor } from '@cedar-policy/cedar-monaco-editor'
import Editor from '@monaco-editor/react'
import type { Monaco, OnMount, OnValidate } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useFileEditor } from './useFileEditor'
import type { FileTypeOption } from './useFileEditor'
import { registerRegoLanguage } from './regoLanguage'
import { useRegoValidation } from './useRegoValidation'
import './App.css'

type Language = 'cedar' | 'rego'
type UiTheme = 'dark' | 'light'

interface Diagnostic {
  message: string
  severity: 'error' | 'warning' | 'info'
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

const DEFAULT_SCHEMA = `entity User;
entity Document {
  owner: User,
};

action ReadDocument, WriteDocument appliesTo {
  principal: [User],
  resource: [Document],
};
`

const DEFAULT_POLICY = `permit(
  principal,
  action == Action::"ReadDocument",
  resource
) when {
  resource.owner == principal
};
`

const DEFAULT_REGO = `package example

import rego.v1

default allow := false

allow if {
	input.user == "admin"
}
`

const DEFAULT_REGO_SCHEMA = `{
  "type": "object",
  "properties": {
    "user": { "type": "string" }
  },
  "additionalProperties": false
}
`

const SCHEMA_FILE_TYPES: FileTypeOption[] = [
  { description: 'Cedar schema', accept: { 'text/plain': ['.cedarschema', '.txt'] } },
]

const POLICY_FILE_TYPES: FileTypeOption[] = [
  { description: 'Cedar policy', accept: { 'text/plain': ['.cedar', '.txt'] } },
]

const REGO_FILE_TYPES: FileTypeOption[] = [
  { description: 'Rego policy', accept: { 'text/plain': ['.rego', '.txt'] } },
]

const REGO_SCHEMA_FILE_TYPES: FileTypeOption[] = [
  { description: 'Input schema', accept: { 'application/json': ['.schema.json', '.json'] } },
]

function markerSeverityToDiagnosticSeverity(severity: number): Diagnostic['severity'] {
  if (severity >= 8) return 'error'
  if (severity >= 4) return 'warning'
  return 'info'
}

function configureJsonDefaults(monaco: Monaco) {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaRequest: 'ignore',
  })
}

function NewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 1.5h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9 1.5v3h3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7.5v5M5.5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3.17a1.5 1.5 0 0 1 1.06.44l.83.83A1.5 1.5 0 0 0 9.12 3.7H13a1.5 1.5 0 0 1 1.5 1.5v.3H2.34l-1.2 6.02a.5.5 0 0 1-.98-.2L1.5 5.6V3.5Z"
        fill="currentColor"
      />
      <path
        d="M1.94 12.7 3.2 6.5H15l-1.26 6.28A1.5 1.5 0 0 1 12.27 14H3.42a1.5 1.5 0 0 1-1.48-1.3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 1.5h7.5L14 5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14V3a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M5 2v3.5h5V2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 9.5h7v5h-7v-5Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.2v1.6M8 13.2v1.6M14.8 8h-1.6M2.8 8H1.2M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4 3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.7A5.8 5.8 0 0 1 6.3 2.5a5.8 5.8 0 1 0 7.2 7.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DiagnosticsList({
  title,
  diagnostics,
  error,
}: {
  title: string
  diagnostics: Diagnostic[]
  error?: string | null
}) {
  return (
    <div className="diagnostics">
      <h2>{title}</h2>
      {error ? (
        <p className="diagnostics-error">{error}</p>
      ) : diagnostics.length === 0 ? (
        <p className="ok">No issues</p>
      ) : (
        <ul>
          {diagnostics.map((d, i) => (
            <li key={i} className={d.severity}>
              [{d.severity}] {d.startLineNumber}:{d.startColumn} — {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FileGroup({
  label,
  fileName,
  dirty,
  error,
  onNew,
  onOpen,
  onSave,
}: {
  label: string
  fileName: string | null
  dirty: boolean
  error?: string | null
  onNew: () => void
  onOpen: () => void
  onSave: () => void
}) {
  return (
    <section className="file-group">
      <h2>{label}</h2>
      <p className="file-name">
        {fileName ?? 'Untitled'}
        {dirty && <span className="dirty-dot" title="Unsaved changes" />}
      </p>
      {error && <p className="file-error">{error}</p>}
      <button type="button" onClick={onNew}>
        <NewIcon />
        New
      </button>
      <button type="button" onClick={onOpen}>
        <OpenIcon />
        Open…
      </button>
      <button type="button" onClick={onSave}>
        <SaveIcon />
        Save
      </button>
    </section>
  )
}

function App() {
  const [language, setLanguage] = useState<Language>('cedar')
  const [uiTheme, setUiTheme] = useState<UiTheme>('dark')
  const monacoTheme = uiTheme === 'dark' ? 'vs-dark' : 'vs'

  const schemaFile = useFileEditor({
    initialContent: DEFAULT_SCHEMA,
    defaultFileName: 'schema.cedarschema',
    types: SCHEMA_FILE_TYPES,
  })
  const policyFile = useFileEditor({
    initialContent: DEFAULT_POLICY,
    defaultFileName: 'policy.cedar',
    types: POLICY_FILE_TYPES,
  })
  const regoFile = useFileEditor({
    initialContent: DEFAULT_REGO,
    defaultFileName: 'policy.rego',
    types: REGO_FILE_TYPES,
  })
  const regoSchemaFile = useFileEditor({
    initialContent: DEFAULT_REGO_SCHEMA,
    defaultFileName: 'input.schema.json',
    types: REGO_SCHEMA_FILE_TYPES,
  })

  const [schemaDiagnostics, setSchemaDiagnostics] = useState<Diagnostic[]>([])
  const [policyDiagnostics, setPolicyDiagnostics] = useState<Diagnostic[]>([])
  const [regoSchemaDiagnostics, setRegoSchemaDiagnostics] = useState<Diagnostic[]>([])
  const { diagnostics: regoDiagnostics, error: regoValidationError } = useRegoValidation(
    regoFile.content,
    regoSchemaFile.content,
  )

  const schemaPaneRef = useRef<HTMLDivElement>(null)
  const policyPaneRef = useRef<HTMLDivElement>(null)
  const regoSchemaPaneRef = useRef<HTMLDivElement>(null)
  const regoPaneRef = useRef<HTMLDivElement>(null)
  const schemaSaveRef = useRef(schemaFile.save)
  const policySaveRef = useRef(policyFile.save)
  const regoSchemaSaveRef = useRef(regoSchemaFile.save)
  const regoSaveRef = useRef(regoFile.save)
  schemaSaveRef.current = schemaFile.save
  policySaveRef.current = policyFile.save
  regoSchemaSaveRef.current = regoSchemaFile.save
  regoSaveRef.current = regoFile.save

  const handleRegoSchemaValidate: OnValidate = (markers) => {
    setRegoSchemaDiagnostics(
      markers.map((m) => ({
        message: m.message,
        severity: markerSeverityToDiagnosticSeverity(m.severity),
        startLineNumber: m.startLineNumber,
        startColumn: m.startColumn,
        endLineNumber: m.endLineNumber,
        endColumn: m.endColumn,
      })),
    )
  }

  const regoModelRef = useRef<editor.ITextModel | null>(null)
  const regoMonacoRef = useRef<Monaco | null>(null)

  const handleRegoMount: OnMount = (editorInstance, monacoInstance) => {
    regoModelRef.current = editorInstance.getModel()
    regoMonacoRef.current = monacoInstance
  }

  useEffect(() => {
    const model = regoModelRef.current
    const monacoInstance = regoMonacoRef.current
    if (!model || !monacoInstance) return
    monacoInstance.editor.setModelMarkers(
      model,
      'rego',
      regoDiagnostics.map((d) => ({
        severity:
          d.severity === 'error'
            ? monacoInstance.MarkerSeverity.Error
            : d.severity === 'warning'
              ? monacoInstance.MarkerSeverity.Warning
              : monacoInstance.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.startLineNumber,
        startColumn: d.startColumn,
        endLineNumber: d.endLineNumber,
        endColumn: d.endColumn,
      })),
    )
  }, [regoDiagnostics])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return
      const active = document.activeElement
      if (schemaPaneRef.current?.contains(active)) {
        e.preventDefault()
        schemaSaveRef.current()
      } else if (policyPaneRef.current?.contains(active)) {
        e.preventDefault()
        policySaveRef.current()
      } else if (regoSchemaPaneRef.current?.contains(active)) {
        e.preventDefault()
        regoSchemaSaveRef.current()
      } else if (regoPaneRef.current?.contains(active)) {
        e.preventDefault()
        regoSaveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="app-shell" data-theme={uiTheme}>
      <header className="app-header">
        <div className="app-header-title">
          <h1>Policy Studio</h1>
          <p className="tagline">Author and validate Cedar &amp; Rego authorization policies</p>
        </div>
        <div className="app-header-controls">
          <div className="lang-switch" role="tablist" aria-label="Policy language">
            <button
              type="button"
              role="tab"
              aria-selected={language === 'cedar'}
              className={language === 'cedar' ? 'active' : ''}
              onClick={() => setLanguage('cedar')}
            >
              Cedar/AWS
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={language === 'rego'}
              className={language === 'rego' ? 'active' : ''}
              onClick={() => setLanguage('rego')}
            >
              Rego/OPA
            </button>
          </div>
          <div className="theme-switch" role="tablist" aria-label="Color theme">
            <button
              type="button"
              role="tab"
              aria-selected={uiTheme === 'dark'}
              className={uiTheme === 'dark' ? 'active' : ''}
              onClick={() => setUiTheme('dark')}
              title="Dark background"
            >
              <MoonIcon />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={uiTheme === 'light'}
              className={uiTheme === 'light' ? 'active' : ''}
              onClick={() => setUiTheme('light')}
              title="Light background"
            >
              <SunIcon />
            </button>
          </div>
        </div>
      </header>
      <div className="app-body">
        <nav className="sidebar">
          {language === 'cedar' ? (
            <>
              <FileGroup
                label="Schema"
                fileName={schemaFile.fileName}
                dirty={schemaFile.dirty}
                error={schemaFile.error}
                onNew={schemaFile.newFile}
                onOpen={schemaFile.open}
                onSave={schemaFile.save}
              />
              <FileGroup
                label="Policy"
                fileName={policyFile.fileName}
                dirty={policyFile.dirty}
                error={policyFile.error}
                onNew={policyFile.newFile}
                onOpen={policyFile.open}
                onSave={policyFile.save}
              />
            </>
          ) : (
            <>
              <FileGroup
                label="Rego Schema"
                fileName={regoSchemaFile.fileName}
                dirty={regoSchemaFile.dirty}
                error={regoSchemaFile.error}
                onNew={regoSchemaFile.newFile}
                onOpen={regoSchemaFile.open}
                onSave={regoSchemaFile.save}
              />
              <FileGroup
                label="Rego Policy"
                fileName={regoFile.fileName}
                dirty={regoFile.dirty}
                error={regoFile.error}
                onNew={regoFile.newFile}
                onOpen={regoFile.open}
                onSave={regoFile.save}
              />
            </>
          )}
        </nav>
        <main className="studio">
          {language === 'cedar' ? (
            <>
              <div className="pane" ref={schemaPaneRef}>
                <h2>Schema</h2>
                <CedarSchemaEditor
                  value={schemaFile.content}
                  onChange={schemaFile.setContent}
                  onValidate={setSchemaDiagnostics}
                  theme={monacoTheme}
                  height="60vh"
                />
                <DiagnosticsList title="Schema diagnostics" diagnostics={schemaDiagnostics} />
              </div>
              <div className="pane" ref={policyPaneRef}>
                <h2>Policy</h2>
                <CedarPolicyEditor
                  value={policyFile.content}
                  onChange={policyFile.setContent}
                  schema={schemaFile.content}
                  onValidate={setPolicyDiagnostics}
                  theme={monacoTheme}
                  height="60vh"
                />
                <DiagnosticsList title="Policy diagnostics" diagnostics={policyDiagnostics} />
              </div>
            </>
          ) : (
            <>
              <div className="pane" ref={regoSchemaPaneRef}>
                <h2>Input Schema</h2>
                <Editor
                  height="60vh"
                  theme={monacoTheme}
                  language="json"
                  value={regoSchemaFile.content}
                  onChange={(value) => regoSchemaFile.setContent(value ?? '')}
                  beforeMount={configureJsonDefaults}
                  onValidate={handleRegoSchemaValidate}
                />
                <DiagnosticsList title="Schema diagnostics" diagnostics={regoSchemaDiagnostics} />
              </div>
              <div className="pane" ref={regoPaneRef}>
                <h2>Rego Policy</h2>
                <Editor
                  height="60vh"
                  theme={monacoTheme}
                  language="rego"
                  value={regoFile.content}
                  onChange={(value) => regoFile.setContent(value ?? '')}
                  beforeMount={registerRegoLanguage}
                  onMount={handleRegoMount}
                />
                <DiagnosticsList
                  title="Rego diagnostics"
                  diagnostics={regoDiagnostics}
                  error={regoValidationError}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
