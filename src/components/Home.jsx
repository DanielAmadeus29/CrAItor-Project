import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ScanSearch, Sparkles, MessageSquareText, ArrowRight } from 'lucide-react';
import { useUser } from '../UserContexts';
import Sidebar from './Sidebar';
import './Home.css';
import classificationMetricsImg from '../assets/metrics/classification-metrics.png';
import aestheticMetricsImg from '../assets/metrics/aesthetic-metrics.png';

const AI_URL = 'http://localhost:5001';

/* ---------- Evaluation data (from src/assets/metrics/*.png
   and the AADB.pth checkpoint) ---------- */

const CLF_OVERALL = [
  ['Accuracy', 0.800],
  ['F1 (macro)', 0.816],
  ['F1 (weighted)', 0.796],
  ['Precision', 0.812],
  ['Recall', 0.834],
];

// [class, correct, n, mean confidence %], sorted by accuracy
const CLF_PER_CLASS = [
  ['Lifestyle', 9, 18, 64.7],
  ['Fashion', 5, 9, 83.3],
  ['Wildlife', 10, 12, 80.8],
  ['Product', 7, 8, 78.1],
  ['Landscape', 7, 8, 93.8],
  ['Macro', 8, 9, 92.6],
  ['Interior', 9, 10, 83.4],
  ['Food', 11, 12, 95.7],
  ['Astro', 6, 6, 92.2],
  ['Architecture', 8, 8, 94.5],
];

const AES_TEST = [
  ['R²', '0.508'],
  ['Pearson r', '0.716'],
  ['Spearman ρ', '0.701'],
  ['MAE', '0.112'],
  ['Median absolute error', '0.091'],
  ['RMSE', '0.143'],
];

const AES_BY_RANGE = [
  ['0.0 – 0.2', 72, 0.189],
  ['0.2 – 0.4', 265, 0.093],
  ['0.4 – 0.6', 331, 0.085],
  ['0.6 – 0.8', 261, 0.129],
  ['0.8 – 1.0', 71, 0.163],
];

const AES_TOLERANCE = [
  ['± 0.1', 54.6],
  ['± 0.2', 82.6],
  ['± 0.3', 95.9],
  ['± 0.5', 99.9],
];

// Validation MAE per attribute, read from the AADB.pth checkpoint (epoch 25).
const AES_ATTR_MAE = [
  ['Symmetry', 0.0360],
  ['Motion Blur', 0.0390],
  ['Repetition', 0.0822],
  ['Balancing Elements', 0.1538],
  ['Depth of Field', 0.1553],
  ['Rule of Thirds', 0.1785],
  ['Color Harmony', 0.2124],
  ['Vivid Color', 0.2435],
  ['Light', 0.2475],
  ['Object Emphasis', 0.3284],
  ['Content', 0.3596],
];

/* ---------- Small presentational helpers ---------- */

function MetricTiles({ items }) {
  return (
    <div className="metric-tiles">
      {items.map(([k, v]) => (
        <div key={k} className="metric-tile">
          <span className="metric-value">{typeof v === 'number' ? v.toFixed(3) : v}</span>
          <span className="metric-label">{k}</span>
        </div>
      ))}
    </div>
  );
}

function Figure({ src, caption }) {
  return (
    <figure className="figure">
      <a href={src} target="_blank" rel="noreferrer" title="Open full size">
        <img src={src} alt={caption} loading="lazy" />
      </a>
      <figcaption>{caption} Click to open at full size.</figcaption>
    </figure>
  );
}

