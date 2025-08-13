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

# Default values
INSTALL_DIR=""
VERSION=""
USER_INSTALL=true
FORCE_INSTALL=false
DRY_RUN=false

# Configuration
PROJECT_NAME="inform"
REPO="fwdslsh/${PROJECT_NAME}"

GITHUB_API_URL="https://api.github.com/repos/${REPO}"
GITHUB_RELEASES_URL="https://github.com/${REPO}/releases"
FALLBACK_VERSION="v0.0.13"  # Fallback version if API is unreachable


# ASCII Banner
show_banner() {
    printf "${CYAN}"
    cat << 'EOF'
  ___        __                   
 |_ _|_ __  / _| ___  _ __ _ __ ___  
  | || '_ \| |_ / _ \| '__| '_ ` _ \ 
  | || | | |  _| (_) | |  | | | | | |
 |___|_| |_|_|  \___/|_|  |_| |_| |_|

  Web Content Extraction Tool
EOF
    printf "${NC}\n"
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
    --global            Install globally (system-wide), requires sudo
    --force             Force reinstall even if already installed
    --dry-run           Show what would be done without installing

ENVIRONMENT VARIABLES:
    INFORM_INSTALL_DIR   Custom installation directory
    INFORM_VERSION       Specific version to install
    INFORM_FORCE         Force reinstall (set to any value)

EXAMPLES:
    $0                           # Install latest version system-wide
    $0 --user                    # Install to ~/.local/bin
    $0 --version v1.0.0          # Install specific version
    $0 --dir /opt/bin --force    # Force install to custom directory

EOF
}

# Logging functions
log_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

log_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

log_warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

log_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
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

# Get latest release version
get_latest_version() {
    local version_output
    local api_response
    
    if command_exists curl; then
        api_response=$(curl -s "${GITHUB_API_URL}/releases/latest" 2>/dev/null)
        if [[ $? -ne 0 ]] || [[ -z "$api_response" ]]; then
            return 1
        fi
        version_output=$(echo "$api_response" | grep '"tag_name"' | cut -d'"' -f4)
    elif command_exists wget; then
        api_response=$(wget -qO- "${GITHUB_API_URL}/releases/latest" 2>/dev/null)
        if [[ $? -ne 0 ]] || [[ -z "$api_response" ]]; then
            return 1
        fi
        version_output=$(echo "$api_response" | grep '"tag_name"' | cut -d'"' -f4)
    else
        return 1
    fi
    
    if [[ -z "$version_output" ]]; then
        return 1
    fi
    
    echo "$version_output"
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
            if ! curl -fL --progress-bar "$url" -o "$output"; then
                log_error "Download failed"
                return 1
            fi
        fi
    elif command_exists wget; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would download: wget \"$url\" -O \"$output\""
        else
            if ! wget --progress=bar:force "$url" -O "$output"; then
                log_error "Download failed"
                return 1
            fi
        fi
    else
        log_error "Neither curl nor wget is available. Please install one of them."
        return 1
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
        existing_version=$("$existing_path" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        
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
                printf "${CYAN}export PATH=\"$INSTALL_DIR:\$PATH\"${NC}\n"
                ;;
            */zsh)
                log_info "Add this line to your ~/.zshrc:"
                printf "${CYAN}export PATH=\"$INSTALL_DIR:\$PATH\"${NC}\n"
                ;;
            */fish)
                log_info "Run this command:"
                printf "${CYAN}fish_add_path $INSTALL_DIR${NC}\n"
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
        log_info "Fetching latest release information..."
        # Temporarily disable exit on error for API call
        set +e
        VERSION=$(get_latest_version)
        local api_result=$?
        set -e
        
        if [[ $api_result -ne 0 ]] || [[ -z "$VERSION" ]]; then
            log_warn "Failed to fetch latest version from GitHub API, using fallback version: $FALLBACK_VERSION"
            VERSION="$FALLBACK_VERSION"
        fi
    fi
    
    log_info "Installing version: $VERSION"
    
    # Construct download URL
    download_url="${GITHUB_RELEASES_URL}/download/${VERSION}/${binary_name}"
    
    # Create temporary file
    temp_file=$(mktemp)
    trap "rm -f '$temp_file'" EXIT
    
    # Download binary
    if ! download_file "$download_url" "$temp_file"; then
        log_error "Failed to download binary from: $download_url"
        exit 1
    fi
    
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
            --global)
                USER_INSTALL=false
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
    else
        echo ""
        log_info "[DRY RUN] Installation simulation complete"
    fi
}

# Run main function with all arguments
main "$@"
