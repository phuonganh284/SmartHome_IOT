const express = require("express");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

app.get("/", (req, res) => {
    res.send("Backend running");
});

app.get("/sensors", async (req, res) => {
    const { data, error } = await supabase
        .from("sensor_data")
        .select("*");

    res.json(data);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});