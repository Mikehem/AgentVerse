const Database = require('better-sqlite3');
const path = require('path');

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db');

try {
    // Initialize database
    const db = new Database(dbPath);
    
    // Update the provider with correct credentials
    const stmt = db.prepare(`
        UPDATE llm_providers 
        SET credentials = ?, updated_at = ?
        WHERE id = ?
    `);
    
    const credentials = JSON.stringify({
        apiKey: "580d87fc2e114ce6b484e72334dc84e9"
    });
    
    const result = stmt.run(
        credentials,
        new Date().toISOString(),
        "span_1758599279713_5c9x432u"
    );
    
    console.log(`✅ Updated provider credentials. Changes: ${result.changes}`);
    
    // Verify the update
    const verify = db.prepare('SELECT * FROM llm_providers WHERE id = ?').get("span_1758599279713_5c9x432u");
    console.log(`✅ Provider status: ${verify.status}`);
    console.log(`✅ Credentials updated: ${verify.credentials ? 'Yes' : 'No'}`);
    
    db.close();
    
} catch (error) {
    console.error('❌ Error updating provider:', error.message);
}