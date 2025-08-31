// Lazy import to avoid SSR/bundling path issues if SDK evolves
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Logger } from '../../utils/logger';
import { ARTError, ErrorCode } from '../../errors';

function base64UrlEncode(buffer: Uint8Array): string {
  let s = ''
  for (let i = 0; i < buffer.length; i++) s += String.fromCharCode(buffer[i])
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function generateRandomString(length = 64): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export class TokenManager {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private expiresAt: number | null = null
  private clientId: string | null = null
  constructor(private oauthConfig: { token_endpoint?: string }) {}

  load() {
    this.accessToken = sessionStorage.getItem('access_token')
    this.refreshToken = sessionStorage.getItem('refresh_token')
    const exp = sessionStorage.getItem('token_expires_at')
    if (exp) this.expiresAt = parseInt(exp, 10)
    this.clientId = localStorage.getItem('mcp_client_id')
  }

  setClientId(id: string) { this.clientId = id }

  update(token: any) {
    this.accessToken = token.access_token
    if (token.refresh_token) this.refreshToken = token.refresh_token
    if (token.expires_in) this.expiresAt = Date.now() + token.expires_in * 1000
    sessionStorage.setItem('access_token', this.accessToken || '')
    if (this.refreshToken) sessionStorage.setItem('refresh_token', this.refreshToken)
    if (this.expiresAt) sessionStorage.setItem('token_expires_at', String(this.expiresAt))
  }

  clear() {
    this.accessToken = null
    this.refreshToken = null
    this.expiresAt = null
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('token_expires_at')
  }

  getAccessToken() { return this.accessToken }

  needsRefresh(): boolean {
    if (!this.expiresAt) return false
    return Date.now() >= this.expiresAt - 5 * 60 * 1000
  }

  async refresh(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token available')
    if (!this.oauthConfig.token_endpoint) throw new Error('Missing token endpoint')
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    })
    if (this.clientId) body.set('client_id', this.clientId)
    const res = await fetch(this.oauthConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      this.clear()
      throw new Error('Token refresh failed')
    }
    const token = await res.json()
    this.update(token)
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && (this.expiresAt ? this.expiresAt > Date.now() : true)
  }
}

export class McpClientController {
  public baseUrl: URL
  private scopes: string[]
  private client: Client | null = null
  private transport: StreamableHTTPClientTransport | null = null
  private oauthDiscovery: any = null
  private tokenManager: TokenManager | null = null
  private sessionId: string | null = null
  private readonly protocolVersion: string = '2025-06-18'

  private constructor(baseUrl: string, scopes?: string[]) {
    this.baseUrl = new URL(baseUrl)
    this.scopes = scopes ?? ['read', 'write']
  }

  static create(baseUrl: string, scopes?: string[]): McpClientController {
    return new McpClientController(baseUrl, scopes)
  }

