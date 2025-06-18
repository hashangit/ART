#!/usr/bin/env npx tsx

/**
 * Debug script to discover what tools are actually available from Tavily MCP server
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function debugTavilyTools() {
  console.log('🔍 Discovering actual Tavily MCP tools...\n');
  
  try {
    // Create a direct connection to Tavily MCP server
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', 'tavily-mcp@0.1.4'],
      env: {
        ...process.env,
        TAVILY_API_KEY: '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'
      }
    });
    
    const client = new Client({
      name: 'ART Framework Debug',
      version: '0.1.0'
    });
    
    console.log('🔌 Connecting to Tavily MCP server...');
    await client.connect(transport);
    console.log('✅ Connected successfully!');
    
    // List available tools
    console.log('\n🛠️  Discovering tools...');
    const toolsResult = await client.listTools();
    
    console.log(`📊 Found ${toolsResult.tools.length} tools:`);
    toolsResult.tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. Tool Name: "${tool.name}"`);
      console.log(`   Description: ${tool.description}`);
      console.log(`   Input Schema:`, JSON.stringify(tool.inputSchema, null, 2));
    });
    
    // List available resources
    console.log('\n📚 Discovering resources...');
    const resourcesResult = await client.listResources();
    
    console.log(`📊 Found ${resourcesResult.resources.length} resources:`);
    resourcesResult.resources.forEach((resource, index) => {
      console.log(`\n${index + 1}. Resource URI: "${resource.uri}"`);
      console.log(`   Name: ${resource.name}`);
      console.log(`   Description: ${resource.description}`);
      if (resource.mimeType) {
        console.log(`   MIME Type: ${resource.mimeType}`);
      }
    });
    
    // Test a search if we found the right tool
    const searchTool = toolsResult.tools.find(tool => 
      tool.name.includes('search') || tool.name.includes('tavily')
    );
    
    if (searchTool) {
      console.log(`\n🔍 Testing search tool: "${searchTool.name}"`);
      try {
        const searchResult = await client.callTool({
          name: searchTool.name,
          arguments: {
            query: 'artificial intelligence 2024'
          }
        });
        
        console.log('✅ Search successful!');
        console.log('📊 Result:', JSON.stringify(searchResult, null, 2));
        
      } catch (error: any) {
        console.log(`❌ Search failed: ${error.message}`);
      }
    } else {
      console.log('\n⚠️  No search tool found');
    }
    
    // Close connection
    await client.close();
    console.log('\n🔌 Connection closed');
    
  } catch (error: any) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.error(error);
  }
}

// Run the debug
console.log('🎬 Starting Tavily MCP Debug...');
debugTavilyTools().catch(console.error); 