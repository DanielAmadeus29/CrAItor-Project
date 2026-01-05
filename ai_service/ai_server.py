import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow import keras
import numpy as np
from PIL import Image
import json
import io
import traceback
from datetime import datetime
import sys

# PyTorch imports for aesthetic model and captioning
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms

# Import EfficientNet
try:
    from efficientnet_pytorch import EfficientNet
    EFFICIENTNET_AVAILABLE = True
    print("EfficientNet imported successfully")
except ImportError:
    EFFICIENTNET_AVAILABLE = False
    print("WARNING: efficientnet-pytorch not available")

# Import Transformers for Phi model (captioning)
try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    TRANSFORMERS_AVAILABLE = True
    print("Transformers imported successfully")
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("WARNING: transformers not available")

# Import torchvision models for ImageNet tagging
try:
    from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
    TORCHVISION_MODELS_AVAILABLE = True
    print("Torchvision models imported successfully")
except ImportError:
    TORCHVISION_MODELS_AVAILABLE = False
    print("WARNING: torchvision models not available")

app = Flask(__name__)
CORS(app)

# ============================================================================
# FIX WINDOWS ENCODING ISSUE
# ============================================================================

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# ============================================================================
# LOGGING HELPER
# ============================================================================

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    symbols = {
        "SUCCESS": "[OK]",
        "ERROR": "[ERR]",
        "INFO": "[-->]",
        "WARNING": "[!]"
    }
    symbol = symbols.get(level, "[---]")
    print(f"[{timestamp}] {symbol} [{level}] {message}")

# ============================================================================
# IMPROVED CAPTIONING - BAD TAGS & FILTERING
# ============================================================================

# Expanded list of generic/useless tags to filter out
BAD_TAGS = {
    'rule of thirds', 'balancing elements', 'color harmony', 'content',
    'depth of field', 'light', 'lighting', 'motion blur', 'object emphasis',
    'repetition', 'symmetry', 'vivid color', 'vividcolor', 'balance',
    'composition', 'aesthetic', 'photography', 'photograph', 'image',
    'picture', 'photo', 'frame', 'shot', 'capture', 'visual', 'scene',
    'view', 'background', 'foreground', 'aspect', 'element', 'feature',
    'quality', 'style', 'tone', 'mood', 'atmosphere', 'texture',
    'pattern', 'design', 'arrangement', 'layout', 'perspective'
}

# Specific category keywords for better tag consolidation
DOG_BREED_KEYWORDS = [
    'retriever', 'spaniel', 'terrier', 'shepherd', 'bulldog', 'poodle',
    'husky', 'corgi', 'beagle', 'pug', 'chihuahua', 'dachshund', 'boxer',
    'rottweiler', 'doberman', 'schnauzer', 'collie', 'pomeranian', 'shiba',
    'labrador', 'cocker', 'pointer', 'setter', 'hound', 'mastiff'
]

CAT_BREED_KEYWORDS = [
    'tabby', 'siamese', 'persian', 'maine coon', 'bengal', 'ragdoll',
    'british shorthair', 'sphynx', 'abyssinian', 'calico'
]

BIRD_KEYWORDS = [
    'eagle', 'hawk', 'owl', 'parrot', 'sparrow', 'robin', 'cardinal',
    'blue jay', 'crow', 'raven', 'pigeon', 'dove', 'hummingbird',
    'woodpecker', 'finch', 'canary', 'cockatoo', 'macaw', 'parakeet'
]

# ============================================================================
# AESTHETIC MODEL ARCHITECTURE - EFFICIENTNET B0
# ============================================================================

