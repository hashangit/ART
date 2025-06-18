#!/usr/bin/env npx tsx

/**
 * Script to fix the corrupted MCP config file
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { ArtMcpConfig, McpServerConfig } from './src/systems/mcp/types';

async function fixMcpConfig() {
  console.log('🔧 Fixing MCP configuration...\n');
  
  const configPath = path.join(homedir(), '.art', 'art_mcp_config.json');
  console.log(`📂 Config file: ${configPath}`);
  
  try {
    // Read current config
    let currentConfig: ArtMcpConfig;
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      currentConfig = JSON.parse(fileContent);
      console.log('✅ Current config loaded');
    } else {
      console.log('❌ Config file not found');
      return;
    }
    
    console.log('\n📋 Before fixing:');
    console.log(`   Total entries: ${Object.keys(currentConfig.mcpServers).length}`);
    Object.keys(currentConfig.mcpServers).forEach(key => {
      console.log(`   • "${key}"`);
    });
    
    // Create a new, clean config
    const cleanConfig: ArtMcpConfig = {
      mcpServers: {}
    };
    
    // Process each server entry
    for (const [serverId, serverConfig] of Object.entries(currentConfig.mcpServers)) {
      // Skip corrupted entries
      if (serverId === '[object Object]' || typeof serverConfig !== 'object' || serverConfig === false) {
        console.log(`🗑️  Removing corrupted entry: "${serverId}"`);
        continue;
      }
      
      // Ensure the server config has all required fields
      const fixedConfig: McpServerConfig = {
        id: serverConfig.id || serverId,
        type: serverConfig.type || 'stdio',
        enabled: serverConfig.enabled !== false, // Default to true
        displayName: serverConfig.displayName || serverId,
        description: serverConfig.description || `MCP server: ${serverId}`,
        connection: serverConfig.connection,
        installation: serverConfig.installation,
        timeout: serverConfig.timeout || 30000,
        tools: serverConfig.tools || [], // This was missing!
        resources: serverConfig.resources || [], // This was missing!
        resourceTemplates: serverConfig.resourceTemplates || [] // This was missing!
      };
      
      cleanConfig.mcpServers[serverId] = fixedConfig;
      console.log(`✅ Fixed configuration for "${serverId}"`);
    }
    
    // For Tavily specifically, add the tools definition that's missing
    if (cleanConfig.mcpServers.tavily_search_stdio) {
      const tavilyConfig = cleanConfig.mcpServers.tavily_search_stdio;
      if (!tavilyConfig.tools || tavilyConfig.tools.length === 0) {
        tavilyConfig.tools = [{
          name: 'search',
          description: 'A search engine optimized for comprehensive, accurate, and trusted results.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query.' },
              search_depth: { type: 'string', enum: ['basic', 'advanced'], description: 'The depth of the search.' },
              include_answer: { type: 'boolean', description: 'Whether to include a summary answer.' },
              include_raw_content: { type: 'boolean', description: 'Whether to include raw content.' },
              max_results: { type: 'number', description: 'Maximum number of results to return.' }
            },
            required: ['query']
          }
        }];
        console.log('🔧 Added tools definition for Tavily');
      }
    }
    
    // Save the fixed config
    fs.writeFileSync(configPath, JSON.stringify(cleanConfig, null, 2), 'utf-8');
    console.log('\n✅ Configuration fixed and saved!');
    
    console.log('\n📋 After fixing:');
    console.log(`   Total entries: ${Object.keys(cleanConfig.mcpServers).length}`);
    Object.entries(cleanConfig.mcpServers).forEach(([id, config]) => {
      const status = config.enabled ? '✅' : '❌';
      console.log(`   ${status} ${config.displayName} (${id})`);
      console.log(`      Tools: ${config.tools?.length || 0}`);
      console.log(`      Resources: ${config.resources?.length || 0}`);
    });
    
    console.log('\n🎉 Config is now ready for testing!');
    console.log('Run: npx tsx test-tavily-mcp.ts');
    
  } catch (error: any) {
    console.log(`❌ Failed to fix config: ${error.message}`);
    console.error(error);
  }
}

// Run the fix
console.log('🎬 Starting MCP Config Fix...');
fixMcpConfig().catch(console.error); 