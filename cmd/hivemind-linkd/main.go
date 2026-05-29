package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"time"

	"tailscale.com/client/local"
	"tailscale.com/tsnet"
)

const appProxyContextCookie = "hivemind_link_app_proxy"
const appProxyContextQuery = "__hive_app_proxy"

type config struct {
	hostname   string
	stateDir   string
	listenAddr string
	control    string
	target     string
	authKey    string
	controlURL string
}

func defaultHostname() string {
	host, err := os.Hostname()
	if err != nil || strings.TrimSpace(host) == "" {
		host = "machine"
	}
	clean := regexp.MustCompile(`[^a-zA-Z0-9-]+`).ReplaceAllString(strings.ToLower(host), "-")
	clean = strings.Trim(clean, "-")
	if clean == "" {
		clean = "machine"
	}
	return "hivemindos-" + clean
}

func defaultStateDir(hostname string) string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return filepath.Join(".hivemindos", "link", hostname)
	}
	return filepath.Join(home, ".hivemindos", "link", hostname)
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func parseConfig() config {
	hostname := env("HIVE_LINK_HOSTNAME", defaultHostname())
	cfg := config{}
	flag.StringVar(&cfg.hostname, "hostname", hostname, "Tailscale hostname for this HivemindOS Link node")
	flag.StringVar(&cfg.stateDir, "state-dir", env("HIVE_LINK_STATE_DIR", defaultStateDir(hostname)), "directory for embedded Tailscale state")
	flag.StringVar(&cfg.listenAddr, "listen", env("HIVE_LINK_LISTEN", ":8787"), "Tailnet listen address for the collector proxy")
	flag.StringVar(&cfg.control, "control", env("HIVE_LINK_CONTROL", "127.0.0.1:8788"), "local control/status API address")
	flag.StringVar(&cfg.target, "target", env("HIVE_LINK_TARGET", "http://127.0.0.1:8787"), "local collector URL to proxy")
	flag.StringVar(&cfg.authKey, "auth-key", env("HIVE_LINK_AUTH_KEY", ""), "optional Tailscale auth key for headless linking")
	flag.StringVar(&cfg.controlURL, "tailscale-control-url", env("HIVE_LINK_TAILSCALE_CONTROL_URL", ""), "optional custom Tailscale control URL")
	flag.Parse()
	return cfg
}

func newProxy(target *url.URL, lc *local.Client) http.Handler {
	proxy := httputil.NewSingleHostReverseProxy(target)
	original := proxy.Director
	proxy.Director = func(r *http.Request) {
		original(r)
		r.Header.Del("x-hivemind-link-user")
		r.Header.Del("x-hivemind-link-node")
		r.Header.Del("x-tailscale-user")
		r.Header.Del("x-tailscale-node")
		if lc == nil {
			return
		}
		who, err := lc.WhoIs(r.Context(), r.RemoteAddr)
		if err != nil {
			return
		}
		r.Header.Set("x-hivemind-link-user", who.UserProfile.LoginName)
		r.Header.Set("x-tailscale-user", who.UserProfile.LoginName)
		if who.Node != nil {
			r.Header.Set("x-hivemind-link-node", who.Node.ComputedName)
			r.Header.Set("x-tailscale-node", who.Node.ComputedName)
		}
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		http.Error(w, fmt.Sprintf("hivemind-linkd proxy error: %v", err), http.StatusBadGateway)
	}
	return proxy
}

func statusPayload(ctx context.Context, lc *local.Client) map[string]any {
	if lc == nil {
		return map[string]any{"ok": false, "error": "local tailscale client unavailable"}
	}
	status, err := lc.Status(ctx)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	return map[string]any{
		"ok":             status.BackendState == "Running",
		"backendState":   status.BackendState,
		"authUrl":        status.AuthURL,
		"magicDnsSuffix": status.MagicDNSSuffix,
		"self":           status.Self,
		"peer":           status.Peer,
	}
}