class AADBAestheticModel(nn.Module):
    """
    EfficientNet B0 based model for aesthetic assessment
    This matches the architecture used during training
    """
    def __init__(self, num_attributes=11, pretrained=False):
        super(AADBAestheticModel, self).__init__()

        if not EFFICIENTNET_AVAILABLE:
            raise ImportError("efficientnet-pytorch not installed")

        # Load EfficientNet-B0
        if pretrained:
            self.efficientnet = EfficientNet.from_pretrained('efficientnet-b0')
        else:
            self.efficientnet = EfficientNet.from_name('efficientnet-b0')

        # Get the number of features from EfficientNet
        num_features = self.efficientnet._fc.in_features

        # Remove the original classifier
        self.efficientnet._fc = nn.Identity()

        # Shared feature extraction layers
        self.shared_fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.3)
        )

        # Overall score prediction head
        self.score_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1)
        )

        # Attribute prediction head
        self.attribute_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_attributes)
        )

    def forward(self, x):
        # Extract features using EfficientNet
        features = self.efficientnet(x)

        # Shared processing
        shared_features = self.shared_fc(features)

        # Predict overall score (0-1 range, no scaling)
        overall_score = self.score_head(shared_features)

        # Predict attributes (0-1 range, no scaling)
        attributes = self.attribute_head(shared_features)

        return overall_score.squeeze(), attributes

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_category(score):
    """Convert score to category with color"""
    if score >= 0.9:
        return {"name": "Exceptional", "emoji": "⭐⭐⭐⭐⭐", "color": "#27ae60"}
    elif score >= 0.8:
        return {"name": "Excellent", "emoji": "⭐⭐⭐⭐", "color": "#2ecc71"}
    elif score >= 0.7:
        return {"name": "Very Good", "emoji": "⭐⭐⭐", "color": "#3498db"}
    elif score >= 0.6:
        return {"name": "Good", "emoji": "⭐⭐", "color": "#f39c12"}
    elif score >= 0.5:
        return {"name": "Average", "emoji": "⭐", "color": "#e67e22"}
    else:
        return {"name": "Below Average", "emoji": "○", "color": "#e74c3c"}

def clean_tags(labels, scores=None):
    """
    Improved tag cleaning and deduplication with category consolidation
    
    Args:
        labels: List of string labels
        scores: Optional list of confidence scores
        
    Returns:
        List of cleaned, deduplicated tags
    """
    cleaned = []
    seen = set()
    
    for i, label in enumerate(labels):
        lx = label.lower().strip()
        
        # Skip bad/generic tags
        if lx in BAD_TAGS:
            continue
        
        # Skip very low confidence tags if scores provided
        if scores and scores[i] < 0.05:
            continue
            
        # Consolidate dog breeds
        if any(k in lx for k in DOG_BREED_KEYWORDS):
            if 'dog' not in seen:
                seen.add('dog')
                cleaned.append('dog')
            continue
        
        # Consolidate cat breeds
        if any(k in lx for k in CAT_BREED_KEYWORDS):
            if 'cat' not in seen:
                seen.add('cat')
                cleaned.append('cat')
            continue
        
        # Consolidate bird types
        if any(k in lx for k in BIRD_KEYWORDS):
            if 'bird' not in seen:
                seen.add('bird')
                cleaned.append('bird')
            continue
        
        # Remove common prefixes/suffixes
        lx = lx.replace('_', ' ')
        
        # Skip duplicates
        if lx not in seen:
            seen.add(lx)
            cleaned.append(lx)
    
    # Ensure we have at least some tags
    if not cleaned and labels:
        # Fall back to first 2-3 original labels
        cleaned = [labels[0].lower().strip()]
        if len(labels) > 1:
            cleaned.append(labels[1].lower().strip())
    
    # Limit to top 8 most relevant tags
    return cleaned[:8]

# ============================================================================
# LOAD MODELS AT STARTUP
# ============================================================================

log("=" * 60)
log("STARTING AI SERVER WITH IMPROVED CAPTIONING")
log("=" * 60)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
log(f"Using device: {device}")

# 1. Load TensorFlow/Keras Classification Model
log("Loading classification model...")
try:
    classification_model = keras.models.load_model('ImageModel.keras')
    with open('ImageModel_class.json', 'r') as f:
        class_indices = json.load(f)
        index_to_class = {v: k for k, v in class_indices.items()}
    log(f"Classification model loaded! Classes: {len(class_indices)}", "SUCCESS")
except Exception as e:
    log(f"Classification model failed: {e}", "ERROR")
    classification_model = None
    class_indices = {}
    index_to_class = {}

