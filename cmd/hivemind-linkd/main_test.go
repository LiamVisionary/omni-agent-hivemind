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

func TestAppProxyRefererTargetUsesRootContextQuery(t *testing.T) {
	request := httptest.NewRequest("GET", "http://127.0.0.1:8788/_next/static/chunks/app.js", nil)
	request.Header.Set("Referer", "http://127.0.0.1:8788/?"+appProxyContextQuery+"="+encodeAppProxyContext("100.84.93.114:8787", "/app-proxy/8788"))

	hostPort, prefix, ok := appProxyRefererTarget(request)
	if !ok {
		t.Fatal("expected app-proxy referer query to produce a fallback target")
	}
	if hostPort != "100.84.93.114:8787" {
		t.Fatalf("hostPort = %q, want %q", hostPort, "100.84.93.114:8787")
	}
	if prefix != "/app-proxy/8788" {
		t.Fatalf("prefix = %q, want %q", prefix, "/app-proxy/8788")
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
	html := `<script type="module" src="/mobile/assets/index.js"></script><link rel="stylesheet" href='/mobile/assets/index.css'><script src="/_next/static/chunks/app.js" async=""></script><script>self.__next_f.push([1,":HL[\"/_next/static/chunks/app.css\",\"style\"]"])</script>`
	rewritten := rewritePeerRootHTML(html, "100.84.93.114:8787", "/app-proxy/8788")

	if rewritten == html {
		t.Fatal("expected root asset paths to be rewritten")
	}
	wantScript := `src="/peer/100.84.93.114%3A8787/app-proxy/8788/mobile/assets/index.js"`
	if !strings.Contains(rewritten, wantScript) {
		t.Fatalf("rewritten HTML missing %q:\n%s", wantScript, rewritten)
	}
	wantStyle := `href='/peer/100.84.93.114%3A8787/app-proxy/8788/mobile/assets/index.css'`
	if !strings.Contains(rewritten, wantStyle) {
		t.Fatalf("rewritten HTML missing %q:\n%s", wantStyle, rewritten)
	}
	wantFlight := `\"/peer/100.84.93.114%3A8787/app-proxy/8788/_next/static/chunks/app.css`
	if !strings.Contains(rewritten, wantFlight) {
		t.Fatalf("rewritten HTML missing %q:\n%s", wantFlight, rewritten)
	}
	if strings.Contains(rewritten, `/_next/static/chunks/app.js" async=""`) {
		t.Fatalf("rewritten HTML should remove async from Next chunk scripts:\n%s", rewritten)
	}
}

func TestAppProxyRedirectPath(t *testing.T) {
	request := httptest.NewRequest("GET", "http://127.0.0.1:8788/peer/100.84.93.114%3A8787/app-proxy/8788/?tab=workbench", nil)
	request.Header.Set("Accept", "text/html")
	context := encodeAppProxyContext("100.84.93.114:8787", "/app-proxy/8788")

	if !shouldRedirectAppProxyHTML(request, "/app-proxy/8788/", "/app-proxy/8788") {
		t.Fatal("expected app-proxy HTML route to redirect to the app path")
	}
	wantRoot := "/?" + appProxyContextQuery + "=" + context + "&tab=workbench"
	if got := appProxyRedirectPath(request, "/app-proxy/8788/", "/app-proxy/8788"); got != wantRoot {
		t.Fatalf("redirect path = %q, want %q", got, wantRoot)
	}
	wantMobile := "/mobile/?" + appProxyContextQuery + "=" + context + "&tab=workbench"
	if got := appProxyRedirectPath(request, "/app-proxy/8788/mobile/", "/app-proxy/8788"); got != wantMobile {
		t.Fatalf("mobile redirect path = %q, want %q", got, wantMobile)
	}
}

func TestAppProxyRedirectRejectsStaticAssets(t *testing.T) {
	request := httptest.NewRequest("GET", "http://127.0.0.1:8788/peer/100.84.93.114%3A8787/app-proxy/8788/_next/static/chunks/app.js", nil)
	request.Header.Set("Accept", "application/javascript")

	if shouldRedirectAppProxyHTML(request, "/app-proxy/8788/_next/static/chunks/app.js", "/app-proxy/8788") {
		t.Fatal("expected static app-proxy asset to stay proxied")
	}
}