function Bar({ value, max = 1 }) {
  return (
    <div className="mini-bar">
      <div className="mini-bar-fill" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

const ClassificationEvaluation = (
  <>
    <p className="table-caption">Held-out test set, n = 100 images.</p>
    <MetricTiles items={CLF_OVERALL} />

    <table className="metric-table wide">
      <thead>
        <tr>
          <th>Class</th>
          <th>n</th>
          <th>Accuracy</th>
          <th className="bar-col" />
          <th>Mean confidence</th>
        </tr>
      </thead>
      <tbody>
        {CLF_PER_CLASS.map(([name, correct, n, conf]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{n}</td>
            <td>{((correct / n) * 100).toFixed(1)}% <span className="frac">({correct}/{n})</span></td>
            <td className="bar-col"><Bar value={correct / n} /></td>
            <td>{conf.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>

    <p>
      Errors concentrate in two classes. Lifestyle (50.0%) is most often predicted as Fashion (4 of 18),
      Product (3) or Food (2), and Fashion (55.6%) as Lifestyle (3 of 9). Both are defined by context
      and styling rather than by a distinct subject, which is consistent with their visual overlap.
      Lifestyle also has the lowest mean confidence (64.7%), so confidence partly signals these
      harder cases. Across all test images the mean confidence is 83.8% (median 93.5%).
    </p>

    <Figure
      src={classificationMetricsImg}
      caption="Figure 1. Classification test results: overall metrics, per-class accuracy and confidence, confusion matrix, and confidence distribution (n = 100)."
    />
  </>
);

const AestheticEvaluation = (
  <>
    <p className="table-caption">Overall score, held-out test set, n = 1000 images.</p>
    <MetricTiles items={AES_TEST} />

    <div className="two-col">
      <div>
        <p className="table-caption">MAE by ground-truth score range</p>
        <table className="metric-table">
          <thead>
            <tr><th>Range</th><th>n</th><th>MAE</th></tr>
          </thead>
          <tbody>
            {AES_BY_RANGE.map(([r, n, mae]) => (
              <tr key={r}><td>{r}</td><td>{n}</td><td>{mae.toFixed(3)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="table-caption">Share of predictions within tolerance</p>
        <table className="metric-table">
          <thead>
            <tr><th>Tolerance</th><th>Within</th></tr>
          </thead>
          <tbody>
            {AES_TOLERANCE.map(([t, pct]) => (
              <tr key={t}><td>{t}</td><td>{pct.toFixed(1)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <p>
      Error is lowest for mid-range images (MAE 0.085 for 0.4–0.6) and roughly doubles at the
      extremes (0.189 below 0.2, 0.163 above 0.8). The model therefore compresses its predictions
      toward the mean: very poor images are over-scored and very strong images under-scored.
      The rank correlation (Spearman ρ = 0.701) shows that the ordering of images is captured
      better than their absolute scores.
    </p>

    <Figure
      src={aestheticMetricsImg}
      caption="Figure 2. Aesthetic score test results: correlation metrics, predicted vs. true scores, error distribution, residuals, MAE by score range, and accuracy within tolerance (n = 1000)."
    />

    <p className="table-caption">Attribute heads: validation MAE from the trained checkpoint (scale −1 to +1)</p>
    <table className="metric-table">
      <thead>
        <tr><th>Attribute</th><th>MAE</th><th className="bar-col" /></tr>
      </thead>
      <tbody>
        {AES_ATTR_MAE.map(([name, mae]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{mae.toFixed(3)}</td>
            <td className="bar-col"><Bar value={mae} max={0.4} /></td>
          </tr>
        ))}
        <tr className="row-muted"><td>Mean of 11 attributes</td><td>0.185</td><td className="bar-col" /></tr>
      </tbody>
    </table>
  </>
);

/* ---------- Tool descriptions ---------- */

const CLASSES = [
  'Architecture', 'Astro', 'Fashion', 'Food', 'Interior',
  'Landscape', 'Lifestyle', 'Macro', 'Product', 'Wildlife',
];

const TOOLS = [
  {
    id: 'classification',
    statusKeys: ['classification'],
    icon: ScanSearch,
    title: 'Photography Genre Classification',
    to: '/classification',
    summary:
      'Assigns a photograph to one of ten photography genres. Given an expected genre, it also reports whether the prediction agrees with it, which is how the tool verifies a user-supplied label.',
    specs: [
      ['Task', 'Single-label image classification, 10 classes'],
      ['Backbone', 'MobileNetV2 (α = 1.0, 224), ImageNet initialisation, fine-tuned end to end (153 of 154 backbone layers trainable)'],
      ['Head', 'GlobalAveragePooling2D → Dense(256, ReLU) → BatchNorm → Dropout(0.5) → Dense(10, softmax)'],
      ['Training', 'Adam, final learning rate 1 × 10⁻⁵, categorical cross-entropy'],
      ['Preprocessing', 'RGB, resized to 224 × 224 (aspect ratio not preserved), pixel values scaled to [0, 1]'],
      ['Output', 'Softmax distribution; top-1 class and top-3 classes with probabilities'],
      ['Framework', 'TensorFlow / Keras'],
    ],
    sections: [
      {
        heading: 'Classes',
        node: (
          <div className="chip-row">
            {CLASSES.map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
        ),
      },
      {
        heading: 'Verification',
        text: 'When an expected genre is given, the tool compares it with the top-1 prediction and reports a match or mismatch, along with the expected genre\'s rank in the top-3 list.',
      },
      { heading: 'Evaluation', node: ClassificationEvaluation },
    ],
    limitations: [
      'The test set is small (n = 100; 6–18 images per class), so per-class accuracies carry wide uncertainty.',
      'Closed set: every image is forced into one of the ten genres, even if it belongs to none of them. A plain single-colour test image, for example, is still assigned a genre with high confidence.',
      'Softmax probabilities are not calibrated; confidence is useful for ranking but is not a probability of being correct.',
      'Lifestyle and Fashion overlap visually with each other and with Product/Food, so a single-label output cannot represent images that belong to more than one genre.',
    ],
  },
  {
    id: 'aesthetic',
    statusKeys: ['aesthetic'],
    icon: Sparkles,
    title: 'Image Aesthetic Assessment',
    to: '/imageaesthetic',
    summary:
      'Predicts a global aesthetic score and eleven photographic attribute scores, using a multi-task model trained on the AADB dataset.',
    specs: [
      ['Task', 'Multi-task regression: 1 overall score + 11 attribute scores'],
      ['Backbone', 'EfficientNet-B0 feature extractor (1280-d), classifier removed'],
      ['Shared layers', 'Linear(1280→512) → ReLU → Dropout(0.3) → Linear(512→256) → ReLU → Dropout(0.3)'],
      ['Heads', 'Score head and attribute head, each Linear(256→128) → ReLU → Dropout(0.2) → Linear'],
      ['Dataset', 'AADB: Aesthetics and Attributes Database (Kong et al., 2016)'],
      ['Training', '25 epochs, joint loss = score loss + attribute loss'],
      ['Preprocessing', 'Resize to 224 × 224, ImageNet mean/std normalisation'],
      ['Output', 'Overall score in [0, 1]; attribute scores on the AADB scale [−1, +1]'],
      ['Framework', 'PyTorch'],
    ],
    sections: [
      {
        heading: 'Attributes',
        text: 'Balancing Elements, Color Harmony, Content, Depth of Field, Light, Motion Blur, Object Emphasis, Repetition, Rule of Thirds, Symmetry, Vivid Color.',
      },
      { heading: 'Evaluation', node: AestheticEvaluation },
    ],
    limitations: [
      'Aesthetic quality is subjective; the model learns the average judgement of the AADB raters, not a ground truth.',
      'With R² = 0.508, about half of the variance in rater scores is unexplained, and only 54.6% of predictions fall within ±0.1 of the target.',
      'Predictions regress toward the mean, so the extremes of the scale, which are also the least represented (n = 72 and n = 71), are the least reliable.',
      'Among the attributes, the semantic ones (Content, Object Emphasis) have the highest error. The lowest errors (Symmetry, Motion Blur) may partly reflect labels that rarely vary from zero.',
      'Resizing to a fixed square input distorts composition cues such as Rule of Thirds for non-square photographs.',
    ],
  },
  {
    id: 'caption',
    statusKeys: ['caption_tagger', 'caption_generator'],
    icon: MessageSquareText,
    title: 'Tag-Conditioned Caption Generation',
    to: '/captiongenerator',
    summary:
      'Generates a short descriptive caption in two stages. A CNN first extracts object tags from the image, then a small language model writes a sentence conditioned only on those tags.',
    specs: [
      ['Stage 1: tagging', 'EfficientNet-B0 (torchvision, ImageNet-1k weights), top-15 softmax labels'],
      ['Tag cleaning', 'Drop generic labels and those with p < 0.05; merge dog/cat/bird breeds into one tag; deduplicate; keep at most 8'],
      ['Stage 2: generation', 'Microsoft Phi-1.5 (1.3B parameters), causal language model'],
      ['Prompting', 'Instruction + 3 few-shot (tags → caption) examples; top 6 tags inserted'],
      ['Decoding', 'Sampling, temperature 0.7, top-p 0.92, top-k 50, repetition penalty 1.2, max 30 new tokens'],
      ['Post-processing', 'First line only, sentence-final punctuation enforced, truncated to 25 words'],
      ['Framework', 'PyTorch, Hugging Face Transformers'],
    ],
    sections: [
      {
        heading: 'Human in the loop',
        text: 'The detected tags and the raw ImageNet labels are shown before generation and can be replaced, so the effect of the tag set on the caption can be examined directly.',
      },
    ],
    limitations: [
      'The language model never sees the image; a caption can only be as accurate as the tags it receives.',
      'ImageNet-1k labels are object-centred and contain no scene, mood or action concepts, which limits the tag vocabulary.',
      'Sampling is stochastic, so the same tags can produce different captions.',
      'No quantitative caption metric (e.g. BLEU, CIDEr) has been computed for this pipeline.',
    ],
  },
];

/* ---------- Page ---------- */

function useAiHealth() {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`${AI_URL}/health`)
      .then((r) => r.json())
      .then((data) => !cancelled && setState({ status: 'ok', data }))
      .catch(() => !cancelled && setState({ status: 'offline', data: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function ModelStatus({ health, keys }) {
  if (health.status === 'loading') return <span className="status status-pending">Checking…</span>;
  if (health.status === 'offline') return <span className="status status-off">Server offline</span>;
  const loaded = keys.every((k) => health.data?.models?.[k]);
  return loaded
    ? <span className="status status-on">Model loaded</span>
    : <span className="status status-off">Not loaded</span>;
}

function ToolSection({ tool, health }) {
  const { id, statusKeys, icon: Icon, title, to, summary, specs, sections, limitations } = tool;
  return (
    <section id={id} className="tool-section">
      <div className="tool-section-head">
        <div className="model-icon"><Icon size={20} strokeWidth={1.8} /></div>
        <div className="tool-section-title">
          <h2>{title}</h2>
          <ModelStatus health={health} keys={statusKeys} />
        </div>
        <Link to={to} className="open-tool">
          Open tool <ArrowRight size={15} />
        </Link>
      </div>

      <p className="tool-summary">{summary}</p>

      <h3>Method</h3>
      <dl className="spec-table">
        {specs.map(([k, v]) => (
          <div key={k} className="spec-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {sections.map(({ heading, text, node }) => (
        <div key={heading}>
          <h3>{heading}</h3>
          {node}
          {text && <p>{text}</p>}
        </div>
      ))}

      <h3>Limitations</h3>
      <ul className="limitations">
        {limitations.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </section>
  );
}

function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const health = useAiHealth();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="loading-container">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <div className="overview">
          <header className="overview-header">
            <p className="eyebrow">Overview</p>
            <h1>CrAItor</h1>
            <p className="lead">
              Three computer-vision tools for analysing photographs: genre classification, aesthetic
              assessment and caption generation. This page describes the method, evaluation results
              and known limitations of each model.
            </p>
            <div className="server-line">
              <span className={`dot dot-${health.status}`} />
              {health.status === 'loading' && 'Checking inference server…'}
              {health.status === 'offline' && `Inference server not reachable at ${AI_URL}`}
              {health.status === 'ok' && `Inference server online · device: ${health.data?.device ?? 'n/a'}`}
            </div>
            <nav className="toc">
              {TOOLS.map((t, i) => (
                <a key={t.id} href={`#${t.id}`}>{i + 1}. {t.title}</a>
              ))}
            </nav>
          </header>

          {TOOLS.map((tool) => (
            <ToolSection key={tool.id} tool={tool} health={health} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default Home;