# 2. Load PyTorch Aesthetic Model (EfficientNet-B0)
log("Loading aesthetic model (EfficientNet-B0)...")
try:
    if not EFFICIENTNET_AVAILABLE:
        raise ImportError("efficientnet-pytorch not installed")
    
    # Initialize model with EfficientNet
    aesthetic_model = AADBAestheticModel(
        num_attributes=11,
        pretrained=False
    ).to(device)
    
    # Load checkpoint
    aesthetic_checkpoint = torch.load(
        'AADB.pth',
        map_location=device,
        weights_only=False
    )
    
    aesthetic_model.load_state_dict(aesthetic_checkpoint['model_state_dict'])
    aesthetic_model.eval()
    
    log(f"Aesthetic model loaded! Device: {device}", "SUCCESS")
    if 'epoch' in aesthetic_checkpoint:
        log(f"Trained epochs: {aesthetic_checkpoint['epoch']}", "INFO")
    if 'metrics' in aesthetic_checkpoint and 'overall_mae' in aesthetic_checkpoint['metrics']:
        log(f"Validation MAE: {aesthetic_checkpoint['metrics']['overall_mae']:.4f}", "INFO")
        
except Exception as e:
    log(f"Aesthetic model failed: {e}", "ERROR")
    log(traceback.format_exc(), "ERROR")
    aesthetic_model = None

# 3. Load EfficientNet-B0 for ImageNet classification (for captioning tags)
log("Loading EfficientNet-B0 for ImageNet tagging...")
effnet_tagger = None
effnet_preprocess = None
imagenet_categories = []

try:
    if not TORCHVISION_MODELS_AVAILABLE:
        raise ImportError("torchvision models not available")
    
    weights = EfficientNet_B0_Weights.DEFAULT
    effnet_tagger = efficientnet_b0(weights=weights).to(device).eval()
    effnet_preprocess = weights.transforms()
    imagenet_categories = weights.meta["categories"]
    
    log(f"EfficientNet tagger loaded with {len(imagenet_categories)} categories!", "SUCCESS")
except Exception as e:
    log(f"EfficientNet tagger failed: {e}", "ERROR")
    log("Captioning will not be available", "WARNING")

# 4. Load Phi model for caption generation
log("Loading Phi model for caption generation...")
PHI_MODEL = "microsoft/phi-1_5"
phi_tokenizer = None
phi_model = None

try:
    if not TRANSFORMERS_AVAILABLE:
        raise ImportError("transformers library not available")
    
    phi_tokenizer = AutoTokenizer.from_pretrained(PHI_MODEL)
    phi_model = AutoModelForCausalLM.from_pretrained(
        PHI_MODEL,
        torch_dtype=torch.float16 if device.type == 'cuda' else torch.float32
    ).to(device).eval()
    
    log(f"Phi model loaded! ({PHI_MODEL})", "SUCCESS")
except Exception as e:
    log(f"Phi model failed: {e}", "ERROR")
    log("Captioning will not be available", "WARNING")

# Define aesthetic transform
aesthetic_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                        std=[0.229, 0.224, 0.225])
])

# Attribute names - proper format
ATTRIBUTE_NAMES = [
    'Balancing Elements',
    'Color Harmony',
    'Content',
    'Depth of Field',
    'Light',
    'Motion Blur',
    'Object Emphasis',
    'Repetition',
    'Rule of Thirds',
    'Symmetry',
    'Vivid Color'
]

# ============================================================================
# IMPROVED CAPTIONING FUNCTIONS
# ============================================================================

def get_imagenet_labels(img_pil, top_k=10):
    """
    Get top-K ImageNet labels for an image with improved filtering
    
    Args:
        img_pil: PIL Image
        top_k: Number of top predictions to return
        
    Returns:
        Tuple of (labels, scores)
    """
    if effnet_tagger is None or effnet_preprocess is None:
        return [], []
    
    try:
        x = effnet_preprocess(img_pil).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = effnet_tagger(x)
            probs = F.softmax(logits, dim=1)[0]
            topk_vals, topk_idx = torch.topk(probs, top_k)
        
        labels = [imagenet_categories[i] for i in topk_idx.tolist()]
        scores = topk_vals.tolist()
        return labels, scores
    except Exception as e:
        log(f"Error getting ImageNet labels: {e}", "ERROR")
        return [], []