func servePeerProxy(ts *tsnet.Server) http.HandlerFunc {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network string, addr string) (net.Conn, error) {
			return ts.Dial(ctx, network, addr)
		},
	}
	return func(w http.ResponseWriter, r *http.Request) {
		rest := strings.TrimPrefix(r.URL.Path, "/peer/")
		parts := strings.SplitN(rest, "/", 2)
		hostPort, err := url.PathUnescape(parts[0])
		if err != nil || hostPort == "" {
			http.Error(w, "missing peer host", http.StatusBadRequest)
			return
		}
		if _, _, err := net.SplitHostPort(hostPort); err != nil {
			http.Error(w, "peer host must include a port", http.StatusBadRequest)
			return
		}
		outPath := "/"
		if len(parts) == 2 {
			outPath += parts[1]
		}
		appProxyPrefix := ""
		if appProxyMatch := regexp.MustCompile(`^(/app-proxy/\d+)(?:/.*)?$`).FindStringSubmatch(outPath); len(appProxyMatch) == 2 {
			appProxyPrefix = appProxyMatch[1]
		}
		if appProxyPrefix != "" {
			setAppProxyContextCookie(w, hostPort, appProxyPrefix)
			if shouldRedirectAppProxyHTML(r, outPath, appProxyPrefix) {
				http.Redirect(w, r, appProxyRedirectPath(r, outPath, appProxyPrefix), http.StatusTemporaryRedirect)
				return
			}
		}
		proxy := &httputil.ReverseProxy{
			Director: func(out *http.Request) {
				out.URL.Scheme = "http"
				out.URL.Host = hostPort
				out.URL.Path = outPath
				out.Host = hostPort
				out.RequestURI = ""
				out.Header.Del("Accept-Encoding")
			},
			ModifyResponse: func(res *http.Response) error {
				if appProxyPrefix == "" {
					return nil
				}
				return rewritePeerHTMLResponse(res, hostPort, appProxyPrefix)
			},
			Transport: transport,
			ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
				http.Error(w, fmt.Sprintf("hivemind-linkd peer proxy error: %v", err), http.StatusBadGateway)
			},
		}
		proxy.ServeHTTP(w, r)
	}
}

func appProxyRefererTarget(r *http.Request) (string, string, bool) {
	referer := strings.TrimSpace(r.Referer())
	if referer == "" {
		return "", "", false
	}
	refererURL, err := url.Parse(referer)
	if err != nil {
		return "", "", false
	}
	if hostPort, appProxyPrefix, ok := decodeAppProxyContext(refererURL.Query().Get(appProxyContextQuery)); ok {
		return hostPort, appProxyPrefix, true
	}
	rest := strings.TrimPrefix(refererURL.Path, "/peer/")
	if rest == refererURL.Path {
		return "", "", false
	}
	parts := strings.SplitN(rest, "/", 2)
	hostPort, err := url.PathUnescape(parts[0])
	if err != nil || hostPort == "" {
		return "", "", false
	}
	if _, _, err := net.SplitHostPort(hostPort); err != nil {
		return "", "", false
	}
	if len(parts) != 2 {
		return "", "", false
	}
	peerPath := "/" + parts[1]
	appProxyMatch := regexp.MustCompile(`^(/app-proxy/\d+)(?:/.*)?$`).FindStringSubmatch(peerPath)
	if len(appProxyMatch) != 2 {
		return "", "", false
	}
	return hostPort, appProxyMatch[1], true
}

func validateAppProxyTarget(hostPort string, appProxyPrefix string) bool {
	if _, _, err := net.SplitHostPort(hostPort); err != nil {
		return false
	}
	return regexp.MustCompile(`^/app-proxy/\d+$`).MatchString(appProxyPrefix)
}

func encodeAppProxyContext(hostPort string, appProxyPrefix string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(hostPort + "|" + appProxyPrefix))
}

