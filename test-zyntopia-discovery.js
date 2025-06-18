#!/usr/bin/env node

/**
 * Test script to discover MCP servers from Zyntopia discovery endpoint
 * This tests the new MCP 2.0 discovery functionality
 */

async function testZyntopiaDiscovery() {
  console.log('🔍 Testing Zyntopia MCP Server Discovery...\n');
  
  const endpoints = [
    'http://localhost:4200/api/services',        // Default local Zyntopia
    'https://api.zyntopia.com/mcp-services',     // Production Zyntopia
    'https://zyntopia.com/api/mcp-services'      // Alternative endpoint
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing endpoint: ${endpoint}`);
    console.log('─'.repeat(60));
    
    try {
      console.log('⏳ Fetching services...');
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ART-Framework-MCP/2.0-Test'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Response received (${response.status})`);
      
      // Handle different response formats
      const services = Array.isArray(data) ? data : (data.services || []);
      console.log(`📦 Total services found: ${services.length}`);
      
      // Filter for MCP services
      const mcpServices = services.filter(service => 
        service.service_type === 'MCP_SERVICE' || 
        service.type === 'MCP_SERVICE' ||
        service.serviceType === 'MCP_SERVICE'
      );
      
      console.log(`🔧 MCP services found: ${mcpServices.length}`);
      
      if (mcpServices.length === 0) {
        console.log('ℹ️  No MCP services found in response');
        if (services.length > 0) {
          console.log('📋 Available service types:');
          const types = [...new Set(services.map(s => s.service_type || s.type || s.serviceType || 'unknown'))];
          types.forEach(type => console.log(`   • ${type}`));
        }
      } else {
        console.log('\n🎯 MCP Services Details:');
        mcpServices.forEach((service, index) => {
          console.log(`\n${index + 1}. ${service.name || service.displayName || service.id}`);
          console.log(`   ID: ${service.id}`);
          console.log(`   Type: ${service.service_type || service.type || service.serviceType}`);
          console.log(`   Description: ${service.description || 'No description'}`);
          
          if (service.connection) {
            console.log(`   Connection: ${service.connection.type || 'unknown'}`);
            if (service.connection.type === 'stdio') {
              console.log(`   Command: ${service.connection.command}`);
              if (service.connection.args) {
                console.log(`   Args: ${service.connection.args.join(' ')}`);
              }
            } else if (service.connection.type === 'sse') {
              console.log(`   URL: ${service.connection.url}`);
            }
          }
          
          if (service.tools && Array.isArray(service.tools)) {
            console.log(`   Tools: ${service.tools.length} available`);
            service.tools.slice(0, 3).forEach(tool => {
              console.log(`     • ${tool.name}: ${tool.description || 'No description'}`);
            });
            if (service.tools.length > 3) {
              console.log(`     ... and ${service.tools.length - 3} more`);
            }
          }
          
          console.log(`   Enabled: ${service.enabled !== false ? '✅' : '❌'}`);
        });
      }
      
      // Show sample raw response (first few services)
      if (services.length > 0) {
        console.log('\n📄 Sample Raw Response:');
        console.log(JSON.stringify(services.slice(0, 1), null, 2));
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏰ Request timed out after 10 seconds');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('🌐 Network error - endpoint may not exist or be accessible');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🏁 Discovery test complete!');
  console.log('\n💡 Note: If no endpoints respond, you can:');
  console.log('   • Start a local Zyntopia instance on port 4200');
  console.log('   • Check if production endpoints are accessible');
  console.log('   • Verify your network connection');
}

// Run the test
testZyntopiaDiscovery().catch(console.error); 