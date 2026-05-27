package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAppProxyRefererTarget(t *testing.T) {
	request := httptest.NewRequest("GET", "http://127.0.0.1:8788/_next/static/chunks/app.js", nil)
	request.Header.Set("Referer", "http://127.0.0.1:8788/peer/100.84.93.114%3A8787/app-proxy/8788/")

	hostPort, prefix, ok := appProxyRefererTarget(request)
	if !ok {
		t.Fatal("expected app-proxy referer to produce a fallback target")
	}
	if hostPort != "100.84.93.114:8787" {
		t.Fatalf("hostPort = %q, want %q", hostPort, "100.84.93.114:8787")
	}
	if prefix != "/app-proxy/8788" {
		t.Fatalf("prefix = %q, want %q", prefix, "/app-proxy/8788")
	}
}

func TestAppProxyRefererTargetRejectsNonPeerReferer(t *testing.T) {
	request := httptest.NewRequest("GET", "http://127.0.0.1:8788/_next/static/chunks/app.js", nil)
	request.Header.Set("Referer", "http://127.0.0.1:8788/status")

	if _, _, ok := appProxyRefererTarget(request); ok {
		t.Fatal("expected non-peer referer to be rejected")
	}
}

func TestAppProxyCookieTarget(t *testing.T) {
	request := httptest.NewRequest("GET", "http://127.0.0.1:8788/comfy/api/object_info", nil)
	request.AddCookie(&http.Cookie{
		Name:  appProxyContextCookie,
		Value: encodeAppProxyContext("100.84.93.114:8787", "/app-proxy/8788"),
	})

	hostPort, prefix, ok := appProxyCookieTarget(request)
	if !ok {
		t.Fatal("expected app-proxy cookie to produce a fallback target")
	}
	if hostPort != "100.84.93.114:8787" {
		t.Fatalf("hostPort = %q, want %q", hostPort, "100.84.93.114:8787")
	}
	if prefix != "/app-proxy/8788" {
		t.Fatalf("prefix = %q, want %q", prefix, "/app-proxy/8788")
	}
}

func TestRewritePeerRootHTML(t *testing.T) {
	html := `<script type="module" src="/mobile/assets/index.js"></script><link rel="stylesheet" href='/mobile/assets/index.css'>`
	rewritten := rewritePeerRootHTML(html, "100.84.93.114:8787", "/app-proxy/8788")

	if rewritten == html {
		t.Fatal("expected root asset paths to be rewritten")
	}
	wantScript := `src="/peer/100.84.93.114:8787/app-proxy/8788/mobile/assets/index.js"`
	if !strings.Contains(rewritten, wantScript) {
		t.Fatalf("rewritten HTML missing %q:\n%s", wantScript, rewritten)
	}
	wantStyle := `href='/peer/100.84.93.114:8787/app-proxy/8788/mobile/assets/index.css'`
	if !strings.Contains(rewritten, wantStyle) {
		t.Fatalf("rewritten HTML missing %q:\n%s", wantStyle, rewritten)
	}
}
