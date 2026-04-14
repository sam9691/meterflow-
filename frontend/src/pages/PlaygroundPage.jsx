import { useState } from 'react';
import { Play, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import CopyButton from '../components/ui/CopyButton';
import { formatLatency, getStatusColor } from '../utils/helpers';

const METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

const METHOD_COLORS = {
  GET: 'text-emerald-400',
  POST: 'text-brand-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

export default function PlaygroundPage() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHeaders, setShowHeaders] = useState(false);

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    const start = Date.now();

    try {
      const customHeaders = {};
      headers.forEach(({ key, value }) => {
        if (key && value) customHeaders[key] = value;
      });
      if (apiKey) customHeaders['X-API-Key'] = apiKey;

      const config = {
        method,
        url,
        headers: customHeaders,
        validateStatus: () => true,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        try {
          config.data = JSON.parse(body);
          customHeaders['Content-Type'] = 'application/json';
        } catch {
          config.data = body;
        }
      }

      const res = await axios(config);
      const latency = Date.now() - start;

      const result = {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data,
        latency,
        timestamp: new Date().toISOString(),
        method,
        url,
      };

      setResponse(result);
      setHistory((prev) => [result, ...prev.slice(0, 9)]);
    } catch (err) {
      setResponse({
        error: err.message,
        latency: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setMethod(item.method);
    setUrl(item.url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">API Playground</h1>
        <p className="text-dark-400 mt-1">Test your APIs directly from the dashboard</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Request panel */}
        <div className="xl:col-span-3 space-y-4">
          <div className="card">
            {/* URL bar */}
            <div className="flex gap-3 mb-4">
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                options={METHODS}
                className={`w-28 font-mono font-semibold ${METHOD_COLORS[method]}`}
              />
              <input
                type="text"
                placeholder="https://your-api.com/endpoint or /gateway/:apiId/path"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
                className="input flex-1 font-mono text-sm"
              />
              <Button icon={Play} loading={loading} onClick={sendRequest} className="px-6">
                Send
              </Button>
            </div>

            {/* API Key */}
            <Input
              label="API Key (X-API-Key header)"
              placeholder="mf_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
            />

            {/* Headers toggle */}
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className="flex items-center gap-2 text-sm text-dark-400 hover:text-white mt-4 transition-colors"
            >
              {showHeaders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Custom Headers ({headers.filter((h) => h.key).length})
            </button>

            <AnimatePresence>
              {showHeaders && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 space-y-2"
                >
                  {headers.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        placeholder="Header name"
                        value={h.key}
                        onChange={(e) => {
                          const updated = [...headers];
                          updated[i].key = e.target.value;
                          setHeaders(updated);
                        }}
                        className="input flex-1 text-sm font-mono"
                      />
                      <input
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) => {
                          const updated = [...headers];
                          updated[i].value = e.target.value;
                          setHeaders(updated);
                        }}
                        className="input flex-1 text-sm font-mono"
                      />
                      <button
                        onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                        className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add header
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div className="mt-4">
                <label className="label">Request Body (JSON)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={6}
                  className="input font-mono text-sm resize-none"
                />
              </div>
            )}
          </div>

          {/* Response */}
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold font-mono ${response.error ? 'text-red-400' : getStatusColor(response.status)}`}>
                    {response.error ? 'Error' : response.status}
                  </span>
                  {!response.error && (
                    <span className="text-sm text-dark-400">{response.statusText}</span>
                  )}
                  <span className="text-xs text-dark-500">{formatLatency(response.latency)}</span>
                </div>
                <CopyButton text={JSON.stringify(response.data || response.error, null, 2)} />
              </div>

              {response.error ? (
                <div className="code-block text-red-400">{response.error}</div>
              ) : (
                <pre className="code-block overflow-auto max-h-96 text-xs">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              )}
            </motion.div>
          )}
        </div>

        {/* History panel */}
        <div className="card h-fit">
          <h3 className="text-sm font-semibold text-white mb-3">History</h3>
          {history.length === 0 ? (
            <p className="text-xs text-dark-400">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => loadFromHistory(item)}
                  className="w-full text-left p-2.5 rounded-lg bg-dark-900 hover:bg-dark-700 border border-dark-700 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-semibold ${METHOD_COLORS[item.method]}`}>
                      {item.method}
                    </span>
                    <span className={`text-xs font-mono ${item.error ? 'text-red-400' : getStatusColor(item.status)}`}>
                      {item.error ? 'ERR' : item.status}
                    </span>
                  </div>
                  <p className="text-xs text-dark-400 truncate">{item.url}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
