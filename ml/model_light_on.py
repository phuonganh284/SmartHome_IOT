import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# 1. load data --------------------------------------------------
df = pd.read_csv("data_light.csv")

# 2. clean data -------------------------------------------------
df = df.drop_duplicates()
df['datetime'] = pd.to_datetime(df['datetime'])
df = df.sort_values(by='datetime')

df = df.set_index('datetime')

df = df.resample('1min').agg({
    'light_lux': 'mean',
    'prev_on': 'last',
    'prev_intensity': 'last',
    'light_on': 'last',
    'light_intensity': 'mean'
})

df = df.dropna()
df = df.reset_index()

# 4. infer datetime ---------------------------------------------
df['hour'] = df['datetime'].dt.hour
df['day_of_week'] = df['datetime'].dt.dayofweek
df = df.drop(columns=['datetime'])

# 5. features + target ------------------------------------------
features = ['light_lux', 'prev_on', 'prev_intensity', 'hour', 'day_of_week']

X = df[features]
y = df['light_on']

# 6. 80% train 20% test -----------------------------------------
split_index = int(len(df) * 0.8)

X_train = X[:split_index]
X_test = X[split_index:]

y_train = y[:split_index]
y_test = y[split_index:]

# 7. train (rand forest regression) -----------------------------
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42
)

model.fit(X_train, y_train)

# 8. evaluate ---------------------------------------------------
y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# 9. export model -----------------------------------------------
joblib.dump(model, "light_on_model.pkl")

print("Model saved as light_on_model.pkl")