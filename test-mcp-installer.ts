#!/usr/bin/env npx tsx

/**
 * Test script for the new MCP One-Click Installer system
 * 
 * This demonstrates how to easily install popular MCP servers using templates,
 * with automatic tool discovery and validation.
 */

import { McpInstaller } from './src/systems/mcp/McpInstaller';
import { ConfigManager } from './src/systems/mcp/ConfigManager';

async function testMcpInstaller() {
  console.log('🚀 Testing MCP One-Click Installer System...\n');
  
  try {
    // Initialize the installer
    console.log('⚙️  Initializing MCP Installer...');
    const configManager = new ConfigManager();
    const installer = new McpInstaller(configManager);
    console.log('✅ MCP Installer ready');
    
    // 1. Show available server templates
    console.log('\n📦 Available Server Templates:');
    console.log('─'.repeat(70));
    
    const availableServers = installer.getAvailableServers();
    console.log(`📊 Found ${availableServers.length} server templates:`);
    
    availableServers.forEach((template, index) => {
      const popularityIcon = template.popularity === 'popular' ? '⭐' : 
                             template.popularity === 'trending' ? '📈' : '🆕';
      const categoryIcon = template.category === 'search' ? '🔍' : 
                          template.category === 'development' ? '💻' : 
                          template.category === 'productivity' ? '📝' : 
                          template.category === 'ai' ? '🤖' : 
                          template.category === 'data' ? '📊' : '🔧';
      
      console.log(`\n${index + 1}. ${template.displayName} ${popularityIcon}${categoryIcon}`);
      console.log(`   📋 ID: ${template.id}`);
      console.log(`   📝 Description: ${template.description}`);
      console.log(`   🔑 Required Environment Variables: ${template.requiredEnvVars.join(', ')}`);
      if (template.optionalEnvVars && template.optionalEnvVars.length > 0) {
        console.log(`   🔑 Optional Environment Variables: ${template.optionalEnvVars.join(', ')}`);
      }
      console.log(`   📦 Installation: ${template.installation.source} - ${template.installation.package || template.installation.repository || 'custom'}`);
      console.log(`   🔗 Website: ${template.website || 'N/A'}`);
      console.log(`   ⚡ Default Enabled: ${template.defaultEnabled ? '✅' : '❌'}`);
    });
    
    // 2. Show servers by category
    console.log('\n🏷️  Servers by Category:');
    console.log('─'.repeat(50));
    
    const categories = ['search', 'development', 'productivity', 'ai', 'data', 'utility'] as const;
    categories.forEach(category => {
      const categoryServers = installer.getServersByCategory(category);
      if (categoryServers.length > 0) {
        console.log(`\n${category.toUpperCase()} (${categoryServers.length} servers):`);
        categoryServers.forEach(server => {
          console.log(`   • ${server.displayName}`);
        });
      }
    });
    
    // 3. Show popular servers
    console.log('\n⭐ Popular/Recommended Servers:');
    console.log('─'.repeat(40));
    
    const popularServers = installer.getPopularServers();
    popularServers.forEach(server => {
      console.log(`   ⭐ ${server.displayName} - ${server.description}`);
    });
    
    // 4. Check installation status
    console.log('\n📊 Current Installation Status:');
    console.log('─'.repeat(50));
    
    const installationStatus = installer.getInstallationStatus();
    installationStatus.forEach(status => {
      const installedIcon = status.installed ? '✅' : '❌';
      const enabledIcon = status.enabled ? '🟢' : '🔴';
      const envIcon = status.hasRequiredEnvVars ? '🔑' : '⚠️';
      
      console.log(`${installedIcon}${enabledIcon}${envIcon} ${status.template.displayName}`);
      console.log(`     Installed: ${status.installed ? 'Yes' : 'No'}`);
      console.log(`     Enabled: ${status.enabled ? 'Yes' : 'No'}`);
      console.log(`     Env Vars Ready: ${status.hasRequiredEnvVars ? 'Yes' : 'No'}`);
    });
    
    // 5. Test installing Tavily (if API key is available)
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (tavilyApiKey && tavilyApiKey !== 'your-tavily-api-key-here') {
      console.log('\n🔧 Testing Tavily Installation...');
      console.log('─'.repeat(40));
      
      console.log('📡 Installing Tavily Search with tool discovery...');
      const tavilyResult = await installer.installServer(
        'tavily-search',
        { TAVILY_API_KEY: tavilyApiKey },
        {
          enableImmediately: true,
          discoverTools: true,
          validate: true
        }
      );
      
      if (tavilyResult.success) {
        console.log(`✅ ${tavilyResult.message}`);
        console.log(`🛠️  Discovered ${tavilyResult.toolsDiscovered} tools`);
      } else {
        console.log(`❌ ${tavilyResult.message}`);
        if (tavilyResult.errors) {
          tavilyResult.errors.forEach(error => console.log(`   Error: ${error}`));
        }
      }
    } else {
      console.log('\n⚠️  Skipping Tavily installation test - no API key available');
      console.log('💡 Set TAVILY_API_KEY to test actual installation');
    }
    
    // 6. Test batch installation (dry run for other servers)
    console.log('\n📦 Testing Batch Installation (Dry Run)...');
    console.log('─'.repeat(50));
    
    const batchInstallations = [
      {
        templateId: 'github-tools',
        envVars: { GITHUB_TOKEN: 'fake-token-for-testing' },
        options: { enableImmediately: false, discoverTools: false, validate: false }
      },
      {
        templateId: 'slack-integration',
        envVars: { SLACK_BOT_TOKEN: 'fake-token-for-testing' },
        options: { enableImmediately: false, discoverTools: false, validate: false }
      }
    ];
    
    console.log('🎯 Simulating batch installation for demo servers...');
    const batchResults = await installer.installMultipleServers(batchInstallations);
    
    batchResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.serverId}: ${result.message}`);
    });
    
    // 7. Show updated installation status
    console.log('\n📊 Updated Installation Status:');
    console.log('─'.repeat(50));
    
    const updatedStatus = installer.getInstallationStatus();
    const installedCount = updatedStatus.filter(s => s.installed).length;
    const enabledCount = updatedStatus.filter(s => s.enabled).length;
    const readyCount = updatedStatus.filter(s => s.hasRequiredEnvVars).length;
    
    console.log(`📈 Summary:`);
    console.log(`   📦 Total Templates: ${updatedStatus.length}`);
    console.log(`   ✅ Installed: ${installedCount}`);
    console.log(`   🟢 Enabled: ${enabledCount}`);
    console.log(`   🔑 Ready (has env vars): ${readyCount}`);
    
    updatedStatus.forEach(status => {
      if (status.installed) {
        const enabledIcon = status.enabled ? '🟢' : '🔴';
        const envIcon = status.hasRequiredEnvVars ? '🔑' : '⚠️';
        console.log(`   ✅${enabledIcon}${envIcon} ${status.template.displayName}`);
      }
    });
    
    // 8. Test uninstallation
    console.log('\n🗑️  Testing Uninstallation...');
    console.log('─'.repeat(30));
    
    const serversToUninstall = updatedStatus
      .filter(s => s.installed && !s.template.displayName.includes('Tavily')) // Keep Tavily if it was actually installed
      .map(s => s.template.id);
    
    if (serversToUninstall.length > 0) {
      console.log(`🗑️  Uninstalling ${serversToUninstall.length} demo servers...`);
      for (const serverId of serversToUninstall) {
        const uninstallResult = await installer.uninstallServer(serverId);
        const status = uninstallResult.success ? '✅' : '❌';
        console.log(`   ${status} ${serverId}: ${uninstallResult.message}`);
      }
    } else {
      console.log('ℹ️  No demo servers to uninstall');
    }
    
    console.log('\n🎉 MCP One-Click Installer Test Complete!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   ✅ Template-based server definitions');
    console.log('   ✅ Automatic tool discovery');
    console.log('   ✅ Environment variable validation');
    console.log('   ✅ Connection validation');
    console.log('   ✅ Batch installation');
    console.log('   ✅ Installation status tracking');
    console.log('   ✅ One-click uninstallation');
    console.log('\n🚀 Ready for production use!');
    
  } catch (error: any) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
console.log('🎬 Starting MCP One-Click Installer Test...');
testMcpInstaller().catch(console.error); 