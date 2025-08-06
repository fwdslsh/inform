# Inform Installation Guide

Inform is distributed as pre-built single-file binaries for Linux, macOS, and Windows, as well as an npm package. You can install and use Inform in several ways:

## 1. Download a Pre-built Binary (Recommended)

Each release on [GitHub Releases](https://github.com/fwdslsh/inform/releases) includes binaries for:

- Linux
- macOS
- Windows

### Steps:
1. Go to the [Releases page](https://github.com/fwdslsh/inform/releases).
2. Download the binary for your operating system:
   - `inform-linux` (Linux)
   - `inform-mac` (macOS)
   - `inform-win.exe` (Windows)
3. (Optional) Move the binary to a directory in your `PATH` (e.g., `/usr/local/bin` on Linux/macOS).
4. Make it executable (Linux/macOS):
   ```bash
   chmod +x inform-linux
   # or
   chmod +x inform-mac
   ```
5. Run Inform:
   ```bash
   ./inform-linux --help
   # or
   inform-mac --help
   # or
   inform-win.exe --help
   ```

## 2. Install via npm (Requires Bun)

You can also install Inform as an npm package if you have [Bun](https://bun.sh) installed:

```bash
bun add @fwdslsh/inform
```

Or install globally:

```bash
bun install -g @fwdslsh/inform
```

Then run:

```bash
inform --help
```

## 3. Build from Source (Advanced)

Clone the repository and install dependencies:

```bash
git clone https://github.com/fwdslsh/inform.git
cd inform
bun install
```

Run directly with Bun:

```bash
bun src/cli.js --help
```

Or build your own binary:

```bash
bun build src/cli.js --compile --outfile inform-custom
```

## Updating Inform

To update, download the latest binary from the Releases page or update via npm:

```bash
bun upgrade @fwdslsh/inform
```

## Troubleshooting

- Make sure you have the correct binary for your OS and architecture.
- For npm installs, ensure you have Bun v1.0.0 or higher.
- If you encounter permission errors, use `chmod +x` on the binary.

## More Information

- [Usage Guide](./usage.md)
- [GitHub Releases](https://github.com/fwdslsh/inform/releases)

---
If you have any issues, please open an issue on GitHub or check the documentation for help.
