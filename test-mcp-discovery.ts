#!/usr/bin/env npx tsx

/**
 * Test script using the actual ART Framework MCP 2.0 discovery functionality
 */

import { McpManager } from './src/systems/mcp/McpManager';
import { ToolRegistry } from './src/systems/tool/ToolRegistry';
import { StateManager } from './src/systems/context/managers/StateManager';
import { StateRepository } from './src/systems/context/repositories/StateRepository';
import { InMemoryStorageAdapter } from './src/adapters/storage/inMemory';

async function testArtMcpDiscovery() {
  console.log('🚀 Testing ART Framework MCP 2.0 Discovery...\n');
  
  try {
    // Initialize minimal dependencies for McpManager
    console.log('⚙️  Setting up test environment...');
    const storageAdapter = new InMemoryStorageAdapter();
    await storageAdapter.init?.();
    
    const stateRepository = new StateRepository(storageAdapter);
    const stateManager = new StateManager(stateRepository, 'explicit');
    const toolRegistry = new ToolRegistry(stateManager);
    
    console.log('✅ Test environment ready');
    
    // Create McpManager instance
    const mcpManager = new McpManager(toolRegistry, stateManager);
    console.log('🔧 McpManager created');
    
    // Test discovery endpoints
    const endpoints = [
      'http://localhost:4200/api/services',
      'https://api.zyntopia.com/mcp-services', 
      'https://zyntopia.com/api/mcp-services'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n📡 Testing discovery from: ${endpoint}`);
      console.log('─'.repeat(70));
      
      try {
        console.log('🔍 Calling discoverAvailableServers...');
        const discoveredServers = await mcpManager.discoverAvailableServers(endpoint);
        
        console.log(`✅ Discovery successful!`);
        console.log(`📊 Found ${discoveredServers.length} MCP servers`);
        
        if (discoveredServers.length > 0) {
          console.log('\n🎯 Discovered MCP Servers:');
          discoveredServers.forEach((server, index) => {
            console.log(`\n${index + 1}. ${server.displayName || server.id}`);
            console.log(`   📋 ID: ${server.id}`);
            console.log(`   🔌 Type: ${server.type}`);
            console.log(`   📝 Description: ${server.description || 'No description'}`);
            console.log(`   ⚡ Enabled: ${server.enabled ? '✅' : '❌'}`);
            
            if (server.connection) {
              console.log(`   🔗 Connection: ${server.connection.type || 'unknown'}`);
              if (server.type === 'stdio') {
                const conn = server.connection as any;
                console.log(`   💻 Command: ${conn.command}`);
                if (conn.args) {
                  console.log(`   📝 Args: ${conn.args.join(' ')}`);
                }
              } else if (server.type === 'sse') {
                const conn = server.connection as any;
                console.log(`   🌐 URL: ${conn.url}`);
              }
            }
            
            if (server.tools && server.tools.length > 0) {
              console.log(`   🛠️  Tools (${server.tools.length}):`);
              server.tools.slice(0, 3).forEach(tool => {
                console.log(`      • ${tool.name}: ${tool.description || 'No description'}`);
              });
              if (server.tools.length > 3) {
                console.log(`      ... and ${server.tools.length - 3} more tools`);
              }
            } else {
              console.log(`   🛠️  Tools: None configured`);
            }
            
            if (server.resources && server.resources.length > 0) {
              console.log(`   📚 Resources: ${server.resources.length} available`);
            }
            
            if (server.installation) {
              console.log(`   📦 Installation: ${server.installation.source || 'unknown'}`);
            }
          });
          
          console.log('\n📋 MCPCard Structure Sample:');
          console.log(JSON.stringify(discoveredServers[0], null, 2));
        } else {
          console.log('ℹ️  No MCP servers discovered from this endpoint');
        }
        
      } catch (error: any) {
        if (error.message.includes('Discovery API failed')) {
          console.log(`❌ Discovery failed: ${error.message}`);
        } else {
          console.log(`❌ Error during discovery: ${error.message}`);
        }
      }
    }
    
    // Test full initialization with discovery
    console.log(`\n🎯 Testing full McpManager initialization with discovery...`);
    console.log('─'.repeat(70));
    
    try {
      console.log('🚀 Calling initialize() with discovery endpoint...');
      await mcpManager.initialize('http://localhost:4200/api/services');
      console.log('✅ McpManager initialization completed successfully!');
      console.log('🔧 Lazy proxy tools should now be registered in ToolRegistry');
      
      // Check what tools were registered
      const availableTools = await toolRegistry.getAvailableTools();
      console.log(`📊 Total tools available: ${availableTools.length}`);
      
      if (availableTools.length > 0) {
        console.log('\n🛠️  Registered Tools:');
        availableTools.forEach(tool => {
          console.log(`   • ${tool.name}: ${tool.description}`);
        });
      }
      
    } catch (error: any) {
      console.log(`⚠️  Initialization completed with warnings: ${error.message}`);
      console.log('   (This is expected if no discovery endpoints are available)');
    }
    
    console.log('\n🏁 ART MCP 2.0 Discovery Test Complete!');
    
  } catch (error: any) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testArtMcpDiscovery().catch(console.error); 