#!/usr/bin/env npx tsx

/**
 * Helper script to set up Tavily MCP configuration for testing
 */

import { ConfigManager } from './src/systems/mcp/ConfigManager';
import { ArtMcpConfig, McpServerConfig } from './src/systems/mcp/types';

async function setupTavilyConfig() {
  console.log('🔧 Setting up Tavily MCP configuration...\n');
  
  try {
    const configManager = new ConfigManager();
    
    // Get existing config (ConfigManager automatically creates default config with Tavily)
    const config = configManager.getConfig();
    console.log('✅ Loaded MCP configuration');
    
    // Check if Tavily is already configured and enabled
    const tavilyServers = Object.entries(config.mcpServers).filter(([id, server]) => 
      (server.id && server.id.includes('tavily')) || 
      (server.displayName && server.displayName.toLowerCase().includes('tavily')) ||
      id.includes('tavily')
    );
    
    if (tavilyServers.length > 0) {
      console.log('✅ Tavily MCP configuration already exists');
      
      // Check if we need to update the API key
      const currentApiKey = process.env.TAVILY_API_KEY;
      if (currentApiKey && currentApiKey !== 'your-tavily-api-key-here') {
        const [serverId, serverConfig] = tavilyServers[0];
        if (serverConfig.connection && 'env' in serverConfig.connection) {
          if (serverConfig.connection.env?.TAVILY_API_KEY !== currentApiKey) {
            console.log('🔄 Updating API key from environment...');
            serverConfig.connection.env.TAVILY_API_KEY = currentApiKey;
            configManager.setServerConfig(serverId, serverConfig);
            console.log('✅ API key updated successfully');
          }
        }
      }
    } else {
      console.log('➕ Adding Tavily MCP configuration...');
      
      // Add Tavily MCP server config
      const tavilyServer: McpServerConfig = {
        id: 'tavily_search_custom',
        type: 'stdio',
        enabled: true,
        displayName: 'Tavily Search (Custom)',
        description: 'Real-time web search API for AI applications',
        connection: {
          command: 'npx',
          args: ['-y', 'tavily-mcp'],
          env: {
            TAVILY_API_KEY: process.env.TAVILY_API_KEY || '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'
          }
        },
        installation: {
          source: 'npm',
          package: 'tavily-mcp'
        },
        tools: [{
          name: 'search',
          description: 'A search engine optimized for comprehensive, accurate, and trusted results.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query.' }
            },
            required: ['query']
          }
        }],
        resources: [],
        resourceTemplates: []
      };
      
      configManager.setServerConfig('tavily_search_custom', tavilyServer);
      console.log('✅ Tavily MCP configuration added successfully');
    }
    
    // Display current config
    console.log('\n📋 Current MCP Configuration:');
    console.log(`📂 Config file: ~/.art/art_mcp_config.json`);
    console.log(`📦 Total servers: ${Object.keys(config.mcpServers).length}`);
    
    console.log('\n🛠️  Configured MCP Servers:');
    Object.entries(config.mcpServers).forEach(([id, server]) => {
      const status = server.enabled ? '✅' : '❌';
      console.log(`   ${status} ${server.displayName || server.id} (${id})`);
      console.log(`      Type: ${server.type}`);
      console.log(`      Description: ${server.description || 'No description'}`);
      
      if (server.connection && 'command' in server.connection) {
        console.log(`      Command: ${server.connection.command} ${(server.connection.args || []).join(' ')}`);
        if (server.connection.env?.TAVILY_API_KEY) {
          const keyPreview = server.connection.env.TAVILY_API_KEY.length > 20 
            ? server.connection.env.TAVILY_API_KEY.substring(0, 8) + '...' 
            : server.connection.env.TAVILY_API_KEY;
          console.log(`      API Key: ${keyPreview}`);
        }
      } else if (server.connection && 'url' in server.connection) {
        console.log(`      URL: ${server.connection.url}`);
      }
      
      console.log(`      Tools: ${server.tools?.length || 0} available`);
      (server.tools || []).forEach(tool => {
        console.log(`        • ${tool.name}: ${tool.description || 'No description'}`);
      });
      console.log('');
    });
    
    // Check environment
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey || tavilyApiKey === 'your-tavily-api-key-here') {
      console.log('⚠️  Environment Setup Required:');
      console.log('   The TAVILY_API_KEY environment variable is not set or uses placeholder value.');
      console.log('   Please set it before running the test:');
      console.log('   export TAVILY_API_KEY="your-actual-tavily-api-key"');
      console.log('');
      console.log('💡 Get your API key from: https://tavily.com/');
    } else {
      console.log('✅ TAVILY_API_KEY environment variable is set');
    }
    
    console.log('\n✨ Setup complete! You can now run:');
    console.log('   npx tsx test-tavily-mcp.ts');
    
  } catch (error: any) {
    console.log(`❌ Setup failed: ${error.message}`);
    console.error(error);
  }
}

// Run the setup
console.log('🎬 Starting Tavily MCP Setup...');
setupTavilyConfig().catch(console.error); 