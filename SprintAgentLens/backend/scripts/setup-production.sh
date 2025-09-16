#!/bin/bash

# SprintAgentLens Production Environment Setup Script
# This script sets up the production environment from scratch

set -e

# Configuration
PROJECT_NAME="sprintagentlens"
USER_NAME="sprintagentlens"
APP_DIR="/opt/sprintagentlens"
DATA_DIR="/var/lib/sprintagentlens"
LOG_DIR="/var/log/sprintagentlens"
BACKUP_DIR="/opt/backups/sprintagentlens"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Detect OS
detect_os() {
    log "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        error "Cannot detect operating system"
    fi
    
    log "Detected OS: $OS $VERSION"
}

# Install dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    case $OS in
        "ubuntu"|"debian")
            apt-get update
            apt-get install -y \
                curl \
                wget \
                git \
                unzip \
                software-properties-common \
                apt-transport-https \
                ca-certificates \
                gnupg \
                lsb-release \
                mysql-client \
                redis-tools \
                nginx \
                certbot \
                python3-certbot-nginx \
                htop \
                iotop \
                netstat-nat \
                ufw \
                fail2ban \
                logrotate \
                cron
            ;;
        "centos"|"rhel"|"fedora")
            yum update -y
            yum install -y \
                curl \
                wget \
                git \
                unzip \
                yum-utils \
                device-mapper-persistent-data \
                lvm2 \
                mysql \
                redis \
                nginx \
                certbot \
                python3-certbot-nginx \
                htop \
                iotop \
                net-tools \
                firewalld \
                fail2ban \
                logrotate \
                cronie
            ;;
        *)
            warn "Unsupported OS: $OS. Manual installation may be required."
            ;;
    esac
    
    success "System dependencies installed"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    success "Docker installed successfully"
}

# Install Node.js (for local development/tools)
install_nodejs() {
    log "Installing Node.js..."
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install global packages
    npm install -g pm2
    
    success "Node.js installed successfully"
}

# Create application user
create_app_user() {
    log "Creating application user..."
    
    # Create user if it doesn't exist
    if ! id "$USER_NAME" &>/dev/null; then
        useradd -r -s /bin/bash -d "$APP_DIR" "$USER_NAME"
        success "User $USER_NAME created"
    else
        log "User $USER_NAME already exists"
    fi
    
    # Add user to docker group
    usermod -aG docker "$USER_NAME"
    
    # Create directories
    mkdir -p "$APP_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Set ownership
    chown -R "$USER_NAME:$USER_NAME" "$APP_DIR"
    chown -R "$USER_NAME:$USER_NAME" "$DATA_DIR"
    chown -R "$USER_NAME:$USER_NAME" "$LOG_DIR"
    chown -R "$USER_NAME:$USER_NAME" "$BACKUP_DIR"
    
    success "Application directories created"
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    case $OS in
        "ubuntu"|"debian")
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing
            
            # Allow SSH
            ufw allow ssh
            
            # Allow HTTP/HTTPS
            ufw allow 80/tcp
            ufw allow 443/tcp
            
            # Allow application ports (only from localhost/private networks)
            ufw allow from 127.0.0.0/8 to any port 3000
            ufw allow from 10.0.0.0/8 to any port 3000
            ufw allow from 172.16.0.0/12 to any port 3000
            ufw allow from 192.168.0.0/16 to any port 3000
            
            # Allow monitoring ports (restricted)
            ufw allow from 127.0.0.0/8 to any port 9090  # Prometheus
            ufw allow from 127.0.0.0/8 to any port 3001  # Grafana
            
            ufw --force enable
            ;;
        "centos"|"rhel"|"fedora")
            systemctl start firewalld
            systemctl enable firewalld
            
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --permanent --add-port=3000/tcp --source=127.0.0.0/8
            firewall-cmd --permanent --add-port=9090/tcp --source=127.0.0.0/8
            firewall-cmd --permanent --add-port=3001/tcp --source=127.0.0.0/8
            
            firewall-cmd --reload
            ;;
    esac
    
    success "Firewall configured"
}

# Setup fail2ban
setup_fail2ban() {
    log "Setting up fail2ban..."
    
    # Create jail configuration for nginx
    cat > /etc/fail2ban/jail.d/nginx.conf << 'EOF'
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
bantime = 3600
maxretry = 3

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
bantime = 3600
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
bantime = 86400
maxretry = 1

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
bantime = 3600
maxretry = 0
EOF

    # Create jail for application
    cat > /etc/fail2ban/jail.d/sprintagentlens.conf << 'EOF'
[sprintagentlens-auth]
enabled = true
port = http,https
logpath = /var/log/sprintagentlens/combined.log
failregex = ^.*"event":"BRUTE_FORCE_.*"ip":"<HOST>".*$
bantime = 3600
findtime = 600
maxretry = 5
EOF

    systemctl restart fail2ban
    systemctl enable fail2ban
    
    success "Fail2ban configured"
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/sprintagentlens << 'EOF'
/var/log/sprintagentlens/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 sprintagentlens sprintagentlens
    postrotate
        docker-compose -f /opt/sprintagentlens/docker-compose.production.yml kill -s USR1 app
    endscript
}