  private async discoverAuthorizationServer(): Promise<void> {
    if (this.oauthDiscovery) return

    // HACK: Bypassing full discovery flow to avoid WWW-Authenticate CORS issues.
    // This assumes the MCP server itself hosts the AS metadata endpoint.
    const asMetadataUrl = new URL('/.well-known/oauth-authorization-server', this.baseUrl).toString()
    const asMetadataRes = await fetch(asMetadataUrl)
    if (!asMetadataRes.ok) throw new ARTError(`Failed to fetch authorization server metadata from ${asMetadataUrl}`, ErrorCode.NETWORK_ERROR)
    this.oauthDiscovery = await asMetadataRes.json()
    sessionStorage.setItem('mcp_oauth_discovery', JSON.stringify(this.oauthDiscovery))

    /*
    const probeRes = await fetch(this.baseUrl.toString(), { method: 'GET' })

    if (probeRes.status !== 401) {
      throw new Error('MCP server did not respond with 401 Unauthorized. Cannot discover authorization server.')
    }

    const wwwAuthHeader = probeRes.headers.get('WWW-Authenticate')
    if (!wwwAuthHeader) throw new Error('Missing WWW-Authenticate header in 401 response')

    const metadataUrlMatch = /resource_metadata="([^"]+)"/.exec(wwwAuthHeader)
    if (!metadataUrlMatch) throw new Error('Could not find resource_metadata in WWW-Authenticate header')

    const resourceMetadataUrl = metadataUrlMatch[1]
    const resourceMetadataRes = await fetch(resourceMetadataUrl)
    if (!resourceMetadataRes.ok) throw new Error('Failed to fetch resource metadata')
    const resourceMetadata = await resourceMetadataRes.json()

    if (!resourceMetadata.authorization_servers || resourceMetadata.authorization_servers.length === 0) {
      throw new Error('No authorization_servers found in resource metadata')
    }

    const authorizationServerUrl = resourceMetadata.authorization_servers[0]
    const asMetadataUrl = new URL('/.well-known/oauth-authorization-server', authorizationServerUrl).toString()

    const asMetadataRes = await fetch(asMetadataUrl)
    if (!asMetadataRes.ok) throw new Error('Failed to fetch authorization server metadata')
    this.oauthDiscovery = await asMetadataRes.json()
    sessionStorage.setItem('mcp_oauth_discovery', JSON.stringify(this.oauthDiscovery))
    */
  }

