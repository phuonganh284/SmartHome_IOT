from fastapi import FastAPI
import joblib
import numpy as np

app = FastAPI()

# Load models
fan_model = joblib.load("fan_model.pkl")
light_intensity_model = joblib.load("light_intensity_model.pkl")
light_on_model = joblib.load("light_on_model.pkl")

# ---------------- FAN ----------------
@app.get("/predict/fan")
def predict_fan(temp: float, hum: float):
    input_data = np.array([[temp, hum]])
    pred = fan_model.predict(input_data)[0]

    pred = int(np.clip(round(pred), 0, 5))

    return {"fan_speed": pred}


# ---------------- LIGHT ----------------
@app.get("/predict/light")
def predict_light(lux: float, prev_on: int, prev_intensity: float, hour: int, day: int):
    # build full feature vector
    full = np.array([[lux, prev_on, prev_intensity, hour, day]])
    def adapt_and_predict(model, X):
        try:
            n_req = getattr(model, "n_features_in_")
        except Exception:
            n_req = X.shape[1]
        if n_req != X.shape[1]:
            X2 = X[:, :n_req]
        else:
            X2 = X
        return model.predict(X2)

    power_pred = adapt_and_predict(light_on_model, full)
    power = int(power_pred[0])

    if power == 1:
        intensity_pred = adapt_and_predict(light_intensity_model, full)
        intensity = float(np.clip(intensity_pred[0], 0, 100))
    else:
        intensity = 0

    return {
        "power": int(power),
        "intensity": int(round(intensity))
    }