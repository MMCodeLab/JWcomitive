"""Semplice server statico per sviluppo locale (nessuna dipendenza esterna).

Uso:
    python serve.py [porta]

Di default usa la porta 5530. Rispetto a `python -m http.server` fa due cose
in piu': manda i Content-Type giusti per manifest.webmanifest e per i file .js,
e disattiva la cache del browser, altrimenti dopo una modifica al foglio di
stile si continuerebbe a vedere la versione vecchia.
"""
import http.server
import mimetypes
import sys

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disabilita la cache in sviluppo, cosi' le modifiche si vedono subito.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5530
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"JW comitive in esecuzione su http://127.0.0.1:{port}")
    server.serve_forever()