@torch.no_grad()
def generate_caption(final_tags, max_new_tokens=30, temperature=0.7):
    """
    Generate caption from tags using Phi model with improved prompting
    
    Args:
        final_tags: List of cleaned tags
        max_new_tokens: Maximum tokens to generate
        temperature: Sampling temperature (lower = more deterministic)
        
    Returns:
        Generated caption string
    """
    if phi_model is None or phi_tokenizer is None:
        return "A beautiful moment captured in time."
    
    try:
        # Join tags with better formatting - limit to top 6 for focus
        tags = ", ".join(final_tags[:6])
        
        # Improved prompt with few-shot examples for better accuracy
        prompt = (
            "Write a descriptive Instagram caption based on the image content.\n"
            "Rules:\n"
            "- Describe what you see naturally and accurately\n"
            "- Keep it under 20 words\n"
            "- Be creative but truthful to the content\n"
            "- Use vivid, sensory language\n"
            "- Don't just list tags\n\n"
            "Examples:\n"
            "Tags: sunset, ocean, waves, golden hour\n"
            "Caption: Golden waves dance beneath a painted sky as day surrenders to twilight.\n\n"
            "Tags: coffee, morning, sunlight, cozy\n"
            "Caption: Morning light streams through the window, warming hands wrapped around fresh coffee.\n\n"
            "Tags: dog, park, playing, happy\n"
            "Caption: Pure joy in motion as four paws bound through the afternoon park.\n\n"
            f"Tags: {tags}\n"
            "Caption:"
        )
        
        inputs = phi_tokenizer(prompt, return_tensors="pt").to(device)
        
        # Improved generation parameters for better quality
        out = phi_model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=0.92,
            top_k=50,
            do_sample=True,
            repetition_penalty=1.2,
            pad_token_id=phi_tokenizer.eos_token_id,
            eos_token_id=phi_tokenizer.eos_token_id,
        )
        
        text = phi_tokenizer.decode(out[0], skip_special_tokens=True)
        
        # Extract only the caption part
        if "Caption:" in text:
            text = text.split("Caption:")[-1].strip()
        
        # Clean up the output
        text = text.split("\n")[0].strip()  # Take only first line
        
        # Ensure proper sentence ending
        if text and not text.endswith(('.', '!', '?')):
            if '.' in text:
                text = text.split('.')[0].strip() + '.'
            else:
                text = text.strip() + '.'
        
        # Remove any remaining tags/examples that might have leaked
        if "Tags:" in text:
            text = text.split("Tags:")[0].strip()
        
        # Fallback if caption is too short or empty
        if not text or len(text.split()) < 3:
            text = f"A captivating scene featuring {final_tags[0] if final_tags else 'beauty'}."
        
        # Ensure reasonable length
        words = text.split()
        if len(words) > 25:
            text = ' '.join(words[:25]) + '.'
        
        return text
        
    except Exception as e:
        log(f"Error generating caption: {e}", "ERROR")
        return "A beautiful moment captured in time."

def generate_multiple_captions(final_tags, num_captions=3):
    """
    Generate multiple caption variations for the user to choose from
    
    Args:
        final_tags: List of cleaned tags
        num_captions: Number of captions to generate
        
    Returns:
        List of caption strings
    """
    captions = []
    temperatures = [0.6, 0.75, 0.9]  # Different temperatures for variety
    
    for i in range(min(num_captions, len(temperatures))):
        caption = generate_caption(final_tags, temperature=temperatures[i])
        if caption not in captions:  # Avoid duplicates
            captions.append(caption)
    
    return captions

# ============================================================================
# MIDDLEWARE - LOG ALL REQUESTS
# ============================================================================

@app.before_request
def log_request():
    log(f"Incoming {request.method} request to {request.path}")
    if request.files:
        log(f"Files received: {list(request.files.keys())}")

@app.after_request
def log_response(response):
    log(f"Response sent: {response.status}")
    return response

# ============================================================================
# API ENDPOINTS - ORIGINAL
# ============================================================================

