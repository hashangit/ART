#!/usr/bin/env npx tsx

/**
 * Test script to verify Tavily MCP integration with ART Framework MCP 2.0
 * This tests the full end-to-end MCP tool execution workflow
 */

import { McpManager } from './src/systems/mcp/McpManager';
import { ToolRegistry } from './src/systems/tool/ToolRegistry';
import { StateManager } from './src/systems/context/managers/StateManager';
import { StateRepository } from './src/systems/context/repositories/StateRepository';
import { InMemoryStorageAdapter } from './src/adapters/storage/inMemory';
import { generateUUID } from './src/utils/uuid';

async function testTavilyMcp() {
  console.log('🔍 Testing Tavily MCP Integration with ART Framework...\n');
  
  try {
    // Check if TAVILY_API_KEY is available
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      console.log('⚠️  TAVILY_API_KEY environment variable not found');
      console.log('💡 Please set it to test Tavily MCP integration:');
      console.log('   export TAVILY_API_KEY="your-tavily-api-key"');
      console.log('\n🔄 Continuing with test setup anyway...\n');
    } else {
      console.log('✅ TAVILY_API_KEY found in environment');
    }
    
    // Initialize test environment
    console.log('⚙️  Setting up test environment...');
    const storageAdapter = new InMemoryStorageAdapter();
    await storageAdapter.init?.();
    
    const stateRepository = new StateRepository(storageAdapter);
    const stateManager = new StateManager(stateRepository, 'explicit');
    const toolRegistry = new ToolRegistry(stateManager);
    
    console.log('✅ Test environment ready');
    
    // Create McpManager and initialize with local config
    console.log('🔧 Creating McpManager...');
    const mcpManager = new McpManager(toolRegistry, stateManager);
    
    console.log('🚀 Initializing McpManager with local config...');
    await mcpManager.initialize(); // This will read from ~/.art/art_mcp_config.json
    
    console.log('✅ McpManager initialization complete');
    
    // Check what tools are available
    const availableTools = await toolRegistry.getAvailableTools();
    console.log(`📊 Total tools registered: ${availableTools.length}`);
    
    if (availableTools.length === 0) {
      console.log('❌ No tools found! This could mean:');
      console.log('   • ~/.art/art_mcp_config.json doesn\'t exist or has no enabled servers');
      console.log('   • Tavily server is not enabled in the config');
      console.log('   • There was an error reading the config');
      return;
    }
    
    console.log('\n🛠️  Available Tools:');
    availableTools.forEach(tool => {
      console.log(`   • ${tool.name}: ${tool.description}`);
    });
    
    // Look for Tavily search tool
    const tavilySearchTool = availableTools.find(tool => 
      tool.name.includes('tavily-search') || 
      (tool.name.includes('search') && tool.name.includes('tavily'))
    );
    
    if (!tavilySearchTool) {
      console.log('\n❌ Tavily search tool not found in available tools');
      console.log('💡 Expected tool name pattern: mcp_tavily_search_stdio_tavily-search');
      console.log('🔧 Check your ~/.art/art_mcp_config.json configuration');
      return;
    }
    
    console.log(`\n🎯 Found Tavily search tool: ${tavilySearchTool.name}`);
    console.log(`📝 Description: ${tavilySearchTool.description}`);
    
    // Prepare test search query
    const testQuery = 'latest developments in artificial intelligence 2024';
    console.log(`\n🔍 Testing search query: "${testQuery}"`);
    console.log('─'.repeat(70));
    
    // Get the tool executor
    const toolExecutor = await toolRegistry.getToolExecutor(tavilySearchTool.name);
    if (!toolExecutor) {
      console.log('❌ Could not get tool executor');
      return;
    }
    
    console.log('✅ Tool executor obtained');
    
    // Prepare execution context
    const executionContext = {
      threadId: 'test-thread-' + generateUUID(),
      traceId: 'test-trace-' + generateUUID(),
      userId: 'test-user'
    };
    
    console.log(`🎯 Execution Context:`);
    console.log(`   Thread ID: ${executionContext.threadId}`);
    console.log(`   Trace ID: ${executionContext.traceId}`);
    
    // Prepare search arguments based on Tavily's expected schema
    const searchArgs = {
      query: testQuery,
      search_depth: 'basic', // or 'advanced'
      include_answer: true,
      include_raw_content: false,
      max_results: 5
    };
    
    console.log('\n📋 Search Arguments:');
    console.log(JSON.stringify(searchArgs, null, 2));
    
    if (!tavilyApiKey) {
      console.log('\n⚠️  Skipping actual tool execution due to missing TAVILY_API_KEY');
      console.log('🎯 Tool setup and discovery test completed successfully!');
      return;
    }
    
    // Execute the tool
    console.log('\n🚀 Executing Tavily search tool...');
    const startTime = Date.now();
    
    try {
      const result = await toolExecutor.execute(searchArgs, executionContext);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Tool execution completed in ${executionTime}ms`);
      console.log('\n📊 Tool Result:');
      console.log('─'.repeat(50));
      console.log(`🔧 Tool Name: ${result.toolName}`);
      console.log(`📋 Call ID: ${result.callId}`);
      console.log(`✅ Status: ${result.status}`);
      
      if (result.status === 'success') {
        console.log('\n🎯 Search Results:');
        if (result.output) {
          // Pretty print the Tavily response
          if (typeof result.output === 'object') {
            console.log(JSON.stringify(result.output, null, 2));
            
            // Extract and display key information if it's a typical Tavily response
            if (result.output.results && Array.isArray(result.output.results)) {
              console.log(`\n📄 Found ${result.output.results.length} search results:`);
              result.output.results.forEach((item: any, index: number) => {
                console.log(`\n${index + 1}. ${item.title || 'No title'}`);
                console.log(`   🔗 URL: ${item.url || 'No URL'}`);
                console.log(`   📝 Content: ${(item.content || 'No content').substring(0, 200)}...`);
                if (item.score) {
                  console.log(`   ⭐ Score: ${item.score}`);
                }
              });
            }
            
            if (result.output.answer) {
              console.log(`\n💡 AI Answer: ${result.output.answer}`);
            }
          } else {
            console.log(result.output);
          }
        } else {
          console.log('No output data returned');
        }
        
        if (result.metadata) {
          console.log('\n📊 Execution Metadata:');
          console.log(JSON.stringify(result.metadata, null, 2));
        }
        
        console.log('\n🎉 Tavily MCP integration test PASSED!');
        console.log('✅ MCP 2.0 lazy proxy system is working correctly');
        
      } else {
        console.log(`❌ Tool execution failed: ${result.error}`);
        if (result.error?.includes('API key')) {
          console.log('💡 This might be an API key issue. Check your TAVILY_API_KEY');
        }
      }
      
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(`❌ Tool execution failed after ${executionTime}ms`);
      console.log(`Error: ${error.message}`);
      
      if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
        console.log('\n💡 This might be because the Tavily MCP package is not installed globally');
        console.log('🔧 Try installing it: npm install -g tavily-mcp');
      } else if (error.message.includes('API key')) {
        console.log('\n💡 API key issue detected');
        console.log('🔧 Make sure TAVILY_API_KEY is set correctly');
      } else if (error.message.includes('timeout')) {
        console.log('\n💡 Connection timeout - the MCP server might be slow to start');
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Test setup failed: ${error.message}`);
    console.error(error);
  }
  
  console.log('\n🏁 Tavily MCP Integration Test Complete!');
}

// Run the test
console.log('🎬 Starting Tavily MCP Integration Test...');
testTavilyMcp().catch(console.error); 