/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        nginx -s reload
    endscript
}
EOF

    success "Log rotation configured"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up system monitoring..."
    
    # Install Node Exporter for Prometheus
    wget -O /tmp/node_exporter.tar.gz https://github.com/prometheus/node_exporter/releases/latest/download/node_exporter-1.6.1.linux-amd64.tar.gz
    tar -xzf /tmp/node_exporter.tar.gz -C /tmp/
    cp /tmp/node_exporter-*/node_exporter /usr/local/bin/
    
    # Create systemd service
    cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=nobody
Group=nobody
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl start node_exporter
    systemctl enable node_exporter
    
    success "Monitoring setup completed"
}

# Setup SSL certificates
setup_ssl() {
    local domain=${1:-localhost}
    
    log "Setting up SSL certificates for $domain..."
    
    if [[ "$domain" != "localhost" ]]; then
        # Get Let's Encrypt certificate
        certbot --nginx -d "$domain" --non-interactive --agree-tos --email admin@"$domain"
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    else
        # Generate self-signed certificate for localhost
        mkdir -p /etc/nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/key.pem \
            -out /etc/nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$domain"
    fi
    
    success "SSL certificates configured"
}

# Setup backup automation
setup_backup_automation() {
    log "Setting up automated backups..."
    
    cat > /usr/local/bin/sprintagentlens-backup << 'EOF'
#!/bin/bash
cd /opt/sprintagentlens
sudo -u sprintagentlens /opt/sprintagentlens/scripts/deploy.sh backup
EOF
    chmod +x /usr/local/bin/sprintagentlens-backup
    
    # Setup daily backups
    echo "0 2 * * * /usr/local/bin/sprintagentlens-backup" | crontab -u "$USER_NAME" -
    
    success "Backup automation configured"
}

# Setup health monitoring
setup_health_monitoring() {
    log "Setting up health monitoring..."
    
    cat > /usr/local/bin/sprintagentlens-health-check << 'EOF'
#!/bin/bash

HEALTH_URL="http://localhost/health/ping"
ALERT_EMAIL="${ALERT_EMAIL:-admin@localhost}"

if ! curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    echo "SprintAgentLens health check failed at $(date)" | mail -s "SprintAgentLens Health Alert" "$ALERT_EMAIL"
    logger "SprintAgentLens health check failed"
fi
EOF
    chmod +x /usr/local/bin/sprintagentlens-health-check
    
    # Run health check every 5 minutes
    echo "*/5 * * * * /usr/local/bin/sprintagentlens-health-check" | crontab -u "$USER_NAME" -
    
    success "Health monitoring configured"
}

# Setup system optimization
setup_system_optimization() {
    log "Optimizing system settings..."
    
    # Optimize kernel parameters
    cat >> /etc/sysctl.conf << 'EOF'

# SprintAgentLens optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
fs.file-max = 65535
EOF

    # Optimize file limits
    cat >> /etc/security/limits.conf << 'EOF'

# SprintAgentLens file limits
sprintagentlens soft nofile 65535
sprintagentlens hard nofile 65535
sprintagentlens soft nproc 32768
sprintagentlens hard nproc 32768
EOF

    # Apply settings
    sysctl -p
    
    success "System optimization completed"
}

# Main setup function
main() {
    local domain=${1:-localhost}
    local setup_ssl_cert=${2:-false}
    
    log "Starting SprintAgentLens production environment setup..."
    
    check_root
    detect_os
    install_dependencies
    install_docker
    install_nodejs
    create_app_user
    setup_firewall
    setup_fail2ban
    setup_logrotate
    setup_monitoring
    
    if [[ "$setup_ssl_cert" == "true" ]]; then
        setup_ssl "$domain"
    fi
    
    setup_backup_automation
    setup_health_monitoring
    setup_system_optimization
    
    success "Production environment setup completed!"
    
    log "Next steps:"
    log "1. Copy your application code to $APP_DIR"
    log "2. Configure environment variables in .env.production"
    log "3. Run deployment script: $APP_DIR/scripts/deploy.sh deploy"
    log "4. Configure DNS to point to this server"
    log "5. Update SSL certificates if using custom domain"
    
    log "Useful commands:"
    log "- View application logs: docker-compose -f $APP_DIR/docker-compose.production.yml logs -f"
    log "- Check application status: docker-compose -f $APP_DIR/docker-compose.production.yml ps"
    log "- Deploy updates: $APP_DIR/scripts/deploy.sh deploy"
    log "- Create backup: $APP_DIR/scripts/deploy.sh backup"
    log "- Rollback: $APP_DIR/scripts/deploy.sh rollback"
}

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [domain] [setup_ssl]"
    echo ""
    echo "Parameters:"
    echo "  domain     - Domain name for SSL certificate (default: localhost)"
    echo "  setup_ssl  - Whether to setup SSL certificate (true/false, default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Basic setup with localhost"
    echo "  $0 example.com true                  # Setup with custom domain and SSL"
    echo "  $0 api.sprintagentlens.com true      # Production setup"
    exit 1
fi

# Run main function
main "$@"