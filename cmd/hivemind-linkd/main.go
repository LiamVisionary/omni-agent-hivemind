package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
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
		proxy := &httputil.ReverseProxy{
			Director: func(out *http.Request) {
				out.URL.Scheme = "http"
				out.URL.Host = hostPort
				out.URL.Path = outPath
				out.Host = hostPort
				out.RequestURI = ""
			},
			Transport: transport,
			ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
				http.Error(w, fmt.Sprintf("hivemind-linkd peer proxy error: %v", err), http.StatusBadGateway)
			},
		}
		proxy.ServeHTTP(w, r)
	}
}

func serveControl(ctx context.Context, addr string, lc *local.Client, ts *tsnet.Server) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
	})
	mux.HandleFunc("/status", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(statusPayload(ctx, lc))
	})
	mux.HandleFunc("/peer/", servePeerProxy(ts))
	server := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("control API error: %v", err)
		}
	}()
	return server
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
	controlServer := serveControl(ctx, cfg.control, lc, ts)
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
