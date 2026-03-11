import supabase from "../services/supabaseClient.js";

// register
export const register = async (req, res) => {
    const { name, email, password } = req.body;

    // create auth user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // create profile in public.users table
    const { error: insertError } = await supabase
        .from("users")
        .insert([
            {
                id: data.user.id,
                name: name,
                email: email
            }
        ]);

    if (insertError) {
        return res.status(500).json({ error: insertError.message });
    }

    res.json({
        message: "User registered",
        user_id: data.user.id
    });
};

// login
export const login = async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    res.json({
        message: "Login successful",
        session: data.session
    });
};