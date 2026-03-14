# RaceTimeTracker devcontainer - devcontainer base + tmux, cloudflared, Node.js 22
# Use devcontainer base for lifecycle support (entrypoint, container startup)
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Switch to root for package installation (base may run as vscode)
USER root

# Install tmux
RUN apt-get update && apt-get install -y --no-install-recommends tmux \
    && rm -rf /var/lib/apt/lists/*

# Add Cloudflare apt repo and install cloudflared
RUN mkdir -p --mode=0755 /usr/share/keyrings \
    && curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null \
    && echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared noble main' | tee /etc/apt/sources.list.d/cloudflared.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends cloudflared \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 via NodeSource
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Playwright: system deps + Chromium for ad-hoc UI tests (project node_modules are not installed in image)
USER root
RUN npm install -g @playwright/test && npx playwright install-deps
USER vscode
RUN npx playwright install chromium

# Install SpacetimeDB CLI (installs to ~/.local/bin)
RUN curl -sSf https://install.spacetimedb.com | sh -s -- --yes

# Add ~/.local/bin to PATH for SpacetimeDB CLI
ENV PATH="/home/vscode/.local/bin:${PATH}"

WORKDIR /workspaces/racetimetracker
