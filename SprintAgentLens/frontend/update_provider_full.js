const Database = require('better-sqlite3');
const path = require('path');

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db');

try {
    // Initialize database
    const db = new Database(dbPath);
    
    // Update the provider with correct config and credentials
    const stmt = db.prepare(`
        UPDATE llm_providers 
        SET config = ?, credentials = ?, updated_at = ?
        WHERE id = ?
    `);
    
    const config = JSON.stringify({
        endpoint: "https://dr-ai-dev-1001.openai.azure.com",
        deployment: "msgen4o",
        apiVersion: "2023-07-01-preview"
    });
    
    const credentials = JSON.stringify({
        apiKey: "580d87fc2e114ce6b484e72334dc84e9"
    });
    
    const result = stmt.run(
        config,
        credentials,
        new Date().toISOString(),
        "span_1758599279713_5c9x432u"
    );
    
    console.log(`✅ Updated provider config and credentials. Changes: ${result.changes}`);
    
    // Verify the update
    const verify = db.prepare('SELECT * FROM llm_providers WHERE id = ?').get("span_1758599279713_5c9x432u");
    console.log(`✅ Provider status: ${verify.status}`);
    console.log(`✅ Config: ${verify.config}`);
    console.log(`✅ Credentials: ${verify.credentials ? 'Set' : 'Not set'}`);
    
    db.close();
    
} catch (error) {
    console.error('❌ Error updating provider:', error.message);
}