import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import { configureCedarEditors } from '@cedar-policy/cedar-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CedarPolicyWorker from '@cedar-policy/cedar-monaco-editor/workers/cedar-policy.worker?worker'
import CedarSchemaWorker from '@cedar-policy/cedar-monaco-editor/workers/cedar-schema.worker?worker'
import CedarJsonWorker from '@cedar-policy/cedar-monaco-editor/workers/cedar-json.worker?worker'
import './index.css'
import App from './App.tsx'

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  },
}

loader.config({ monaco })

configureCedarEditors({
  monaco,
  policyWorkerFactory: () => new CedarPolicyWorker(),
  schemaWorkerFactory: () => new CedarSchemaWorker(),
  jsonWorkerFactory: () => new CedarJsonWorker(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
