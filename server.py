#!/usr/bin/env python3
"""
Simple HTTP server for testing PWA
Serves files with proper MIME types and HTTPS headers for PWA testing
"""

import http.server
import socketserver
import os
import mimetypes
from urllib.parse import urlparse

class PWAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add PWA-friendly headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        # Service Worker headers
        if self.path.endswith('sw.js'):
            self.send_header('Service-Worker-Allowed', '/')
            self.send_header('Content-Type', 'application/javascript')
        
        # Manifest headers
        if self.path.endswith('manifest.json'):
            self.send_header('Content-Type', 'application/manifest+json')
        
        super().end_headers()
    
    def do_GET(self):
        # Handle root path
        if self.path == '/':
            self.path = '/index.html'
        
        # Serve the file
        super().do_GET()
    
    def log_message(self, format, *args):
        # Custom logging
        print(f"[PWA Server] {format % args}")

def run_server(port=8000):
    """Run the PWA development server"""
    
    # Set up MIME types
    mimetypes.add_type('application/javascript', '.js')
    mimetypes.add_type('application/manifest+json', '.json')
    mimetypes.add_type('text/css', '.css')
    mimetypes.add_type('image/png', '.png')
    mimetypes.add_type('image/svg+xml', '.svg')
    
    # Change to the directory containing the PWA files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", port), PWAHTTPRequestHandler) as httpd:
        print(f"🚀 PWA Server running at http://localhost:{port}")
        print(f"📱 Open http://localhost:{port} in your browser")
        print(f"🔧 Press Ctrl+C to stop the server")
        print()
        print("📋 Testing Instructions:")
        print("1. Open the URL in Chrome/Edge (PWA features work best)")
        print("2. Open DevTools > Application > Service Workers")
        print("3. Try the 'Install App' button when it appears")
        print("4. Test offline mode: DevTools > Network > Offline checkbox")
        print("5. Refresh the page while offline to see cached content")
        print()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    import sys
    
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number. Using default port 8000.")
    
    run_server(port)
