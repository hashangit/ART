0## MCP in the ART Framework

### What this guide covers
- **Data model** expected by ART's MCP implementation
- **How discovery service cards map** to ART's `McpServerConfig`
- **Minimal ArtMcpConfig JSON** for a production-ready Linear HTTP server
- **Initialization & usage** with `McpManager` and proxy tools
- **Auth & CORS requirements** and troubleshooting
- The exact **Linear sample service card** and **discovery schema** (unchanged)

### Architecture overview
- **ConfigManager**: Loads/persists `ArtMcpConfig` in `localStorage` under `art_mcp_config`, validates and auto-fixes missing arrays (`tools`, `resources`, `resourceTemplates`).
- **McpManager**: Reads config, optionally merges discovery results, pre-registers proxy tools, manages on-demand connections and authentication, and uninstalls servers.
- **McpProxyTool**: Wraps each MCP tool as an ART tool (schema-first), name format: `mcp_{serverId}_{toolName}`.
- **McpClientController**: Handles OAuth 2.1 + PKCE, session persistence, CORS via companion extension, streamable HTTP transport, tool listing/calls, token refresh, and sticky `Mcp-Session-Id`.
- **Persistence**:
  - `localStorage`: `art_mcp_config`, `mcp_client_id`
  - `sessionStorage`: `access_token`, `refresh_token`, `token_expires_at`, `mcp_oauth_discovery`, `mcp_session_id`, `code_verifier`, `state`

### Data model expected by ART
- **ArtMcpConfig**: root object `{ mcpServers: Record<string, McpServerConfig> }`
- **McpServerConfig** (per-server “card”):
  - `id`: unique id (used in tool name prefix)
  - `type`: `'streamable-http'` (browser-supported transport)
  - `enabled`: boolean
  - `displayName?`, `description?`
  - `connection`: `StreamableHttpConnection` with `url` and optional `oauth`
  - `installation?`: `{ source: 'git' | 'npm' | 'manual', ... }`
  - `timeout?`: ms
  - `tools`: `McpToolDefinition[]` (pre-registration hints; live discovery can replace/update)
  - `resources`: `McpResource[]` (reserved; current client does not consume)
  - `resourceTemplates`: `McpResourceTemplate[]` (reserved)
- **StreamableHttpConnection**:
  - `url`: MCP stream endpoint
  - `headers?`, `authStrategyId?`
  - `oauth?` (PKCE): `{ type: 'pkce', authorizationEndpoint, tokenEndpoint, clientId, scopes, redirectUri, resource?, openInNewTab?, channelName? }`
- **McpToolDefinition**: `{ name, description?, inputSchema, outputSchema? }`

### Mapping: Discovery Service Card → ART `McpServerConfig`
Use this one-way mapping to derive a config entry from a service card returned by your discovery endpoint (service_type = MCP_SERVICE):
- **Server identity**
  - `id`: choose a stable identifier (e.g., `installation.configurationExtract.mcpServers[<key>]` such as `linear-http`)
  - `displayName`: `business.name`
  - `description`: `business.description`
- **Transport**
  - `type`: `'streamable-http'` (ART browser transport)
  - `connection.url`: `specification.transport.endpoints.http`
- **Authentication (OAuth 2.1 + PKCE)**
  - `connection.oauth.type`: `'pkce'`
  - `connection.oauth.authorizationEndpoint`: `specification.authentication.authUrl`
  - `connection.oauth.tokenEndpoint`: `specification.authentication.tokenUrl`
  - `connection.oauth.clientId`: if using dynamic registration, set a placeholder like `'public'` (ART will register or synthesize an id at runtime)
  - `connection.oauth.scopes`: space-delimited join of `specification.authentication.scopes` (e.g., "read write issues:create")
  - `connection.oauth.redirectUri`: your app callback, e.g., `https://your.app/callback`
  - `connection.oauth.resource?`: base MCP resource (often the same as `connection.url`)
- **Tools (optional pre-registration hints)**
  - For each entry in `specification.tools`, copy `name`, `description`, and the JSON `inputSchema` into `McpToolDefinition`. Omit `outputFormat` or translate it to `outputSchema` if you have a concrete JSON Schema.
- **Resources / Templates**
  - If the card lists resources, map them to `McpResource` (requires `uri` and `name`). If a URI isn’t provided by the card, leave `resources: []`.
- **Discovery-only fields**
  - `registry`, `business.pricing`, operational metrics, etc., are not used at runtime by ART, but may be shown in your own UI.

