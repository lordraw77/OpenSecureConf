//=== examples/basic-usage.js ===

/**
 * Basic usage example for OpenSecureConf JavaScript Client
 */

const { OpenSecureConfClient } = require('opensecureconf-client');

async function main() {
  // Initialize the client
  const client = new OpenSecureConfClient({
    baseUrl: 'http://localhost:9000',
    userKey: 'my-secure-encryption-key',
    apiKey: 'your-super-secret-api-key-here', // Optional
  });

  try {
    // Create a new configuration
    const created = await client.create(
      'database-config',
      {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        ssl: true,
      },
      'database'
    );
    console.log('Created:', created);

    // Read a configuration
    const config = await client.read('database-config');
    console.log('Read:', config);

    // List all configurations
    const all = await client.list();
    console.log('All configs:', all.length);

    // Delete a configuration
    await client.delete('database-config');
    console.log('Deleted successfully');

  } catch (error) {
    if (error.name === 'OpenSecureConfError') {
      console.error('API Error:', error.statusCode, error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

main();
