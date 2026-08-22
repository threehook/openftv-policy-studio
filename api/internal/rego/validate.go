package rego

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/open-policy-agent/opa/v1/ast"
)

type Diagnostic struct {
	Message         string `json:"message"`
	Severity        string `json:"severity"`
	StartLineNumber int    `json:"startLineNumber"`
	StartColumn     int    `json:"startColumn"`
	EndLineNumber   int    `json:"endLineNumber"`
	EndColumn       int    `json:"endColumn"`
}

// Validate parses and compiles a Rego module. When schemaJSON is a non-empty,
// well-formed JSON Schema document, it is used to type-check references to
// `input` during compilation (e.g. catching input.usr where the schema only
// declares input.user). Malformed schema JSON is ignored rather than
// reported here, since the schema editor validates its own JSON syntax.
func Validate(filename, code, schemaJSON string) []Diagnostic {
	if filename == "" {
		filename = "policy.rego"
	}

	module, err := ast.ParseModule(filename, code)
	if err != nil {
		return errorsToDiagnostics(err)
	}
	if module == nil {
		return []Diagnostic{}
	}

	compiler := ast.NewCompiler()
	if schema, ok := parseSchema(schemaJSON); ok {
		schemaSet := ast.NewSchemaSet()
		schemaSet.Put(ast.SchemaRootRef, schema)
		compiler = compiler.WithSchemas(schemaSet)
	}

	compiler.Compile(map[string]*ast.Module{filename: module})
	if compiler.Failed() {
		return toDiagnostics(compiler.Errors)
	}

	return []Diagnostic{}
}

func parseSchema(schemaJSON string) (any, bool) {
	if strings.TrimSpace(schemaJSON) == "" {
		return nil, false
	}
	var schema any
	if err := json.Unmarshal([]byte(schemaJSON), &schema); err != nil {
		return nil, false
	}
	return schema, true
}

func errorsToDiagnostics(err error) []Diagnostic {
	var errs ast.Errors
	if errors.As(err, &errs) {
		return toDiagnostics(errs)
	}
	return []Diagnostic{{
		Message:         err.Error(),
		Severity:        "error",
		StartLineNumber: 1,
		StartColumn:     1,
		EndLineNumber:   1,
		EndColumn:       1,
	}}
}

func toDiagnostics(errs ast.Errors) []Diagnostic {
	diagnostics := make([]Diagnostic, 0, len(errs))
	for _, e := range errs {
		line, col := 1, 1
		if e.Location != nil {
			line, col = e.Location.Row, e.Location.Col
		}
		diagnostics = append(diagnostics, Diagnostic{
			Message:         e.Message,
			Severity:        "error",
			StartLineNumber: line,
			StartColumn:     col,
			EndLineNumber:   line,
			EndColumn:       col + 1,
		})
	}
	return diagnostics
}
