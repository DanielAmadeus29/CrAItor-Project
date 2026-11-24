import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Upload, CheckCircle2, XCircle } from 'lucide-react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './Classification.css';

const AI_URL = 'http://localhost:5001';

// Class names as stored in ImageModel_class.json, with display-friendly labels
// (the stored names contain typos such as "Fashion Photographys").
const CLASSES = {
  'Architecture Photography': 'Architecture',
  'Astro Photography': 'Astro',
  'Fashion Photographys': 'Fashion',
  'Food Photography': 'Food',
  'Interior Photographys': 'Interior',
  'Landscape Photography': 'Landscape',
  'Lifestyle Photography': 'Lifestyle',
  'MacroPhotographys': 'Macro',
  'Product Photography': 'Product',
  'Wildlife Photography': 'Wildlife',
};

const label = (raw) => CLASSES[raw] ?? raw;

function Classification() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [preview, setPreview] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [expected, setExpected] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  const classify = async (file) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${AI_URL}/api/predict`, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Server error: ${res.status}`);
      setResult({ ...data, latencyMs: Math.round(performance.now() - started) });
    } catch (e) {
      setError(e.message || 'Classification failed. Is the inference server running on port 5001?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFileInfo({ name: file.name, sizeKb: Math.round(file.size / 1024) });
    classify(file);
  };

  const reset = () => {
    setPreview(null);
    setFileInfo(null);
    setResult(null);
    setError(null);
  };

  if (!user) {
    return (
      <div className="loading-container">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const top = result?.top_predictions ?? [];
  const expectedRank = expected ? top.findIndex((p) => p.class === expected) : -1;
  const isMatch = expected && result && result.prediction === expected;

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="clf">
          <header className="clf-header">
            <p className="eyebrow">Tool 1</p>
            <h1>Photography Genre Classification</h1>
            <p className="clf-sub">
              MobileNetV2 fine-tuned on 10 photography genres. Upload an image to see the predicted
              genre and the top-3 class probabilities. Optionally set an expected genre to check
              whether the model agrees with it.
            </p>
          </header>

          <div className="clf-grid">
            <section className="clf-panel">
              <h2>Input</h2>

              {!preview ? (
                <label
                  className="clf-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                  <Upload size={32} strokeWidth={1.5} />
                  <strong>Choose an image</strong>
                  <span>Click to browse or drag and drop</span>
                </label>
              ) : (
                <>
                  <img src={preview} alt="Input" className="clf-preview" />
                  {fileInfo && (
                    <p className="clf-meta">
                      {fileInfo.name} · {fileInfo.sizeKb} KB · resized to 224 × 224 for inference
                    </p>
                  )}
                  <button className="clf-btn-secondary" onClick={reset} disabled={isLoading}>
                    Use another image
                  </button>
                </>
              )}

              <label className="clf-field">
                <span>Expected genre (optional)</span>
                <select value={expected} onChange={(e) => setExpected(e.target.value)}>
                  <option value="">None, prediction only</option>
                  {Object.entries(CLASSES).map(([raw, name]) => (
                    <option key={raw} value={raw}>{name}</option>
                  ))}
                </select>
              </label>
            </section>

            <section className="clf-panel">
              <h2>Output</h2>

              {!preview && !error && (
                <p className="clf-empty">Results appear here after an image is uploaded.</p>
              )}

              {isLoading && (
                <div className="clf-loading">
                  <span className="clf-spinner" /> Running inference…
                </div>
              )}

              {error && <div className="clf-error">{error}</div>}

              {result && (
                <>
                  <div className="clf-top1">
                    <span className="clf-top1-label">Top-1 prediction</span>
                    <span className="clf-top1-class">{label(result.prediction)}</span>
                    <span className="clf-top1-conf">
                      p = {result.confidence.toFixed(4)}
                    </span>
                  </div>

                  <h3>Top-3 class probabilities</h3>
                  <div className="clf-bars">
                    {top.map((p, i) => (
                      <div key={p.class} className={`clf-bar-row${p.class === expected ? ' is-expected' : ''}`}>
                        <span className="clf-bar-name">{i + 1}. {label(p.class)}</span>
                        <div className="clf-bar-track">
                          <div className="clf-bar-fill" style={{ width: `${p.confidence * 100}%` }} />
                        </div>
                        <span className="clf-bar-val">{(p.confidence * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>

                  {expected && (
                    <div className={`clf-verdict ${isMatch ? 'ok' : 'bad'}`}>
                      {isMatch ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      <div>
                        <strong>{isMatch ? 'Label verified' : 'Label not verified'}</strong>
                        <p>
                          Expected <em>{label(expected)}</em>;{' '}
                          {isMatch
                            ? 'the model\'s top-1 prediction agrees.'
                            : expectedRank > 0
                              ? `the model ranks it #${expectedRank + 1} with p = ${top[expectedRank].confidence.toFixed(4)}.`
                              : 'it is not among the model\'s top-3 predictions.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="clf-meta">Round-trip latency: {result.latencyMs} ms</p>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Classification;
