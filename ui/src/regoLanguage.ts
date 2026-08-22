import type { Monaco } from '@monaco-editor/react'

export const REGO_LANGUAGE_ID = 'rego'

const KEYWORDS = [
  'package',
  'import',
  'as',
  'default',
  'else',
  'not',
  'some',
  'every',
  'in',
  'with',
  'if',
  'contains',
  'true',
  'false',
  'null',
]

export function registerRegoLanguage(monaco: Monaco) {
  if (monaco.languages.getLanguages().some((l) => l.id === REGO_LANGUAGE_ID)) return

  monaco.languages.register({ id: REGO_LANGUAGE_ID, extensions: ['.rego'] })

  monaco.languages.setLanguageConfiguration(REGO_LANGUAGE_ID, {
    comments: { lineComment: '#' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
    ],
  })

  monaco.languages.setMonarchTokensProvider(REGO_LANGUAGE_ID, {
    keywords: KEYWORDS,
    operators: [':=', '==', '!=', '<=', '>=', '<', '>', '=', '|'],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [
          /[a-zA-Z_][\w]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/\d+(\.\d+)?/, 'number'],
        [/[{}()[\]]/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],
      ],
    },
  })
}
