import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

model = joblib.load("fan_model.pkl")

print("weights:", model.coef_)
print("bias:", model.intercept_)