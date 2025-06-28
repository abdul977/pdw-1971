#!/usr/bin/env python3
"""
Simple HTTP server for testing PWA
Serves files with proper MIME types and PWA-specific headers for development testing
This server is optimized for PWA development with proper headers for service workers,
manifest files, and security requirements.
"""

import http.server    # Built-in HTTP server functionality
import socketserver   # TCP server implementation
import os            # Operating system interface for file operations
import mimetypes     # MIME type detection for proper content-type headers
from urllib.parse import urlparse  # URL parsing utilities

class PWAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP request handler that extends SimpleHTTPRequestHandler
    to add PWA-specific headers and handle PWA requirements
    """

    def end_headers(self):
        """
        Override end_headers to add custom headers before sending response
        This method is called after all headers are set but before response body
        """
        # Add PWA-friendly cache control headers
        # These headers prevent aggressive caching during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')  # HTTP 1.1 cache control
        self.send_header('Pragma', 'no-cache')                                    # HTTP 1.0 cache control
        self.send_header('Expires', '0')                                          # Proxy cache control

        # Security headers to protect against common web vulnerabilities
        self.send_header('X-Content-Type-Options', 'nosniff')    # Prevent MIME type sniffing
        self.send_header('X-Frame-Options', 'DENY')              # Prevent clickjacking attacks
        self.send_header('X-XSS-Protection', '1; mode=block')    # Enable XSS protection

        # Service Worker specific headers
        if self.path.endswith('sw.js'):
            # Allow service worker to control the entire origin
            self.send_header('Service-Worker-Allowed', '/')
            # Ensure correct MIME type for JavaScript files
            self.send_header('Content-Type', 'application/javascript')

        # PWA Manifest specific headers
        if self.path.endswith('manifest.json'):
            # Set correct MIME type for PWA manifest files
            self.send_header('Content-Type', 'application/manifest+json')

        # Call parent method to finalize headers
        super().end_headers()

    def do_GET(self):
        """
        Handle GET requests with custom routing logic
        Provides fallback for root path and serves static files
        """
        # Handle root path by redirecting to index.html
        if self.path == '/':
            self.path = '/index.html'

        # Delegate to parent class for actual file serving
        super().do_GET()

    def log_message(self, format, *args):
        """
        Custom logging format for better development experience
        Adds [PWA Server] prefix to distinguish from other logs
        """
        print(f"[PWA Server] {format % args}")

def run_server(port=8000):
    """
    Run the PWA development server with proper configuration
    Sets up MIME types, changes to correct directory, and starts HTTP server
    """

    # Set up MIME types for proper content-type headers
    # These ensure browsers handle files correctly and PWA features work
    mimetypes.add_type('application/javascript', '.js')        # JavaScript files
    mimetypes.add_type('application/manifest+json', '.json')   # PWA manifest files
    mimetypes.add_type('text/css', '.css')                     # CSS stylesheets
    mimetypes.add_type('image/png', '.png')                    # PNG images
    mimetypes.add_type('image/svg+xml', '.svg')                # SVG vector images

    # Change to the directory containing the PWA files
    # This ensures relative paths work correctly for serving static files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # Create and start the TCP server with our custom request handler
    # Using context manager ensures proper cleanup when server stops
    with socketserver.TCPServer(("", port), PWAHTTPRequestHandler) as httpd:
        # Display startup information and testing instructions
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
            # Start serving requests indefinitely
            httpd.serve_forever()
        except KeyboardInterrupt:
            # Handle Ctrl+C gracefully
            print("\n🛑 Server stopped")

# Main execution block - only runs when script is executed directly
if __name__ == "__main__":
    import sys  # Import sys for command line argument parsing

    # Default port for development server
    port = 8000

    # Check if custom port was provided as command line argument
    if len(sys.argv) > 1:
        try:
            # Parse port number from command line argument
            port = int(sys.argv[1])
        except ValueError:
            # Handle invalid port number gracefully
            print("Invalid port number. Using default port 8000.")

    # Start the server with specified or default port
    run_server(port)
