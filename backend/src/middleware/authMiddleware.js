import supabase from "../services/supabaseClient.js";

import { createClient } from "@supabase/supabase-js";

export const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "No token" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: "Invalid token" });
    }

    const user = data.user;

    const supabaseWithAuth = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        }
    );

    req.user = user;
    req.supabase = supabaseWithAuth;

    next();
};

export const authenticateUser = authenticate;
export const verifyUser = authenticate;