func decodeAppProxyContext(value string) (string, string, bool) {
	if strings.TrimSpace(value) == "" {
		return "", "", false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return "", "", false
	}
	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 || !validateAppProxyTarget(parts[0], parts[1]) {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func appProxyQueryTarget(r *http.Request) (string, string, bool) {
	return decodeAppProxyContext(r.URL.Query().Get(appProxyContextQuery))
}

func appProxyCookieTarget(r *http.Request) (string, string, bool) {
	cookie, err := r.Cookie(appProxyContextCookie)
	if err != nil || strings.TrimSpace(cookie.Value) == "" {
		return "", "", false
	}
	return decodeAppProxyContext(cookie.Value)
}

func appProxyFallbackTarget(r *http.Request) (string, string, bool, bool) {
	if hostPort, appProxyPrefix, ok := appProxyQueryTarget(r); ok {
		return hostPort, appProxyPrefix, true, true
	}
	if hostPort, appProxyPrefix, ok := appProxyRefererTarget(r); ok {
		return hostPort, appProxyPrefix, true, true
	}
	if hostPort, appProxyPrefix, ok := appProxyCookieTarget(r); ok {
		return hostPort, appProxyPrefix, true, false
	}
	return "", "", false, false
}

func servePeerRefererFallback(ts *tsnet.Server) http.HandlerFunc {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network string, addr string) (net.Conn, error) {
			return ts.Dial(ctx, network, addr)
		},
	}
	return func(w http.ResponseWriter, r *http.Request) {
		hostPort, appProxyPrefix, ok, fromReferer := appProxyFallbackTarget(r)
		if !ok {
			http.NotFound(w, r)
			return
		}
		if fromReferer {
			setAppProxyContextCookie(w, hostPort, appProxyPrefix)
		}
		proxy := &httputil.ReverseProxy{
			Director: func(out *http.Request) {
				out.URL.Scheme = "http"
				out.URL.Host = hostPort
				out.URL.Path = appProxyPrefix + r.URL.Path
				out.URL.RawQuery = appProxyForwardRawQuery(r.URL.Query())
				out.Host = hostPort
				out.RequestURI = ""
				out.Header.Del("Accept-Encoding")
			},
			Transport: transport,
			ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
				http.Error(w, fmt.Sprintf("hivemind-linkd peer proxy error: %v", err), http.StatusBadGateway)
			},
		}
		proxy.ServeHTTP(w, r)
	}
}

