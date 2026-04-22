""" Chạy bằng cách gọi hàm fanmachinelearning(nhiệt độ, độ ẩm) để nhận tốc độ quạt dự đoán.
Các hàm khác được giữ để dễ dàng kiểm tra và so sánh với mô hình scikit-learn.
Thay đường dẫn DEFAULT_CSV_PATH đến file CSV của bạn trước khi chạy."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

DEFAULT_CSV_PATH = Path("YOURCSVFILE.csv")  # Cập nhật đường dẫn đến file CSV của bạn
FEATURE_COLUMNS = ["temperature", "humidity"]
TARGET_COLUMN = "fan_speed"


def load_and_clean_data(csv_path: str | Path) -> Tuple[pd.DataFrame, int, int, int]:
    """Load fan data and apply light cleaning."""
    raw = pd.read_csv(csv_path)
    raw_rows = len(raw)

    data = raw.copy()
    data.columns = [column.strip() for column in data.columns]

    if "datetime" in data.columns:
        data["datetime"] = pd.to_datetime(data["datetime"], errors="coerce")

    for column in ["temperature", "humidity", "fan_speed"]:
        if column in data.columns:
            data[column] = pd.to_numeric(data[column], errors="coerce")

    required_columns = [column for column in ["temperature", "humidity", "fan_speed"] if column in data.columns]
    data = data.dropna(subset=required_columns)

    if "temperature" in data.columns:
        data = data[(data["temperature"] >= 0) & (data["temperature"] <= 60)]
    if "humidity" in data.columns:
        data = data[(data["humidity"] >= 0) & (data["humidity"] <= 100)]
    if "fan_speed" in data.columns:
        data = data[(data["fan_speed"] >= 0) & (data["fan_speed"] <= 5)]

    data = data.drop_duplicates()
    if "datetime" in data.columns:
        data = data.sort_values("datetime")

    cleaned_rows = len(data)
    dropped_rows = raw_rows - cleaned_rows
    return data, raw_rows, cleaned_rows, dropped_rows


def train_linear_regression(
    features: pd.DataFrame | np.ndarray,
    target: pd.Series | np.ndarray,
    lr: float = 0.01,
    epochs: int = 1200,
) -> Tuple[np.ndarray, float, np.ndarray, np.ndarray]:
    """Train y = Xw + b using scaled gradient descent."""
    x_matrix = np.asarray(features, dtype=float)
    y_vector = np.asarray(target, dtype=float).reshape(-1)

    feature_mean = x_matrix.mean(axis=0)
    feature_std = x_matrix.std(axis=0)
    feature_std[feature_std == 0] = 1.0
    x_scaled = (x_matrix - feature_mean) / feature_std

    n_samples, n_features = x_scaled.shape
    weights = np.zeros(n_features)
    bias = 0.0

    for _ in range(epochs):
        y_predict = np.dot(x_scaled, weights) + bias
        error = y_predict - y_vector
        dw = (2.0 / n_samples) * np.dot(x_scaled.T, error)
        db = (2.0 / n_samples) * np.sum(error)
        weights -= lr * dw
        bias -= lr * db

    return weights, bias, feature_mean, feature_std


def predict_from_scratch(
    features: list[float] | np.ndarray,
    weights: np.ndarray,
    bias: float,
    feature_mean: np.ndarray,
    feature_std: np.ndarray,
) -> float:
    """Predict with the trained scratch model."""
    feature_vector = np.asarray(features, dtype=float)
    scaled = (feature_vector - feature_mean) / feature_std
    return float(np.dot(weights, scaled) + bias)


def predict_fan_speed(model: LinearRegression, temperature: float, humidity: float) -> float:
    """Predict fan speed from a fitted scikit-learn model."""
    input_frame = pd.DataFrame([[temperature, humidity]], columns=FEATURE_COLUMNS)
    return float(model.predict(input_frame)[0])


def fit_sklearn_model(csv_path: str | Path = DEFAULT_CSV_PATH) -> LinearRegression:
    """Train and return a scikit-learn model using cleaned dataset."""
    data, _, _, _ = load_and_clean_data(csv_path)
    X = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]
    model = LinearRegression()
    model.fit(X, y)
    return model


def predict_speed_from_values(
    temperature: float,
    humidity: float,
    csv_path: str | Path = DEFAULT_CSV_PATH,
) -> int:
    """Train scikit-learn model and return rounded/clipped speed for given input."""
    model = fit_sklearn_model(csv_path)
    raw_prediction = predict_fan_speed(model, temperature, humidity)
    return int(np.clip(round(raw_prediction), 0, 5))





def train_and_evaluate(
    csv_path: str | Path = DEFAULT_CSV_PATH,
    test_size: float = 0.2,
    random_state: int = 42,
    new_temperature: float = 40.0,
    new_humidity: float = 40.0,
) -> Dict[str, Any]:
    """Train both models and return metrics/results for reuse."""
    data, raw_rows, cleaned_rows, dropped_rows = load_and_clean_data(csv_path)

    X = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
    )

    sklearn_model = LinearRegression()
    sklearn_model.fit(X_train, y_train)

    sklearn_weights = sklearn_model.coef_
    sklearn_bias = float(sklearn_model.intercept_)

    scratch_weights, scratch_bias, feature_mean, feature_std = train_linear_regression(
        X_train.values,
        y_train.values,
    )

    sklearn_train_pred = sklearn_model.predict(X_train)
    sklearn_test_pred = sklearn_model.predict(X_test)

    scratch_train_pred = np.array(
        [
            predict_from_scratch(row, scratch_weights, scratch_bias, feature_mean, feature_std)
            for row in X_train.values
        ]
    )
    scratch_test_pred = np.array(
        [
            predict_from_scratch(row, scratch_weights, scratch_bias, feature_mean, feature_std)
            for row in X_test.values
        ]
    )

    sklearn_train_mae = mean_absolute_error(y_train, sklearn_train_pred)
    sklearn_train_rmse = float(np.sqrt(mean_squared_error(y_train, sklearn_train_pred)))
    sklearn_test_mae = mean_absolute_error(y_test, sklearn_test_pred)
    sklearn_test_rmse = float(np.sqrt(mean_squared_error(y_test, sklearn_test_pred)))

    scratch_train_mae = mean_absolute_error(y_train, scratch_train_pred)
    scratch_train_rmse = float(np.sqrt(mean_squared_error(y_train, scratch_train_pred)))
    scratch_test_mae = mean_absolute_error(y_test, scratch_test_pred)
    scratch_test_rmse = float(np.sqrt(mean_squared_error(y_test, scratch_test_pred)))

    sklearn_raw_prediction = predict_fan_speed(sklearn_model, new_temperature, new_humidity)
    scratch_raw_prediction = predict_from_scratch(
        [new_temperature, new_humidity],
        scratch_weights,
        scratch_bias,
        feature_mean,
        feature_std,
    )

    return {
        "csv_path": str(csv_path),
        "raw_rows": raw_rows,
        "cleaned_rows": cleaned_rows,
        "dropped_rows": dropped_rows,
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "sklearn_model": sklearn_model,
        "scratch_weights": scratch_weights,
        "scratch_bias": scratch_bias,
        "feature_mean": feature_mean,
        "feature_std": feature_std,
        "sklearn_weights": sklearn_weights,
        "sklearn_bias": sklearn_bias,
        "sklearn_train_mae": sklearn_train_mae,
        "sklearn_train_rmse": sklearn_train_rmse,
        "sklearn_test_mae": sklearn_test_mae,
        "sklearn_test_rmse": sklearn_test_rmse,
        "scratch_train_mae": scratch_train_mae,
        "scratch_train_rmse": scratch_train_rmse,
        "scratch_test_mae": scratch_test_mae,
        "scratch_test_rmse": scratch_test_rmse,
        "new_temperature": new_temperature,
        "new_humidity": new_humidity,
        "sklearn_raw_prediction": sklearn_raw_prediction,
        "scratch_raw_prediction": scratch_raw_prediction,
        "sklearn_final_speed": int(np.clip(round(sklearn_raw_prediction), 0, 5)),
        "scratch_final_speed": int(np.clip(round(scratch_raw_prediction), 0, 5)),
    }


def format_report(results: Dict[str, Any]) -> str:
    """Format a human-readable summary."""
    lines = ["=== Model Comparison ==="]
    lines.append(f"Source file: {results['csv_path']}")
    lines.append(f"Rows before cleaning: {results['raw_rows']}")
    lines.append(f"Rows after cleaning: {results['cleaned_rows']}")
    lines.append(f"Rows dropped during cleaning: {results['dropped_rows']}")
    lines.append("Model columns: temperature, humidity -> fan_speed")
    lines.append("Weights and bias:")
    lines.append(
        f"scikit-learn -> temperature: {results['sklearn_weights'][0]:.6f}, humidity: {results['sklearn_weights'][1]:.6f}, bias: {results['sklearn_bias']:.6f}"
    )
    lines.append(
        f"from-scratch -> temperature: {results['scratch_weights'][0]:.6f}, humidity: {results['scratch_weights'][1]:.6f}, bias: {results['scratch_bias']:.6f}"
    )
    lines.append("Validation metrics (train/test):")
    lines.append(
        f"scikit-learn -> train MAE: {results['sklearn_train_mae']:.6f}, train RMSE: {results['sklearn_train_rmse']:.6f}"
    )
    lines.append(
        f"scikit-learn -> test  MAE: {results['sklearn_test_mae']:.6f}, test  RMSE: {results['sklearn_test_rmse']:.6f}"
    )
    lines.append(
        f"from-scratch -> train MAE: {results['scratch_train_mae']:.6f}, train RMSE: {results['scratch_train_rmse']:.6f}"
    )
    lines.append(
        f"from-scratch -> test  MAE: {results['scratch_test_mae']:.6f}, test  RMSE: {results['scratch_test_rmse']:.6f}"
    )
    lines.append(
        f"Input: temperature={results['new_temperature']:.2f}, humidity={results['new_humidity']:.2f}"
    )
    lines.append(f"scikit-learn raw prediction: {results['sklearn_raw_prediction']:.6f}")
    lines.append(f"from-scratch raw prediction: {results['scratch_raw_prediction']:.6f}")
    lines.append(
        f"Difference (absolute): {abs(results['sklearn_raw_prediction'] - results['scratch_raw_prediction']):.6f}"
    )
    lines.append(f"scikit-learn final speed: {results['sklearn_final_speed']}")
    lines.append(f"from-scratch final speed: {results['scratch_final_speed']}")
    return "\n".join(lines)


def main() -> Dict[str, Any]:
    """Run the training/evaluation pipeline and print a report."""
    results = fanmchinelearning(
        temperature=20.0,
        humidity=40.0,
    )
    print(results)
    return results

def fanmchinelearning(
    temperature: float,
    humidity: float,
    csv_path: str | Path = DEFAULT_CSV_PATH,
) -> int:
    """Return fan speed from temperature and humidity input.

    This name is kept for easy direct calls like fanmchinelearning(30, 70).
    """
    return predict_speed_from_values(temperature, humidity, csv_path=csv_path)

if __name__ == "__main__":
    main()
