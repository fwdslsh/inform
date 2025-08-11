#!/bin/bash

# Inform Installation Script
# This script downloads and installs the latest inform binary from GitHub releases
# Supports Linux, macOS, and Windows across x86_64 and arm64 architectures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="inform"
REPO_OWNER="fwdslsh"
REPO_NAME="inform"
GITHUB_API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}"
GITHUB_RELEASES_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"

# Default values
INSTALL_DIR=""
VERSION=""
USER_INSTALL=false
FORCE_INSTALL=false
DRY_RUN=false

# ASCII Banner
show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
     _         __                         
    (_)  ___  / _|  ___   _ __  _ __ ___   
    | | / _ \| |_  / _ \ | '__|| '_ ` _ \  
    | || (_) |  _|| (_) || |   | | | | | | 
    |_| \___/|_|   \___/ |_|   |_| |_| |_| 
                                          
  High-Performance Web Crawler
EOF
    echo -e "${NC}"
}

# Help function
show_help() {
    cat << EOF
Inform Installation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --help              Show this help message
    --version TAG       Install specific version (e.g., v1.0.0)
    --dir PATH          Custom installation directory
    --user              Install to ~/.local/bin (user install)
    --force             Force reinstall even if already installed
    --dry-run           Show what would be done without installing

ENVIRONMENT VARIABLES:
    INFORM_INSTALL_DIR  Custom installation directory
    INFORM_VERSION      Specific version to install
    INFORM_FORCE        Force reinstall (set to any value)

EXAMPLES:
    $0                           # Install latest version system-wide
    $0 --user                    # Install to ~/.local/bin
    $0 --version v1.0.0          # Install specific version
    $0 --dir /opt/bin --force    # Force install to custom directory

EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect platform and architecture
detect_platform() {
    local os
    local arch
    
    # Detect OS
    case "$(uname -s)" in
        Linux*)   os="linux" ;;
        Darwin*)  os="darwin" ;;
        CYGWIN*|MINGW*|MSYS*) os="windows" ;;
        *)        
            log_error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    
    # Detect architecture
    case "$(uname -m)" in
        x86_64|amd64) arch="x86_64" ;;
        arm64|aarch64) arch="arm64" ;;
        *)
            log_error "Unsupported architecture: $(uname -m)"
            exit 1
            ;;
    esac
    
    echo "${os}-${arch}"
}

# Check GLIBC version on Linux
check_glibc() {
    if [[ "$(uname -s)" == "Linux" ]]; then
        if command_exists ldd; then
            local glibc_version
            glibc_version=$(ldd --version 2>&1 | head -n1 | grep -oE '[0-9]+\.[0-9]+')
            if [[ -n "$glibc_version" ]]; then
                log_info "Detected GLIBC version: $glibc_version"
                # Check if GLIBC is at least 2.27 (minimum for most modern binaries)
                if awk "BEGIN {exit !($glibc_version >= 2.27)}"; then
                    log_info "GLIBC version is compatible"
                else
                    log_warn "GLIBC version may be too old. If installation fails, try building from source."
                fi
            fi
        fi
    fi
}

# Get latest release version
get_latest_version() {
    log_info "Fetching latest release information..."
    
    if command_exists curl; then
        curl -s "${GITHUB_API_URL}/releases/latest" | grep '"tag_name"' | cut -d'"' -f4
    elif command_exists wget; then
        wget -qO- "${GITHUB_API_URL}/releases/latest" | grep '"tag_name"' | cut -d'"' -f4
    else
        log_error "Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
}

# Download file with progress
download_file() {
    local url="$1"
    local output="$2"
    
    log_info "Downloading from: $url"
    
    if command_exists curl; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would download: curl -fL \"$url\" -o \"$output\""
        else
            curl -fL --progress-bar "$url" -o "$output"
        fi
    elif command_exists wget; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would download: wget \"$url\" -O \"$output\""
        else
            wget --progress=bar:force "$url" -O "$output"
        fi
    else
        log_error "Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
}

# Verify installation directory
setup_install_dir() {
    if [[ -n "$INSTALL_DIR" ]]; then
        # Use provided directory
        INSTALL_DIR=$(realpath "$INSTALL_DIR")
    elif [[ "$USER_INSTALL" == "true" ]]; then
        # User installation
        INSTALL_DIR="$HOME/.local/bin"
    else
        # System installation
        INSTALL_DIR="/usr/local/bin"
    fi
    
    log_info "Installation directory: $INSTALL_DIR"
    
    # Check if directory exists
    if [[ ! -d "$INSTALL_DIR" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would create directory: $INSTALL_DIR"
        else
            log_info "Creating directory: $INSTALL_DIR"
            mkdir -p "$INSTALL_DIR" || {
                log_error "Failed to create directory: $INSTALL_DIR"
                log_error "Try using --user flag or --dir flag with a writable directory"
                exit 1
            }
        fi
    fi
    
    # Check write permissions
    if [[ "$DRY_RUN" == "false" ]] && [[ ! -w "$INSTALL_DIR" ]]; then
        log_error "No write permission to $INSTALL_DIR"
        if [[ "$INSTALL_DIR" == "/usr/local/bin" ]]; then
            log_error "Try running with sudo or use --user flag"
        fi
        exit 1
    fi
}

# Check if inform is already installed
check_existing_installation() {
    local existing_path
    existing_path=$(command -v "$PROJECT_NAME" 2>/dev/null || true)
    
    if [[ -n "$existing_path" ]]; then
        local existing_version
        existing_version=$("$existing_path" --version 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        
        log_info "Found existing installation: $existing_path (version: $existing_version)"
        
        if [[ "$FORCE_INSTALL" == "false" ]]; then
            log_warn "Inform is already installed. Use --force to reinstall."
            exit 0
        else
            log_info "Force install enabled, proceeding with installation..."
        fi
    fi
}

# Verify PATH configuration
verify_path() {
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        log_warn "$INSTALL_DIR is not in your PATH"
        
        case "$SHELL" in
            */bash)
                log_info "Add this line to your ~/.bashrc:"
                echo -e "${CYAN}export PATH=\"$INSTALL_DIR:\$PATH\"${NC}"
                ;;
            */zsh)
                log_info "Add this line to your ~/.zshrc:"
                echo -e "${CYAN}export PATH=\"$INSTALL_DIR:\$PATH\"${NC}"
                ;;
            */fish)
                log_info "Run this command:"
                echo -e "${CYAN}fish_add_path $INSTALL_DIR${NC}"
                ;;
            *)
                log_info "Add $INSTALL_DIR to your PATH environment variable"
                ;;
        esac
        
        echo ""
        log_info "Then restart your shell or run: source ~/.bashrc (or ~/.zshrc)"
    fi
}

# Main installation function
install_inform() {
    local platform
    local binary_name
    local download_url
    local temp_file
    local final_path
    
    platform=$(detect_platform)
    log_info "Detected platform: $platform"
    
    # Construct binary name based on platform
    case "$platform" in
        windows-*)
            binary_name="${PROJECT_NAME}-${platform}.exe"
            ;;
        *)
            binary_name="${PROJECT_NAME}-${platform}"
            ;;
    esac
    
    # Get version to install
    if [[ -z "$VERSION" ]]; then
        VERSION=$(get_latest_version)
        if [[ -z "$VERSION" ]]; then
            log_error "Failed to fetch latest version"
            exit 1
        fi
    fi
    
    log_info "Installing version: $VERSION"
    
    # Construct download URL
    download_url="${GITHUB_RELEASES_URL}/download/${VERSION}/${binary_name}"
    
    # Create temporary file
    temp_file=$(mktemp)
    trap "rm -f '$temp_file'" EXIT
    
    # Download binary
    download_file "$download_url" "$temp_file"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # Verify download
        if [[ ! -f "$temp_file" ]] || [[ ! -s "$temp_file" ]]; then
            log_error "Download failed or file is empty"
            exit 1
        fi
        
        # Make executable and move to final location
        chmod +x "$temp_file"
        final_path="$INSTALL_DIR/$PROJECT_NAME"
        
        if [[ "$platform" == windows-* ]]; then
            final_path="${final_path}.exe"
        fi
        
        log_info "Installing to: $final_path"
        mv "$temp_file" "$final_path"
        
        # Verify installation
        if [[ -x "$final_path" ]]; then
            log_success "Successfully installed $PROJECT_NAME $VERSION"
            
            # Test the installation
            if "$final_path" --version >/dev/null 2>&1; then
                log_success "Installation verified successfully"
            else
                log_warn "Installation completed but verification failed"
            fi
        else
            log_error "Installation failed: binary is not executable"
            exit 1
        fi
    else
        log_info "[DRY RUN] Would install to: $INSTALL_DIR/$PROJECT_NAME"
        log_info "[DRY RUN] Would verify installation"
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --user)
                USER_INSTALL=true
                shift
                ;;
            --force)
                FORCE_INSTALL=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    # Parse environment variables
    INSTALL_DIR="${INFORM_INSTALL_DIR:-$INSTALL_DIR}"
    VERSION="${INFORM_VERSION:-$VERSION}"
    if [[ -n "${INFORM_FORCE:-}" ]]; then
        FORCE_INSTALL=true
    fi
    
    # Parse command line arguments
    parse_args "$@"
    
    # Show banner
    show_banner
    
    # Pre-flight checks
    check_glibc
    setup_install_dir
    check_existing_installation
    
    # Install
    install_inform
    
    # Post-installation
    if [[ "$DRY_RUN" == "false" ]]; then
        verify_path
        
        echo ""
        log_success "Installation complete!"
        log_info "Run '$PROJECT_NAME --help' to get started"
        
        # Show quick usage example
        echo ""
        echo -e "${CYAN}Quick start:${NC}"
        echo -e "  ${PROJECT_NAME} https://docs.example.com    # Crawl a documentation site"
        echo -e "  ${PROJECT_NAME} --help                      # Show all options"
    else
        echo ""
        log_info "[DRY RUN] Installation simulation complete"
    fi
}

# Run main function with all arguments
main "$@"
