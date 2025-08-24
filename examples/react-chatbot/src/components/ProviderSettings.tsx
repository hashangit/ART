import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { saveProviderKey, loadProviderKey, deleteProviderKey } from '../lib/credentials';

type Provider = 'gemini' | 'openai' | 'openrouter';

export const ProviderSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<Provider, string>>({ gemini: '', openai: '', openrouter: '' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const gemini = (await loadProviderKey('gemini')) || '';
        const openai = (await loadProviderKey('openai')) || '';
        const openrouter = (await loadProviderKey('openrouter')) || '';
        setKeys({ gemini, openai, openrouter });
      } catch (e: any) {
        setStatus(e.message || 'Failed to load credentials');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (provider: Provider) => {
    try {
      setLoading(true);
      setStatus(null);
      await saveProviderKey(provider, keys[provider].trim());
      setStatus(`${provider} key saved`);
    } catch (e: any) {
      setStatus(e.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (provider: Provider) => {
    try {
      setLoading(true);
      setStatus(null);
      await deleteProviderKey(provider);
      setKeys(prev => ({ ...prev, [provider]: '' }));
      setStatus(`${provider} key removed`);
    } catch (e: any) {
      setStatus(e.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm">Gemini API Key</label>
            <div className="flex gap-2">
              <Input type="password" value={keys.gemini} onChange={e => setKeys({ ...keys, gemini: e.target.value })} />
              <Button onClick={() => handleSave('gemini')} disabled={loading}>Save</Button>
              <Button variant="outline" onClick={() => handleDelete('gemini')} disabled={loading}>Remove</Button>
            </div>
          </div>
          <div className="space-y-2 opacity-70">
            <label className="text-sm">OpenAI API Key (UI only)</label>
            <div className="flex gap-2">
              <Input type="password" value={keys.openai} onChange={e => setKeys({ ...keys, openai: e.target.value })} />
              <Button onClick={() => handleSave('openai')} disabled={loading}>Save</Button>
              <Button variant="outline" onClick={() => handleDelete('openai')} disabled={loading}>Remove</Button>
            </div>
          </div>
          <div className="space-y-2 opacity-70">
            <label className="text-sm">OpenRouter API Key (UI only)</label>
            <div className="flex gap-2">
              <Input type="password" value={keys.openrouter} onChange={e => setKeys({ ...keys, openrouter: e.target.value })} />
              <Button onClick={() => handleSave('openrouter')} disabled={loading}>Save</Button>
              <Button variant="outline" onClick={() => handleDelete('openrouter')} disabled={loading}>Remove</Button>
            </div>
          </div>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderSettings;