@app.route('/api/predict', methods=['POST'])
def predict_classification():
    """Original classification endpoint"""
    log("=== CLASSIFICATION PREDICTION START ===")
    
    try:
        if classification_model is None:
            log("Classification model not loaded!", "ERROR")
            return jsonify({'success': False, 'error': 'Classification model not loaded'}), 500
            
        if 'file' not in request.files:
            log("No file in request!", "ERROR")
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        log(f"Processing file: {file.filename}")
        
        # Read and preprocess image
        file_bytes = file.read()
        log(f"File size: {len(file_bytes)} bytes")
        
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        log(f"Image size: {img.size}")
        
        img = img.resize((224, 224))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        log(f"Image preprocessed: shape {img_array.shape}")
        
        # Make prediction
        log("Running model inference...")
        predictions = classification_model.predict(img_array, verbose=0)
        predicted_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_idx])
        predicted_class = index_to_class[predicted_idx]
        
        log(f"Prediction: {predicted_class} (confidence: {confidence:.2%})", "SUCCESS")
        
        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3 = [
            {
                'class': index_to_class[idx],
                'confidence': float(predictions[0][idx])
            }
            for idx in top_3_idx
        ]
        
        result = {
            'success': True,
            'prediction': predicted_class,
            'confidence': confidence,
            'top_predictions': top_3
        }
        
        log("=== CLASSIFICATION PREDICTION END ===")
        return jsonify(result)
    
    except Exception as e:
        log(f"EXCEPTION in classification: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/aesthetic', methods=['POST'])
def predict_aesthetic():
    """Aesthetic scoring endpoint - Returns format for React frontend"""
    log("=== AESTHETIC PREDICTION START ===")
    
    try:
        if aesthetic_model is None:
            log("Aesthetic model not loaded!", "ERROR")
            return jsonify({'success': False, 'error': 'Aesthetic model not loaded'}), 500
            
        if 'file' not in request.files:
            log("No file in request!", "ERROR")
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        log(f"Processing file: {file.filename}")
        
        # Read and preprocess image
        file_bytes = file.read()
        log(f"File size: {len(file_bytes)} bytes")
        
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        original_size = img.size
        log(f"Image size: {img.size}")
        
        img_tensor = aesthetic_transform(img).unsqueeze(0).to(device)
        log(f"Image tensor shape: {img_tensor.shape}")
        
        # Make prediction
        log("Running aesthetic model inference...")
        with torch.no_grad():
            pred_score, pred_attributes = aesthetic_model(img_tensor)
            
            # Convert to numpy
            pred_score = pred_score.cpu().numpy()
            if pred_score.ndim == 0:
                pred_score = float(pred_score)
            else:
                pred_score = pred_score[0] if len(pred_score) == 1 else pred_score
            
            pred_attributes = pred_attributes.cpu().numpy()
            if pred_attributes.ndim > 1:
                pred_attributes = pred_attributes[0]
        
        log(f"Aesthetic score: {pred_score:.4f}", "SUCCESS")
        
        # Create attributes dictionary
        attributes = {
            ATTRIBUTE_NAMES[i]: float(pred_attributes[i])
            for i in range(len(ATTRIBUTE_NAMES))
        }
        
        # Get category
        category = get_category(pred_score)
        
        # Prepare attributes array sorted by score
        attributes_array = [
            {
                'name': ATTRIBUTE_NAMES[i],
                'score': float(pred_attributes[i])
            }
            for i in range(len(ATTRIBUTE_NAMES))
        ]
        attributes_sorted = sorted(attributes_array, key=lambda x: x['score'], reverse=True)
        
        # Build response matching React frontend expectations
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'image': {
                'filename': file.filename,
                'width': original_size[0],
                'height': original_size[1]
            },
            'overall_score': float(pred_score),
            'percentage': float(pred_score * 100),
            'category': category,
            'attributes': attributes,
            'attributes_array': attributes_sorted,
            'top_attributes': attributes_sorted[:3],
            'bottom_attributes': attributes_sorted[-3:]
        }
        
        log("=== AESTHETIC PREDICTION END ===")
        return jsonify(result)
    
    except Exception as e:
        log(f"EXCEPTION in aesthetic: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/analyze-aesthetic', methods=['POST'])
def analyze_aesthetic():
    """Alias endpoint for aesthetic scoring"""
    log("=== ANALYZE-AESTHETIC (alias) ===")
    return predict_aesthetic()


@app.route('/api/analyze', methods=['POST'])
def analyze_complete():
    """Combined endpoint - both classification and aesthetic"""
    log("=== COMPLETE ANALYSIS START ===")
    
    try:
        if 'file' not in request.files:
            log("No file in request!", "ERROR")
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        log(f"Processing file: {file.filename}")
        file_bytes = file.read()
        
        results = {'success': True, 'timestamp': datetime.now().isoformat()}
        
        # Classification
        if classification_model is not None:
            try:
                log("Running classification...")
                img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
                img_resized = img.resize((224, 224))
                img_array = np.array(img_resized) / 255.0
                img_array = np.expand_dims(img_array, axis=0)
                
                predictions = classification_model.predict(img_array, verbose=0)
                predicted_idx = np.argmax(predictions[0])
                
                results['classification'] = {
                    'class': index_to_class[predicted_idx],
                    'confidence': float(predictions[0][predicted_idx])
                }
                log(f"Classification: {results['classification']['class']}", "SUCCESS")
            except Exception as e:
                log(f"Classification error: {e}", "ERROR")
                results['classification_error'] = str(e)
        
        # Aesthetic scoring
        if aesthetic_model is not None:
            try:
                log("Running aesthetic analysis...")
                img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
                img_tensor = aesthetic_transform(img).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    pred_score, pred_attributes = aesthetic_model(img_tensor)
                    pred_score = float(pred_score.cpu().numpy())
                    pred_attributes = pred_attributes.cpu().numpy()[0]
                
                attributes = {
                    ATTRIBUTE_NAMES[i]: float(pred_attributes[i])
                    for i in range(len(ATTRIBUTE_NAMES))
                }
                
                category = get_category(pred_score)
                
                results['aesthetic'] = {
                    'overall_score': pred_score,
                    'percentage': pred_score * 100,
                    'category': category,
                    'attributes': attributes
                }
                log(f"Aesthetic: {pred_score:.4f}", "SUCCESS")
            except Exception as e:
                log(f"Aesthetic error: {e}", "ERROR")
                results['aesthetic_error'] = str(e)
        
        log("=== COMPLETE ANALYSIS END ===")
        return jsonify(results)
    
    except Exception as e:
        log(f"EXCEPTION in complete analysis: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# API ENDPOINTS - IMPROVED CAPTIONING
# ============================================================================

@app.route('/api/caption/analyze-image', methods=['POST'])
def analyze_image_for_caption():
    """Analyze image and return improved suggested tags for captioning"""
    log("=== ANALYZE IMAGE FOR CAPTION START (IMPROVED) ===")
    
    try:
        # Check if tagging model is loaded
        if effnet_tagger is None:
            log("Tagging model not loaded!", "ERROR")
            return jsonify({
                'success': False, 
                'error': 'Tagging model not available. Please ensure torchvision is installed.'
            }), 500
        
        if 'image' not in request.files:
            log("No image in request!", "ERROR")
            return jsonify({'success': False, 'error': 'No image uploaded'}), 400
        
        file = request.files['image']
        log(f"Processing file: {file.filename}")
        
        # Get top_k parameter (increased default for better filtering)
        top_k = request.form.get('top_k', 15, type=int)
        
        # Read image
        file_bytes = file.read()
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        log(f"Image size: {img.size}")
        
        # Get ImageNet tags with increased top_k
        raw_labels, scores = get_imagenet_labels(img, top_k=top_k)
        log(f"Raw labels: {raw_labels}")
        log(f"Scores: {[f'{s:.3f}' for s in scores]}")
        
        # Clean tags with improved filtering
        suggested_tags = clean_tags(raw_labels, scores)
        log(f"Suggested tags (cleaned): {suggested_tags}")
        
        result = {
            'success': True,
            'suggested_tags': suggested_tags,
            'raw_labels': raw_labels,
            'scores': scores,
            'image_info': {
                'filename': file.filename,
                'width': img.size[0],
                'height': img.size[1]
            }
        }
        
        log(f"Analysis complete: {len(suggested_tags)} tags", "SUCCESS")
        log("=== ANALYZE IMAGE FOR CAPTION END ===")
        return jsonify(result)
    
    except Exception as e:
        log(f"EXCEPTION in analyze image: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/caption/generate', methods=['POST'])
def generate_caption_from_tags():
    """Generate improved caption from provided tags"""
    log("=== GENERATE CAPTION FROM TAGS START (IMPROVED) ===")
    
    try:
        if phi_model is None:
            return jsonify({
                'success': False,
                'error': 'Caption generation model not available'
            }), 500
        
        data = request.get_json()
        
        if not data or 'tags' not in data:
            return jsonify({'success': False, 'error': 'No tags provided'}), 400
        
        tags = data['tags']
        temperature = data.get('temperature', 0.7)  # Lower default for more accuracy
        max_tokens = data.get('max_tokens', 30)  # Increased for better captions
        num_variations = data.get('num_variations', 1)  # Allow multiple captions
        
        log(f"Generating caption for tags: {tags}")
        log(f"Parameters: temp={temperature}, max_tokens={max_tokens}, variations={num_variations}")
        
        if num_variations > 1:
            # Generate multiple caption variations
            captions = generate_multiple_captions(tags, num_captions=num_variations)
            primary_caption = captions[0] if captions else "A beautiful moment."
            
            result = {
                'success': True,
                'caption': primary_caption,
                'variations': captions,
                'tags_used': tags,
                'timestamp': datetime.now().isoformat()
            }
        else:
            # Generate single caption
            caption = generate_caption(tags, max_new_tokens=max_tokens, temperature=temperature)
            
            result = {
                'success': True,
                'caption': caption,
                'tags_used': tags,
                'timestamp': datetime.now().isoformat()
            }
        
        log(f"Caption: {result['caption']}", "SUCCESS")
        log("=== GENERATE CAPTION FROM TAGS END ===")
        return jsonify(result)
    
    except Exception as e:
        log(f"EXCEPTION: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/caption/generate-complete', methods=['POST'])
def generate_complete_caption():
    """
    Complete captioning pipeline: analyze image -> generate caption
    Single endpoint for convenience
    """
    log("=== COMPLETE CAPTION GENERATION START ===")
    
    try:
        if effnet_tagger is None or phi_model is None:
            return jsonify({
                'success': False,
                'error': 'Captioning models not available'
            }), 500
        
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image uploaded'}), 400
        
        file = request.files['image']
        log(f"Processing file: {file.filename}")
        
        # Parameters
        temperature = request.form.get('temperature', 0.7, type=float)
        num_variations = request.form.get('num_variations', 1, type=int)
        
        # Read and analyze image
        file_bytes = file.read()
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        
        # Get tags
        raw_labels, scores = get_imagenet_labels(img, top_k=15)
        suggested_tags = clean_tags(raw_labels, scores)
        
        log(f"Tags: {suggested_tags}")
        
        # Generate caption(s)
        if num_variations > 1:
            captions = generate_multiple_captions(suggested_tags, num_captions=num_variations)
            primary_caption = captions[0] if captions else "A beautiful moment."
            
            result = {
                'success': True,
                'caption': primary_caption,
                'variations': captions,
                'tags': suggested_tags,
                'raw_labels': raw_labels,
                'image_info': {
                    'filename': file.filename,
                    'width': img.size[0],
                    'height': img.size[1]
                },
                'timestamp': datetime.now().isoformat()
            }
        else:
            caption = generate_caption(suggested_tags, temperature=temperature)
            
            result = {
                'success': True,
                'caption': caption,
                'tags': suggested_tags,
                'raw_labels': raw_labels,
                'image_info': {
                    'filename': file.filename,
                    'width': img.size[0],
                    'height': img.size[1]
                },
                'timestamp': datetime.now().isoformat()
            }
        
        log(f"Caption: {result['caption']}", "SUCCESS")
        log("=== COMPLETE CAPTION GENERATION END ===")
        return jsonify(result)
    
    except Exception as e:
        log(f"EXCEPTION: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/get-tags', methods=['POST'])
def get_tags_only():
    """Get improved ImageNet tags for an image without generating caption"""
    log("=== GET TAGS START (IMPROVED) ===")
    
    try:
        if effnet_tagger is None:
            return jsonify({
                'success': False,
                'error': 'Tagging model not available'
            }), 500
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        top_k = request.form.get('top_k', 15, type=int)
        
        file_bytes = file.read()
        img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        
        raw_labels, scores = get_imagenet_labels(img, top_k=top_k)
        cleaned_tags = clean_tags(raw_labels, scores)
        
        result = {
            'success': True,
            'raw_labels': raw_labels,
            'scores': scores,
            'cleaned_tags': cleaned_tags,
            'image': {
                'filename': file.filename,
                'width': img.size[0],
                'height': img.size[1]
            }
        }
        
        log(f"Tags: {cleaned_tags}", "SUCCESS")
        log("=== GET TAGS END ===")
        return jsonify(result)
    
    except Exception as e:
        log(f"EXCEPTION: {e}", "ERROR")
        log(traceback.format_exc(), "ERROR")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    log("Health check requested")
    return jsonify({
        'status': 'healthy', 
        'service': 'AI Prediction Server with Improved Captioning',
        'version': '2.0',
        'models': {
            'classification': classification_model is not None,
            'aesthetic': aesthetic_model is not None,
            'caption_tagger': effnet_tagger is not None,
            'caption_generator': phi_model is not None
        },
        'num_classes': len(class_indices) if classification_model else 0,
        'device': str(device) if device else 'N/A',
        'improvements': [
            'Better tag filtering and consolidation',
            'Improved caption generation with few-shot prompting',
            'Multiple caption variations support',
            'Enhanced temperature and sampling parameters',
            'Complete captioning pipeline endpoint'
        ]
    })


@app.route('/classes', methods=['GET'])
def get_classes():
    log("Classes list requested")
    if classification_model is None:
        return jsonify({'success': False, 'error': 'Classification model not loaded'}), 500
    
    return jsonify({
        'success': True,
        'classes': list(class_indices.keys()),
        'num_classes': len(class_indices)
    })


@app.route('/api/attributes', methods=['GET'])
def get_attributes():
    """Get list of all aesthetic attributes"""
    return jsonify({
        'success': True,
        'attributes': ATTRIBUTE_NAMES,
        'count': len(ATTRIBUTE_NAMES)
    })


@app.route('/api/caption/models-status', methods=['GET'])
def caption_models_status():
    """Check if captioning models are available with version info"""
    return jsonify({
        'success': True,
        'version': '2.0',
        'tagger_available': effnet_tagger is not None,
        'generator_available': phi_model is not None,
        'captioning_enabled': effnet_tagger is not None and phi_model is not None,
        'device': str(device),
        'improvements': {
            'tag_filtering': 'Enhanced with category consolidation',
            'caption_quality': 'Few-shot prompting with examples',
            'variations': 'Multiple caption generation support',
            'parameters': 'Optimized temperature and sampling'
        }
    })


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(e):
    log(f"404 Error: {request.path}", "ERROR")
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    log(f"500 Error: {str(e)}", "ERROR")
    return jsonify({'success': False, 'error': 'Internal server error'}), 500


if __name__ == '__main__':
    log("=" * 60)
    log("AI SERVER READY (v2.0 - IMPROVED CAPTIONING)", "SUCCESS")
    log("=" * 60)
    log("Available endpoints:")
    log("  POST /api/predict                       - Image classification")
    log("  POST /api/aesthetic                     - Aesthetic scoring")
    log("  POST /api/analyze-aesthetic             - Aesthetic scoring (alias)")
    log("  POST /api/caption/analyze-image         - Analyze image for tags (IMPROVED)")
    log("  POST /api/caption/generate              - Generate caption from tags (IMPROVED)")
    log("  POST /api/caption/generate-complete     - Complete captioning pipeline (NEW)")
    log("  POST /api/get-tags                      - Get image tags only (IMPROVED)")
    log("  GET  /health                            - Health check")
    log("  GET  /classes                           - List classes")
    log("  GET  /api/attributes                    - List aesthetic attributes")
    log("  GET  /api/caption/models-status         - Caption models status")
    log("=" * 60)
    log(f"Improvements v2.0:")
    log(f"  ✓ Better tag filtering & consolidation")
    log(f"  ✓ Few-shot prompting for accurate captions")
    log(f"  ✓ Multiple caption variations")
    log(f"  ✓ Optimized generation parameters")
    log(f"  ✓ Complete pipeline endpoint")
    log("=" * 60)
    log(f"Models loaded:")
    log(f"  Classification:    {'YES' if classification_model else 'NO'}")
    log(f"  Aesthetic:         {'YES' if aesthetic_model else 'NO'}")
    log(f"  Caption Tagger:    {'YES' if effnet_tagger else 'NO'}")
    log(f"  Caption Generator: {'YES' if phi_model else 'NO'}")
    log("=" * 60) 
    log("Server starting on http://localhost:5001")
    
    app.run(debug=True, port=5001, host='0.0.0.0')