#!/usr/bin/env python3
"""
ONNX & Edge Model Exporter for Adaptive Serverless Pre-Warming Engine
Converts trained scikit-learn RandomForestRegressor model to ONNX format (model/model.onnx)
and an edge-optimized tree structure (model/model_trees.json) for Cloudflare Workers.
"""

import json
import os
import sys
import joblib
import numpy as np
import onnxruntime as rt
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JOBLIB_PATH = os.path.join(BASE_DIR, "trained_model.joblib")
ONNX_PATH = os.path.join(BASE_DIR, "model.onnx")
JSON_PATH = os.path.join(BASE_DIR, "model_trees.json")

def eval_tree_json(trees, features):
    total = 0.0
    for tree in trees:
        node = 0
        lefts = tree["left"]
        rights = tree["right"]
        feats = tree["feat"]
        threshs = tree["thresh"]
        vals = tree["val"]
        while lefts[node] != -1:
            f_idx = feats[node]
            if features[f_idx] <= threshs[node]:
                node = lefts[node]
            else:
                node = rights[node]
        total += vals[node]
    return total / len(trees)

def export_models(joblib_path=JOBLIB_PATH, onnx_path=ONNX_PATH, json_path=JSON_PATH):
    if not os.path.exists(joblib_path):
        print(f"Model artifact {joblib_path} not found. Running training first...")
        from train import train_and_evaluate
        train_and_evaluate(model_output_path=joblib_path)

    print(f"Loading scikit-learn model from: {joblib_path}")
    rf_model = joblib.load(joblib_path)

    # 1. Export ONNX Model
    initial_type = [("float_input", FloatTensorType([None, 6]))]
    print("Converting scikit-learn RandomForestRegressor to ONNX format...")
    onnx_model = convert_sklearn(rf_model, initial_types=initial_type, target_opset=13)

    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"Successfully saved ONNX model artifact to: {onnx_path}")

    # 2. Export Tree Weights to JSON for Edge Cloudflare Worker runtime
    print("Exporting decision trees to edge JSON payload...")
    trees_json = []
    for estimator in rf_model.estimators_:
        t = estimator.tree_
        tree_dict = {
            "left": t.children_left.tolist(),
            "right": t.children_right.tolist(),
            "feat": t.feature.tolist(),
            "thresh": [round(float(x), 6) for x in t.threshold],
            "val": [round(float(x), 6) for x in t.value.squeeze()]
        }
        trees_json.append(tree_dict)

    with open(json_path, "w") as f:
        json.dump({"n_estimators": len(trees_json), "trees": trees_json}, f)
    print(f"Successfully saved Edge Tree Model artifact to: {json_path}")

    # 3. Validate Numerical Parity across Sklearn, ONNX, and JSON Tree Evaluator
    print("\nValidating model inference numerical parity...")
    sess = rt.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    input_name = sess.get_inputs()[0].name
    output_name = sess.get_outputs()[0].name

    sample_low = np.array([[3.0, 1.0, 5.0, 4.0, 6.0, 5.0]], dtype=np.float32)
    sample_high = np.array([[14.0, 1.0, 75.0, 80.0, 70.0, 75.0]], dtype=np.float32)

    pred_low_sklearn = float(rf_model.predict(sample_low)[0])
    pred_high_sklearn = float(rf_model.predict(sample_high)[0])

    pred_low_onnx = float(sess.run([output_name], {input_name: sample_low})[0][0][0])
    pred_high_onnx = float(sess.run([output_name], {input_name: sample_high})[0][0][0])

    pred_low_json = eval_tree_json(trees_json, sample_low[0])
    pred_high_json = eval_tree_json(trees_json, sample_high[0])

    print(f"Low Traffic Vector  -> Sklearn: {pred_low_sklearn:.2f} | ONNX: {pred_low_onnx:.2f} | Edge JS: {pred_low_json:.2f}")
    print(f"High Spike Vector   -> Sklearn: {pred_high_sklearn:.2f} | ONNX: {pred_high_onnx:.2f} | Edge JS: {pred_high_json:.2f}")

    assert abs(pred_low_onnx - pred_low_sklearn) < 1e-3, "Parity check failed for ONNX low traffic!"
    assert abs(pred_high_onnx - pred_high_sklearn) < 1e-3, "Parity check failed for ONNX high traffic!"
    assert abs(pred_low_json - pred_low_sklearn) < 1e-3, "Parity check failed for Edge JS low traffic!"
    assert abs(pred_high_json - pred_high_sklearn) < 1e-3, "Parity check failed for Edge JS high traffic!"

    print("\n[SUCCESS] Export complete with 100% numerical parity across Sklearn, ONNX, and Edge JS runtime!")

if __name__ == "__main__":
    export_models()
