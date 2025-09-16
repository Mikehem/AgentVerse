#!/bin/bash

# ClickHouse Setup Script for macOS ARM64
# This script downloads and sets up ClickHouse server for local development

set -e

echo "🚀 Setting up ClickHouse for SprintAgentLens..."

# Create clickhouse directory
CLICKHOUSE_DIR="$HOME/.clickhouse"
mkdir -p "$CLICKHOUSE_DIR"
cd "$CLICKHOUSE_DIR"

# Download ClickHouse binary from GitHub releases
echo "📥 Downloading ClickHouse binary..."
CLICKHOUSE_VERSION="25.8.2.29-lts"
CLICKHOUSE_URL="https://github.com/ClickHouse/ClickHouse/releases/download/v${CLICKHOUSE_VERSION}/clickhouse-macos-aarch64"

curl -L -o clickhouse-server "$CLICKHOUSE_URL"
chmod +x clickhouse-server

# Create symlinks for different ClickHouse tools
ln -sf clickhouse-server clickhouse-client
ln -sf clickhouse-server clickhouse

echo "✅ ClickHouse binary installed to $CLICKHOUSE_DIR"

# Create configuration directory
CONFIG_DIR="$CLICKHOUSE_DIR/config"
mkdir -p "$CONFIG_DIR"

# Create basic server configuration
cat > "$CONFIG_DIR/config.xml" << 'EOF'
<clickhouse>
    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
    
    <path>./data/</path>
    <tmp_path>./tmp/</tmp_path>
    <user_files_path>./user_files/</user_files_path>
    
    <users_config>users.xml</users_config>
    
    <default_profile>default</default_profile>
    <default_database>default</default_database>
    
    <timezone>UTC</timezone>
    
    <listen_host>127.0.0.1</listen_host>
    <listen_host>::1</listen_host>
    
    <logger>
        <level>information</level>
        <console>1</console>
        <size>1000M</size>
        <count>3</count>
    </logger>
    
    <asynchronous_metrics>
        <update_period_seconds>60</update_period_seconds>
    </asynchronous_metrics>
</clickhouse>
EOF

# Create users configuration
cat > "$CONFIG_DIR/users.xml" << 'EOF'
<clickhouse>
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <use_uncompressed_cache>0</use_uncompressed_cache>
            <load_balancing>random</load_balancing>
        </default>
    </profiles>
    
    <users>
        <default>
            <password></password>
            <networks>
                <ip>127.0.0.1</ip>
                <ip>::1</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </default>
    </users>
    
    <quotas>
        <default>
            <interval>
                <duration>3600</duration>
                <queries>0</queries>
                <errors>0</errors>
                <result_rows>0</result_rows>
                <read_rows>0</read_rows>
                <execution_time>0</execution_time>
            </interval>
        </default>
    </quotas>
</clickhouse>
EOF

# Create data directories
mkdir -p "$CLICKHOUSE_DIR/data"
mkdir -p "$CLICKHOUSE_DIR/tmp"
mkdir -p "$CLICKHOUSE_DIR/user_files"
mkdir -p "$CLICKHOUSE_DIR/logs"

echo "⚙️  Configuration files created"

# Create startup script
cat > "$CLICKHOUSE_DIR/start-server.sh" << EOF
#!/bin/bash
cd "$CLICKHOUSE_DIR"
./clickhouse-server --config-file=config/config.xml --pid-file=clickhouse-server.pid --daemon
echo "🚀 ClickHouse server started on http://localhost:8123"
EOF

chmod +x "$CLICKHOUSE_DIR/start-server.sh"

# Create stop script
cat > "$CLICKHOUSE_DIR/stop-server.sh" << EOF
#!/bin/bash
cd "$CLICKHOUSE_DIR"
if [ -f clickhouse-server.pid ]; then
    kill \$(cat clickhouse-server.pid) 2>/dev/null || true
    rm -f clickhouse-server.pid
    echo "🛑 ClickHouse server stopped"
else
    echo "ClickHouse server is not running"
fi
EOF

chmod +x "$CLICKHOUSE_DIR/stop-server.sh"

# Add to PATH (optional)
echo "📝 Adding ClickHouse to PATH..."
if ! grep -q "$CLICKHOUSE_DIR" ~/.zshrc 2>/dev/null; then
    echo "export PATH=\"$CLICKHOUSE_DIR:\$PATH\"" >> ~/.zshrc
    echo "Added ClickHouse to ~/.zshrc"
fi

echo "✅ ClickHouse setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start ClickHouse server: $CLICKHOUSE_DIR/start-server.sh"
echo "2. Test connection: curl http://localhost:8123/"
echo "3. Stop server: $CLICKHOUSE_DIR/stop-server.sh"
echo ""
echo "🔗 Server will be available at:"
echo "   HTTP: http://localhost:8123"
echo "   TCP: localhost:9000"
echo ""
EOF