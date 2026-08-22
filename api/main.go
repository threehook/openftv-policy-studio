package main

import (
	"encoding/json"
	"log"
	"net/http"

	"openftv-policy-studio/internal/rego"
)

type validateRequest struct {
	Code     string `json:"code"`
	Filename string `json:"filename"`
	Schema   string `json:"schema"`
}

type validateResponse struct {
	Diagnostics []rego.Diagnostic `json:"diagnostics"`
}

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func handleValidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req validateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	diagnostics := rego.Validate(req.Filename, req.Code, req.Schema)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(validateResponse{Diagnostics: diagnostics})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", withCORS(handleHealth))
	mux.HandleFunc("/api/rego/validate", withCORS(handleValidate))

	const addr = ":8787"
	log.Printf("policy-studio api listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