### Minimal ArtMcpConfig JSON (Linear HTTP)
This is a minimal, ready-to-use config entry derived from the sample Linear service card for the ART framework. It includes tool hints for immediate proxy registration; live discovery can refine them later.

```json
{
  "mcpServers": {
    "linear-http": {
      "id": "linear-http",
      "type": "streamable-http",
      "enabled": true,
      "displayName": "Linear MCP Server",
      "description": "Linear MCP server using direct HTTP transport for issue tracking, project management, and team collaboration. Connects directly to Linear's remote MCP endpoint for seamless workflow integration.",
      "connection": {
        "url": "https://mcp.linear.app/mcp",
        "oauth": {
          "type": "pkce",
          "authorizationEndpoint": "https://linear.app/oauth/authorize",
          "tokenEndpoint": "https://linear.app/oauth/token",
          "clientId": "public",
          "scopes": "read write issues:create",
          "redirectUri": "https://your.app/callback",
          "resource": "https://mcp.linear.app/mcp"
        }
      },
      "timeout": 30000,
      "tools": [
        {
          "name": "list_issues",
          "description": "List and filter issues in your Linear workspace with advanced search capabilities",
          "inputSchema": {
            "type": "object",
            "properties": {
              "assignee": {"type": "string", "description": "Filter by assignee name or ID"},
              "team": {"type": "string", "description": "Filter by team name or ID"},
              "state": {"type": "string", "description": "Filter by issue state (Todo, In Progress, Done, etc.)"},
              "project": {"type": "string", "description": "Filter by project name or ID"},
              "query": {"type": "string", "description": "Search query for issue title or description"},
              "limit": {"type": "number", "default": 25, "maximum": 100}
            }
          }
        },
        {
          "name": "create_issue",
          "description": "Create a new Linear issue with full field support including priority, labels, and assignments",
          "inputSchema": {
            "type": "object",
            "properties": {
              "title": {"type": "string", "description": "Issue title (required)"},
              "description": {"type": "string", "description": "Detailed issue description in markdown format"},
              "team": {"type": "string", "description": "Team name or ID where issue should be created (required)"},
              "assignee": {"type": "string", "description": "Assignee username, email, or ID"},
              "priority": {"type": "number", "description": "Issue priority (0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low)", "minimum": 0, "maximum": 4},
              "labels": {"type": "array", "items": {"type": "string"}, "description": "Array of label names to apply to the issue"},
              "project": {"type": "string", "description": "Project name or ID to associate with the issue"},
              "dueDate": {"type": "string", "format": "date", "description": "Due date in YYYY-MM-DD format"},
              "estimate": {"type": "number", "description": "Story point estimate for the issue"}
            },
            "required": ["title", "team"]
          }
        },
        {
          "name": "update_issue",
          "description": "Update an existing Linear issue with new information, status changes, or assignments",
          "inputSchema": {
            "type": "object",
            "properties": {
              "id": {"type": "string", "description": "Linear issue ID (required)"},
              "title": {"type": "string", "description": "New issue title"},
              "description": {"type": "string", "description": "New issue description in markdown"},
              "assignee": {"type": "string", "description": "New assignee username, email, or ID"},
              "priority": {"type": "number", "description": "New priority level (0-4)", "minimum": 0, "maximum": 4},
              "state": {"type": "string", "description": "New issue state (Todo, In Progress, Done, etc.)"},
              "project": {"type": "string", "description": "Move issue to different project"},
              "labels": {"type": "array", "items": {"type": "string"}, "description": "Replace current labels with new ones"}
            },
            "required": ["id"]
          }
        },
        {
          "name": "list_teams",
          "description": "List all teams in your Linear workspace with member information",
          "inputSchema": {
            "type": "object",
            "properties": {
              "limit": {"type": "number", "default": 50, "maximum": 250}
            }
          }
        }
      ],
      "resources": [],
      "resourceTemplates": []
    }
  }
}
```

### Initialization & usage
- Enable MCP and register tools from config (and optionally discovery):
```ts
import { McpManager } from '@/systems/mcp';
import { ToolRegistry, StateManager } from '@/core/interfaces';

const toolRegistry: ToolRegistry = /* your registry */ null as any;
const stateManager: StateManager = /* your state manager */ null as any;

const mcp = new McpManager(toolRegistry, stateManager);
await mcp.initialize({ enabled: true /*, discoveryEndpoint: 'https://your.discovery/api/services' */ });
```
- Tools from the Linear server will be registered with names like:
  - `mcp_linear-http_list_issues`
  - `mcp_linear-http_create_issue`
  - `mcp_linear-http_update_issue`
  - `mcp_linear-http_list_teams`
