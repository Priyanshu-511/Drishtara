import sys
import os
import json
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import keras
from keras import saving
from PIL import Image

MODEL_DIR    = os.path.join(os.path.dirname(__file__), "fea-iter-2.keras")
CONFIG_PATH  = os.path.join(MODEL_DIR, "config.json")
WEIGHTS_PATH = os.path.join(MODEL_DIR, "model.weights.h5")

CLASS_LABELS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]
INPUT_SIZE   = (48, 48)


def load_model():
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
    model = saving.deserialize_keras_object(config)
    model.load_weights(WEIGHTS_PATH)
    return model


def preprocess(image_path):
    img = Image.open(image_path).convert("RGB").resize(INPUT_SIZE)
    arr = np.array(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image not found: {image_path}"}))
        sys.exit(1)

    try:
        model = load_model()
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {e}"}))
        sys.exit(1)

    try:
        x = preprocess(image_path)
    except Exception as e:
        print(json.dumps({"error": f"Failed to preprocess image: {e}"}))
        sys.exit(1)

    try:
        preds      = model.predict(x, verbose=0)[0]
        class_idx  = int(np.argmax(preds))
        label      = CLASS_LABELS[class_idx]
        confidence = float(preds[class_idx]) * 100

        all_scores = {
            CLASS_LABELS[i]: round(float(preds[i]) * 100, 2)
            for i in range(len(CLASS_LABELS))
        }

        print(json.dumps({
            "prediction": f"{label} ({confidence:.1f}%)",
            "dominant":   label,
            "confidence": round(confidence, 1),
            "scores":     all_scores
        }))

    except Exception as e:
        print(json.dumps({"error": f"Prediction error: {e}"}))
        sys.exit(1)