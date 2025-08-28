import { ARTError, ErrorCode } from '../../../errors';
import { Logger } from '../../../utils/logger';

// Optional import – app may not have the package installed at build time.
// We load it dynamically to avoid hard dependency in the core library build.
type CorsUnblockApi = {
  hasInstall: () => boolean;
  install: () => void;
  requestHosts: (opts: { hosts: string[] }) => Promise<'accept' | 'reject' | 'error'>;
};

export class CORSAccessManager {
  // Try new package name first; fall back to legacy for backward compatibility
  private static EXT_PKG_CANDIDATES = ['art-mcp-permission-manager', 'cors-unblock'];
  private static PERM_CACHE_KEY = 'art:mcp:cors-permissions';

  private async loadApi(): Promise<CorsUnblockApi | null> {
    for (const name of CORSAccessManager.EXT_PKG_CANDIDATES) {
      try {
        // dynamic import with vite-ignore to prevent bundler pre-bundling
        const mod: any = await import(/* @vite-ignore */ name);
        const api: any = mod?.default ?? mod;
        if (api && typeof api.hasInstall === 'function' && typeof api.requestHosts === 'function') {
          Logger.info(`CORSAccessManager: Loaded CORS helper package '${name}'.`);
          return api as CorsUnblockApi;
        }
      } catch {
        // try next candidate
      }
    }
    Logger.warn('CORSAccessManager: No compatible CORS helper package found.');
    return null;
  }

  private getCache(): Record<string, 'accept' | 'reject'> {
    try {
      const raw = localStorage.getItem(CORSAccessManager.PERM_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private setCache(cache: Record<string, 'accept' | 'reject'>): void {
    try {
      localStorage.setItem(CORSAccessManager.PERM_CACHE_KEY, JSON.stringify(cache));
    } catch {
      /* ignore */
    }
  }

  public async ensureAccess(targetUrl: string): Promise<void> {
    const hostname = new URL(targetUrl).hostname;
    const cached = this.getCache()[hostname];
    if (cached === 'accept') return;

    const api = await this.loadApi();
    if (!api) {
      throw new ARTError(
        'CORS helper extension is required to access remote MCP servers from the browser.',
        ErrorCode.CORS_EXTENSION_REQUIRED,
        undefined,
        { hostname }
      );
    }

    if (!api.hasInstall()) {
      // New package handles opening the store internally; we just call install()
      Logger.info('CORSAccessManager: Prompting user to install extension.');
      try { api.install(); } catch {/* ignore */}
      throw new ARTError('Please install the CORS helper extension and try again.', ErrorCode.CORS_EXTENSION_REQUIRED, undefined, { hostname });
    }

    const result = await api.requestHosts({ hosts: [hostname] });
    const cache = this.getCache();
    if (result === 'accept') {
      cache[hostname] = 'accept';
      this.setCache(cache);
      Logger.info(`CORSAccessManager: Permission granted for ${hostname}.`);
      return;
    }
    cache[hostname] = 'reject';
    this.setCache(cache);
    throw new ARTError(
      'User denied CORS permission for the MCP server.',
      ErrorCode.CORS_PERMISSION_REQUIRED,
      undefined,
      { hostname, result }
    );
  }
}