- Execute using your app’s tool invocation path (pass JSON matching each tool’s `inputSchema`).

### Authentication & CORS
- The browser client performs OAuth 2.1 + PKCE and persists session tokens.
- Provide a route/handler for `/callback` to receive the authorization code (client will exchange it for tokens).
- ART requires a companion extension for CORS permissions; you must approve target hosts the first time.

### Troubleshooting
- **OAuth failures**: Ensure your app serves `/callback`, scopes match, and time sync is reasonable.
- **Permission errors**: Approve the MCP host in the companion extension.
- **Missing tools**: Seed `tools` in config or run install/refresh logic that calls `listTools()`.
- **401 during tool call**: Token refresh is automatic; if it fails, a re-auth flow is triggered.

---

### Sample Service Card (as-is; do not modify)
```json
{
  "registry": {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "service_type": "MCP_SERVICE",
    "created_at": "2025-05-01T00:00:00.000000+00:00",
    "updated_at": "2025-08-25T12:00:00.000000+00:00",
    "owner_id": "linear",
    "registry_status": "active"
  },
  
  "business": {
    "name": "Linear MCP Server",
    "description": "Linear MCP server using direct HTTP transport for issue tracking, project management, and team collaboration. Connects directly to Linear's remote MCP endpoint for seamless workflow integration.",
    "version": "1.2.0",
    "category": "project-management",
    "tags": ["linear", "project-management", "issues", "teams", "productivity", "collaboration", "remote"],
    "provider": {
      "name": "Linear Orbit, Inc.",
      "website": "https://linear.app",
      "documentation": "https://linear.app/docs/mcp",
      "support": "https://linear.app/contact"
    },
    "pricing": {
      "model": "freemium",
      "free_tier": "Unlimited issues for up to 10 team members per workspace",
      "rate_limits": {
        "requests_per_minute": 1000,
        "requests_per_hour": 60000
      },
      "paid_plans": [
        {
          "name": "Standard",
          "price": "$8",
          "billing_period": "monthly",
          "features": "Per user - unlimited everything + advanced features"
        },
        {
          "name": "Plus",
          "price": "$14", 
          "billing_period": "monthly",
          "features": "Per user - everything in Standard + advanced reporting and integrations"
        }
      ],
      "terms_url": "https://linear.app/pricing"
    },
    "operational_status": {
      "status": "operational",
      "last_checked": "2025-08-25T12:00:00Z",
      "uptime_percentage": "99.9%",
      "avg_response_time": "120ms",
      "status_page_url": "https://status.linear.app"
    }
  },
  
  "specification": {
    "capabilities": {
      "hasTools": true,
      "hasResources": true,
      "hasPrompts": false,
      "supportsSampling": false,
      "transport": ["http"],
      "remoteServer": true,
      "browserCompatible": true
    },
    "tools": [
      {
        "name": "list_issues",
        "description": "List and filter issues in your Linear workspace with advanced search capabilities",
        "whenToUse": "When you need to view, search, or filter issues by assignee, status, team, or project",
        "inputSchema": {
          "type": "object",
          "properties": {
            "assignee": {"type": "string", "description": "Filter by assignee name or ID"},
            "team": {"type": "string", "description": "Filter by team name or ID"},
            "state": {"type": "string", "description": "Filter by issue state (Todo, In Progress, Done, etc.)"},
            "project": {"type": "string", "description": "Filter by project name or ID"},
            "query": {"type": "string", "description": "Search query for issue title or description"},
            "limit": {"type": "number", "default": 25, "maximum": 100}
          }
        },
        "outputFormat": "Array of issue objects with ID, title, description, status, assignee, and project information"
      },
      {
        "name": "create_issue", 
        "description": "Create a new Linear issue with full field support including priority, labels, and assignments",
        "whenToUse": "When you need to create tasks, bugs, feature requests, or project milestones",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": {"type": "string", "description": "Issue title (required)"},
            "description": {"type": "string", "description": "Detailed issue description in markdown format"},
            "team": {"type": "string", "description": "Team name or ID where issue should be created (required)"},
            "assignee": {"type": "string", "description": "Assignee username, email, or ID"},
            "priority": {"type": "number", "description": "Issue priority (0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low)", "minimum": 0, "maximum": 4},
            "labels": {"type": "array", "items": {"type": "string"}, "description": "Array of label names to apply to the issue"},
            "project": {"type": "string", "description": "Project name or ID to associate with the issue"},
            "dueDate": {"type": "string", "format": "date", "description": "Due date in YYYY-MM-DD format"},
            "estimate": {"type": "number", "description": "Story point estimate for the issue"}
          },
          "required": ["title", "team"]
        },
        "outputFormat": "Created issue object with ID, URL, and complete metadata"
      },
      {
        "name": "update_issue",
        "description": "Update an existing Linear issue with new information, status changes, or assignments",
        "whenToUse": "When you need to modify issue details, change status, reassign, or update project association",
        "inputSchema": {
          "type": "object",
          "properties": {
            "id": {"type": "string", "description": "Linear issue ID (required)"},
            "title": {"type": "string", "description": "New issue title"},
            "description": {"type": "string", "description": "New issue description in markdown"},
            "assignee": {"type": "string", "description": "New assignee username, email, or ID"},
            "priority": {"type": "number", "description": "New priority level (0-4)", "minimum": 0, "maximum": 4},
            "state": {"type": "string", "description": "New issue state (Todo, In Progress, Done, etc.)"},
            "project": {"type": "string", "description": "Move issue to different project"},
            "labels": {"type": "array", "items": {"type": "string"}, "description": "Replace current labels with new ones"}
          },
          "required": ["id"]
        },
        "outputFormat": "Updated issue object with changes reflected"
      },
      {
        "name": "list_teams",
        "description": "List all teams in your Linear workspace with member information",
        "whenToUse": "When you need to see available teams for issue assignment or project organization",
        "inputSchema": {
          "type": "object",
          "properties": {
            "limit": {"type": "number", "default": 50, "maximum": 250}
          }
        },
        "outputFormat": "Array of team objects with IDs, names, keys, and member information"
      }
    ],
    "resources": [
      {
        "name": "workspace_structure",
        "description": "Access to Linear workspace hierarchy including teams, projects, and workflow states",
        "mimeType": "application/json",
        "whenToUse": "To understand team organization, project structure, and available workflow states"
      }
    ],
    "prompts": [],
    "authentication": {
      "type": "oauth2.1",
      "required": true,
      "description": "OAuth 2.1 with dynamic client registration for secure workspace access",
      "flows": ["authorization_code"],
      "pkce": true,
      "scopes": ["read", "write", "issues:create"],
      "discoveryUrl": "https://mcp.linear.app/.well-known/oauth-authorization-server",
      "authUrl": "https://linear.app/oauth/authorize",
      "tokenUrl": "https://linear.app/oauth/token",
      "dynamicClientRegistration": true
    },
    "transport": {
      "primary": "http",
      "endpoints": {
        "http": "https://mcp.linear.app/mcp"
      },
      "browserCompatible": true
    },
    "installation": {
      "type": "external",
      "requirements": [
        "HTTP-compatible MCP client",
        "Linear workspace access with appropriate permissions",
        "OAuth 2.1 + PKCE support in MCP client"
      ],
      "configurationExtract": {
        "description": "Direct HTTP configuration for connecting to Linear's MCP endpoint",
        "mcpServers": {
          "linear-http": {
            "url": "https://mcp.linear.app/mcp",
            "transport": "http",
            "authentication": {
              "type": "oauth2.1",
              "pkce": true,
              "discoveryUrl": "https://mcp.linear.app/.well-known/oauth-authorization-server"
            },
            "capabilities": ["tools", "resources"],
            "disabled": false
          }
        }
      },
      "setupInstructions": [
        "1. Copy the configurationExtract object to your MCP client configuration",
        "2. Add the Linear MCP server configuration using the direct HTTP endpoint", 
        "3. Ensure your MCP client supports HTTP transport and OAuth 2.1 + PKCE",
        "4. Save the configuration and restart your MCP client if required",
        "5. On first connection, complete OAuth authorization flow in browser",
        "6. Grant necessary permissions to your Linear workspace",
        "7. Test connection by querying Linear data through your MCP client"
      ],
      "troubleshooting": [
        "OAuth failures: Ensure your MCP client supports OAuth 2.1 with PKCE",
        "Connection timeouts: Verify HTTP transport is properly configured",
        "Permission errors: Check Linear workspace access and granted OAuth scopes",
        "Tool discovery issues: Confirm capabilities include 'tools' and 'resources'",
        "Rate limiting: Respect Linear's API rate limits during heavy usage"
      ]
    }
  }
}
```