func setAppProxyContextCookie(w http.ResponseWriter, hostPort string, appProxyPrefix string) {
	http.SetCookie(w, &http.Cookie{
		Name:     appProxyContextCookie,
		Value:    encodeAppProxyContext(hostPort, appProxyPrefix),
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func shouldRedirectAppProxyHTML(r *http.Request, outPath string, appProxyPrefix string) bool {
	if r.Method != http.MethodGet || appProxyPrefix == "" || !strings.HasPrefix(outPath, appProxyPrefix) {
		return false
	}
	accept := strings.ToLower(r.Header.Get("accept"))
	if accept != "" && !strings.Contains(accept, "text/html") {
		return false
	}
	appPath := strings.TrimPrefix(outPath, appProxyPrefix)
	return appPath == "" || appPath == "/" || strings.HasSuffix(appPath, "/")
}

func appProxyRedirectPath(r *http.Request, outPath string, appProxyPrefix string) string {
	appPath := strings.TrimPrefix(outPath, appProxyPrefix)
	if appPath == "" {
		appPath = "/"
	}
	values := r.URL.Query()
	values.Set(appProxyContextQuery, encodeAppProxyContext(appProxyHostPortFromPath(r.URL.Path), appProxyPrefix))
	if encoded := values.Encode(); encoded != "" {
		appPath += "?" + encoded
	}
	return appPath
}

func appProxyHostPortFromPath(path string) string {
	rest := strings.TrimPrefix(path, "/peer/")
	parts := strings.SplitN(rest, "/", 2)
	hostPort, err := url.PathUnescape(parts[0])
	if err != nil {
		return ""
	}
	return hostPort
}

func appProxyForwardRawQuery(values url.Values) string {
	forward := make(url.Values, len(values))
	for key, entries := range values {
		if key == appProxyContextQuery {
			continue
		}
		forward[key] = append([]string(nil), entries...)
	}
	return forward.Encode()
}

func rewritePeerHTMLResponse(res *http.Response, hostPort string, appProxyPrefix string) error {
	contentType := strings.ToLower(res.Header.Get("content-type"))
	if !strings.Contains(contentType, "text/html") {
		return nil
	}
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	if err := res.Body.Close(); err != nil {
		return err
	}
	rewritten := rewritePeerRootHTML(string(body), hostPort, appProxyPrefix)
	res.Body = io.NopCloser(strings.NewReader(rewritten))
	res.ContentLength = int64(len(rewritten))
	res.Header.Set("Content-Length", fmt.Sprintf("%d", len(rewritten)))
	return nil
}

func rewritePeerRootHTML(html string, hostPort string, appProxyPrefix string) string {
	prefix := "/peer/" + escapePeerPathSegment(hostPort) + appProxyPrefix
	replacements := []struct {
		old string
		new string
	}{
		{`src="/`, `src="` + prefix + `/`},
		{`href="/`, `href="` + prefix + `/`},
		{`action="/`, `action="` + prefix + `/`},
		{`poster="/`, `poster="` + prefix + `/`},
		{`src='/`, `src='` + prefix + `/`},
		{`href='/`, `href='` + prefix + `/`},
		{`action='/`, `action='` + prefix + `/`},
		{`poster='/`, `poster='` + prefix + `/`},
		{`\"/_next/`, `\"` + prefix + `/_next/`},
		{`\"/favicon`, `\"` + prefix + `/favicon`},
	}
	for _, replacement := range replacements {
		html = strings.ReplaceAll(html, replacement.old, replacement.new)
	}
	html = regexp.MustCompile(`(<script src=["'][^"']*/_next/static/chunks/[^"']+["']) async=""`).ReplaceAllString(html, "$1")
	return html
}

func escapePeerPathSegment(value string) string {
	return strings.ReplaceAll(url.PathEscape(value), ":", "%3A")
}

func serveControl(ctx context.Context, addr string, lc *local.Client, ts *tsnet.Server) (*http.Server, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "service": "hivemind-linkd"})
	})
	mux.HandleFunc("/status", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(statusPayload(ctx, lc))
	})
	mux.HandleFunc("/peer/", servePeerProxy(ts))
	mux.HandleFunc("/", servePeerRefererFallback(ts))
	server := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := server.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("control API error: %v", err)
		}
	}()
	return server, nil
}

func main() {
	cfg := parseConfig()
	if err := os.MkdirAll(cfg.stateDir, 0o700); err != nil {
		log.Fatalf("create state dir: %v", err)
	}
	target, err := url.Parse(cfg.target)
	if err != nil {
		log.Fatalf("invalid target URL: %v", err)
	}

	ts := &tsnet.Server{
		Hostname:     cfg.hostname,
		Dir:          cfg.stateDir,
		AuthKey:      cfg.authKey,
		RunWebClient: true,
		Logf: func(format string, args ...any) {
			log.Printf("tailscale: "+format, args...)
		},
	}
	if cfg.controlURL != "" {
		ts.ControlURL = cfg.controlURL
	}
	defer ts.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := ts.Start(); err != nil {
		log.Fatalf("start embedded tailscale: %v", err)
	}
	lc, err := ts.LocalClient()
	if err != nil {
		log.Fatalf("embedded tailscale local client: %v", err)
	}
	controlServer, err := serveControl(ctx, cfg.control, lc, ts)
	if err != nil {
		log.Fatalf("listen on control API %s: %v", cfg.control, err)
	}
	defer controlServer.Shutdown(context.Background()) //nolint:errcheck

	ln, err := ts.Listen("tcp", cfg.listenAddr)
	if err != nil {
		log.Fatalf("listen on Tailnet %s: %v", cfg.listenAddr, err)
	}
	defer ln.Close()

	go func() {
		<-ctx.Done()
		_ = ln.Close()
	}()

	log.Printf("hivemind-linkd proxying Tailnet %s to %s as %s", cfg.listenAddr, cfg.target, cfg.hostname)
	if err := http.Serve(ln, newProxy(target, lc)); err != nil && !strings.Contains(err.Error(), "use of closed network connection") && !errors.Is(err, net.ErrClosed) {
		log.Fatalf("serve proxy: %v", err)
	}
}