  private async registerClient(): Promise<string> {
    if (!this.oauthDiscovery?.registration_endpoint) {
      // Assume pre-registered public client if dynamic registration not available
      const existing = localStorage.getItem('mcp_client_id')
      if (existing) return existing
      const randomId = 'public-' + generateRandomString(16)
      localStorage.setItem('mcp_client_id', randomId)
      return randomId
    }
    const body = {
      client_name: 'MCP Browser Demo',
      redirect_uris: [location.origin + '/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
    }
    const res = await fetch(this.oauthDiscovery.registration_endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) throw new ARTError('Client registration failed', ErrorCode.EXTERNAL_SERVICE_ERROR)
    const data = await res.json()
    localStorage.setItem('mcp_client_id', data.client_id)
    return data.client_id
  }

  async startOAuth() {
    await this.discoverAuthorizationServer()
    if (!this.oauthDiscovery) throw new ARTError('Could not discover OAuth server details.', ErrorCode.INVALID_CONFIG)
    const clientId = await this.registerClient()
    const codeVerifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)))
    const codeChallenge = await sha256Base64Url(codeVerifier)
    sessionStorage.setItem('code_verifier', codeVerifier)
    const state = generateRandomString(16)
    sessionStorage.setItem('state', state)
    const authUrl = new URL(this.oauthDiscovery.authorization_endpoint)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', location.origin + '/callback')
    authUrl.searchParams.set('scope', this.scopes.join(' '))
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('resource', this.baseUrl.toString().replace(/\/$/, ''))
    window.location.href = authUrl.toString()
  }

  async maybeHandleCallback(): Promise<boolean> {
    const url = new URL(window.location.href)
    const isCallback = url.pathname === '/callback' && (url.searchParams.get('code') || url.searchParams.get('error'))
    if (!isCallback) return false

    // Load discovery doc from session storage, assuming it was stored during startOAuth
    const discoveryDoc = sessionStorage.getItem('mcp_oauth_discovery')
    if (discoveryDoc) this.oauthDiscovery = JSON.parse(discoveryDoc)
    else await this.discoverAuthorizationServer() // Fallback just in case

    if (!this.oauthDiscovery) throw new ARTError('Could not determine OAuth server details for callback.', ErrorCode.INVALID_CONFIG)

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code) throw new ARTError('Authorization code missing', ErrorCode.VALIDATION_ERROR)
    if (state !== sessionStorage.getItem('state')) throw new ARTError('State mismatch', ErrorCode.VALIDATION_ERROR)
    const clientId = localStorage.getItem('mcp_client_id') || (await this.registerClient())
    const codeVerifier = sessionStorage.getItem('code_verifier') || ''
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: location.origin + '/callback',
      client_id: clientId,
    })
    body.set('resource', this.baseUrl.toString().replace(/\/$/, ''))

    const res = await fetch(this.oauthDiscovery.token_endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ARTError('Token exchange failed: ' + (err.error_description || err.error || res.status), ErrorCode.EXTERNAL_SERVICE_ERROR)
    }
    const token = await res.json()
    this.tokenManager = new TokenManager(this.oauthDiscovery)
    this.tokenManager.setClientId(clientId)
    this.tokenManager.update(token)
    sessionStorage.removeItem('code_verifier')
    sessionStorage.removeItem('state')
    history.replaceState({}, '', '/')
    return true
  }

  loadExistingSession() {
    const discoveryDoc = sessionStorage.getItem('mcp_oauth_discovery')
    if (discoveryDoc) this.oauthDiscovery = JSON.parse(discoveryDoc)
    this.tokenManager = new TokenManager(this.oauthDiscovery || {})
    this.tokenManager.load()
    this.sessionId = sessionStorage.getItem('mcp_session_id')
  }

  isAuthenticated(): boolean {
    if (!this.tokenManager) return false
    return this.tokenManager.isAuthenticated()
  }

  async connect(): Promise<void> {
    if (!this.client) {
      const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
        this.tokenManager?.load()
        if (this.tokenManager?.needsRefresh()) {
          await this.tokenManager.refresh().catch((err) => {
            Logger.error('Token refresh failed:', err);
            // Optionally, trigger a full re-authentication flow
          })
        }

        const headers = new Headers(options?.headers)
        headers.set('Authorization', `Bearer ${this.tokenManager?.getAccessToken() || ''}`)
        headers.set('Accept', 'application/json, text/event-stream')
        headers.set('MCP-Protocol-Version', this.protocolVersion)
        if (this.sessionId) {
          headers.set('Mcp-Session-Id', this.sessionId)
        }

        const newOptions: RequestInit = { ...options, headers }
        const response = await fetch(url, newOptions)

        const sessionIdHeader = response.headers.get('Mcp-Session-Id')
        if (sessionIdHeader) {
          this.sessionId = sessionIdHeader
          sessionStorage.setItem('mcp_session_id', sessionIdHeader)
        }
        return response
      }

      this.transport = new StreamableHTTPClientTransport(this.baseUrl, { fetch: customFetch })
      this.client = new Client({ name: 'mcp-browser-demo', version: '1.0.0' })
      await this.client.connect(this.transport)
    }
  }

  async ensureConnected(): Promise<void> {
    if (!this.client) await this.connect()
  }

  async listTools(): Promise<{ name: string; description?: string }[]> {
    if (!this.client) throw new ARTError('Not connected', ErrorCode.NOT_CONNECTED)
    const res = await this.client.listTools()
    return res.tools?.map((t: any) => ({ name: t.name, description: t.description })) ?? []
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.client) throw new ARTError('Not connected', ErrorCode.NOT_CONNECTED)
    try {
      const result = await this.client.callTool({ name, arguments: args })
      return result
    } catch (e: any) {
      // Retry once if unauthorized and refresh is possible
      if (String(e?.message || '').includes('401') && this.tokenManager) {
        await this.tokenManager.refresh().catch((err) => {
           Logger.error('Token refresh failed during tool call:', err);
           throw e; // Re-throw original error if refresh fails
        })
        const result = await this.client.callTool({ name, arguments: args })
        return result
      }
      throw e
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.transport) {
        const headers: Record<string, string> = {}
        const token = this.tokenManager?.getAccessToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
        if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId
        await fetch(this.baseUrl.toString(), { method: 'DELETE', headers }).catch(() => {})
      }
    } finally {
      this.client = null
      this.transport = null
      this.tokenManager?.clear()
      this.sessionId = null
      sessionStorage.removeItem('mcp_session_id')
      sessionStorage.removeItem('mcp_oauth_discovery')
    }
  }
}