### Discovery Schema (as-is; do not modify)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Universal Service Card Schema v2.0",
  "description": "Three-layer architecture supporting MCP, A2A, LLM Gateway, and future protocols with complete standards compliance",
  "type": "object",
  "properties": {
    "registry": {
      "type": "object",
      "description": "Registry management metadata - internal to service catalog system",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier for the service registry entry"
        },
        "service_type": {
          "type": "string",
          "enum": ["MCP_SERVICE", "A2A_AGENT", "LLM_GATEWAY"],
          "description": "Protocol type - determines validation rules for specification section"
        },
        "created_at": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 timestamp when service was registered"
        },
        "updated_at": {
          "type": "string", 
          "format": "date-time",
          "description": "ISO 8601 timestamp when registry entry was last updated"
        },
        "owner_id": {
          "type": "string",
          "description": "Identifier of the service owner/provider in the registry system"
        },
        "registry_status": {
          "type": "string",
          "enum": ["active", "inactive", "deprecated", "pending_review"],
          "description": "Registry-level status for service catalog management"
        }
      },
      "required": ["id", "service_type", "created_at", "updated_at", "owner_id", "registry_status"],
      "additionalProperties": false
    },
    
    "business": {
      "type": "object", 
      "description": "Business and operational metadata common across all service types",
      "properties": {
        "name": {
          "type": "string",
          "description": "Human-readable service name"
        },
        "description": {
          "type": "string",
          "description": "Comprehensive description of service functionality and value proposition"
        },
        "version": {
          "type": "string",
          "description": "Service version (semantic versioning recommended: major.minor.patch)"
        },
        "category": {
          "type": "string",
          "description": "Primary service category for organization and discovery",
          "examples": ["productivity", "development", "data-analysis", "communication", "entertainment"]
        },
        "tags": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Searchable tags for service discovery and categorization"
        },
        "provider": {
          "type": "object",
          "description": "Information about the service provider organization",
          "properties": {
            "name": {"type": "string", "description": "Provider/organization name"},
            "website": {"type": "string", "format": "uri", "description": "Provider main website URL"},
            "documentation": {"type": "string", "format": "uri", "description": "Service-specific documentation URL"},
            "support": {"type": "string", "format": "uri", "description": "Support contact URL or email"}
          },
          "required": ["name"],
          "additionalProperties": false
        },
        "pricing": {
          "type": "object",
          "description": "Commercial and usage terms",
          "properties": {
            "model": {
              "type": "string",
              "enum": ["free", "freemium", "paid", "enterprise", "usage_based"],
              "description": "Primary pricing model"
            },
            "free_tier": {
              "type": "string",
              "description": "Description of free usage allowances, if any"
            },
            "rate_limits": {
              "type": "object",
              "description": "Usage rate limits and quotas",
              "properties": {
                "requests_per_minute": {"type": "number"},
                "requests_per_hour": {"type": "number"}, 
                "requests_per_day": {"type": "number"},
                "requests_per_month": {"type": "number"}
              },
              "additionalProperties": false
            },
            "paid_plans": {
              "type": "array",
              "description": "Available paid service tiers",
              "items": {
                "type": "object",
                "properties": {
                  "name": {"type": "string"},
                  "price": {"type": "string"},
                  "billing_period": {"type": "string", "enum": ["monthly", "annual", "per_usage"]},
                  "features": {"type": "string"}
                },
                "required": ["name", "price"],
                "additionalProperties": false
              }
            },
            "terms_url": {
              "type": "string", 
              "format": "uri",
              "description": "URL to detailed pricing and terms of service"
            }
          },
          "required": ["model"],
          "additionalProperties": false
        },
        "operational_status": {
          "type": "object",
          "description": "Real-time operational health and availability information",
          "properties": {
            "status": {
              "type": "string",
              "enum": ["operational", "degraded", "maintenance", "outage"],
              "description": "Current operational state"
            },
            "last_checked": {
              "type": "string",
              "format": "date-time",
              "description": "Last health check timestamp"
            },
            "uptime_percentage": {
              "type": "string",
              "description": "Service uptime percentage (e.g., '99.9%')"
            },
            "avg_response_time": {
              "type": "string", 
              "description": "Average response time (e.g., '120ms')"
            },
            "status_page_url": {
              "type": "string",
              "format": "uri",
              "description": "URL to detailed status page"
            },
            "incidents": {
              "type": "array",
              "description": "Recent incidents or maintenance notices",
              "items": {
                "type": "object",
                "properties": {
                  "date": {"type": "string", "format": "date-time"},
                  "severity": {"type": "string", "enum": ["info", "warning", "critical"]},
                  "summary": {"type": "string"},
                  "resolved": {"type": "boolean"}
                }
              }
            }
          },
          "required": ["status", "last_checked"],
          "additionalProperties": false
        }
      },
      "required": ["name", "description", "version", "category", "provider", "pricing"],
      "additionalProperties": false
    },
    
    "specification": {
      "description": "Complete protocol-specific specification - native format per protocol standards",
      "oneOf": [
        {
          "if": {
            "properties": {
              "registry": {
                "properties": {"service_type": {"const": "MCP_SERVICE"}}
              }
            }
          },
          "then": {
            "type": "object",
            "description": "Complete MCP Server specification as defined by MCP protocol standards",
            "properties": {
              "capabilities": {"type": "object"},
              "tools": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "whenToUse": {"type": "string", "description": "Guidance for when to use this tool"},
                    "inputSchema": {"type": "object"},
                    "outputFormat": {"type": "string"}
                  }
                }
              },
              "resources": {
                "type": "array", 
                "items": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "mimeType": {"type": "string"},
                    "whenToUse": {"type": "string", "description": "Guidance for when to use this resource"}
                  }
                }
              },
              "prompts": {
                "type": "array",
                "items": {
                  "type": "object", 
                  "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "whenToUse": {"type": "string", "description": "Guidance for when to use this prompt"}
                  }
                }
              },
              "authentication": {"type": "object"},
              "transport": {"type": "object"},
              "installation": {
                "type": "object",
                "properties": {
                  "type": {"type": "string"},
                  "requirements": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Setup requirements and prerequisites"
                  },
                  "configurationExtract": {"type": "object"},
                  "setupInstructions": {
                    "type": "array", 
                    "items": {"type": "string"},
                    "description": "Step-by-step setup guide"
                  },
                  "troubleshooting": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Common issues and solutions"
                  }
                }
              }
            },
            "required": ["capabilities"],
            "additionalProperties": true
          }
        },
        {
          "if": {
            "properties": {
              "registry": {
                "properties": {"service_type": {"const": "A2A_AGENT"}}
              }
            }
          },
          "then": {
            "type": "object", 
            "description": "Complete A2A AgentCard specification as defined by A2A protocol standards",
            "properties": {
              "url": {"type": "string", "format": "uri"},
              "provider": {"type": "object"},
              "documentationUrl": {"type": "string", "format": "uri"},
              "capabilities": {"type": "object"},
              "authentication": {"type": "object"},
              "defaultInputModes": {"type": "array"},
              "defaultOutputModes": {"type": "array"},
              "skills": {"type": "array"}
            },
            "required": ["url", "capabilities", "authentication", "skills"],
            "additionalProperties": true
          }
        },
        {
          "if": {
            "properties": {
              "registry": {
                "properties": {"service_type": {"const": "LLM_GATEWAY"}}
              }
            }
          },
          "then": {
            "type": "object",
            "description": "Complete LLM Gateway specification",
            "properties": {
              "models": {"type": "array"},
              "endpoints": {"type": "object"},
              "authentication": {"type": "object"},
              "rate_limits": {"type": "object"},
              "supported_formats": {"type": "array"}
            },
            "required": ["models", "endpoints", "authentication"],
            "additionalProperties": true
          }
        }
      ]
    }
  },
  "required": ["registry", "business", "specification"],
  "additionalProperties": false,
  
  "examples": [
    {
      "title": "MCP Service Example Structure",
      "registry": {
        "service_type": "MCP_SERVICE"
      },
      "business": {
        "name": "Linear MCP Server",
        "category": "project-management"
      },
      "specification": {
        "capabilities": {"hasTools": true, "hasResources": true},
        "tools": [],
        "authentication": {"type": "oauth2.1"},
        "transport": {"primary": "http"}
      }
    },
    {
      "title": "A2A Agent Example Structure", 
      "registry": {
        "service_type": "A2A_AGENT"
      },
      "business": {
        "name": "Travel Planning Agent",
        "category": "travel"
      },
      "specification": {
        "url": "https://api.example.com/a2a",
        "capabilities": {"streaming": true},
        "authentication": {"schemes": ["Bearer"]},
        "skills": []
      }
    }
  ]
}
```


