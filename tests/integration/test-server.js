/**
 * Simple HTTP server for integration testing
 * Serves test HTML pages and simulates various scenarios
 */

export class TestServer {
  constructor(port = 0) {
    this.port = port;
    this.server = null;
    this.baseUrl = null;
    this.requestLog = [];
  }

  async start() {
    const testPages = {
      '/': `<!DOCTYPE html>
<html>
<head><title>Home Page</title></head>
<body>
  <h1>Home Page</h1>
  <p>Welcome to the test site.</p>
  <a href="/page1">Page 1</a>
  <a href="/page2">Page 2</a>
  <a href="/docs/intro">Documentation</a>
</body>
</html>`,
      '/page1': `<!DOCTYPE html>
<html>
<head><title>Page 1</title></head>
<body>
  <h1>Page 1</h1>
  <p>This is page 1.</p>
  <a href="/">Home</a>
  <a href="/page2">Page 2</a>
</body>
</html>`,
      '/page2': `<!DOCTYPE html>
<html>
<head><title>Page 2</title></head>
<body>
  <h1>Page 2</h1>
  <p>This is page 2.</p>
  <code>const x = 42;</code>
  <a href="/">Home</a>
</body>
</html>`,
      '/docs/intro': `<!DOCTYPE html>
<html>
<head><title>Documentation</title></head>
<body>
  <main>
    <h1>Documentation</h1>
    <p>Getting started guide.</p>
    <pre><code class="language-javascript">console.log('Hello');</code></pre>
  </main>
  <nav><a href="/">Home</a></nav>
</body>
</html>`,
      '/robots.txt': `User-agent: *
Disallow: /admin/
Disallow: /private/
Crawl-delay: 0`,
      '/admin/secret': `<!DOCTYPE html>
<html>
<head><title>Admin</title></head>
<body><h1>Secret Admin Page</h1></body>
</html>`,
      '/non-html': 'This is plain text content',
    };

    this.server = Bun.serve({
      port: this.port,
      fetch: (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        this.requestLog.push({
          path,
          method: req.method,
          timestamp: Date.now(),
        });

        if (path === '/robots.txt') {
          return new Response(testPages['/robots.txt'], {
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        if (path === '/non-html') {
          return new Response(testPages[path], {
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        if (!(path in testPages)) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(testPages[path], {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    });

    this.port = this.server.port;
    this.baseUrl = `http://localhost:${this.port}`;
    return this.baseUrl;
  }

  async stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  getRequestLog() {
    return this.requestLog;
  }

  clearRequestLog() {
    this.requestLog = [];
  }

  getRequestCount(path) {
    return this.requestLog.filter((req) => req.path === path).length;
  }
}
