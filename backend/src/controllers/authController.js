import supabase from "../services/supabaseClient.js";

// register
export const register = async (req, res) => {
    const { name, email, password } = req.body;

    const confirmRedirect = "frontend://auth/callback";

    // create auth user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name: name },
            emailRedirectTo: confirmRedirect
        }
    });

    if (error) {
        return res.status(400).json({ error: error.message });
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

// request password reset (sends email with redirect to app deep link)
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'email required' });

        const resetRedirect = process.env.FRONTEND_RESET_URL || "frontend://reset-password";

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetRedirect
        });

        if (error) return res.status(400).json({ error: error.message });

        return res.json({ message: 'Password reset requested' });
    } catch (err) {
        return res.status(500).json({ error: err.message || err });
    }
};

// reset password using token received from email (deep link)
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'token and password required' });

        const SUPABASE_URL = process.env.SUPABASE_URL;
        if (!SUPABASE_URL) return res.status(500).json({ error: 'SUPABASE_URL not configured' });

        const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`;

        let fetchFn = globalThis.fetch;
        if (!fetchFn) {
            const { default: fetchImport } = await import('node-fetch');
            fetchFn = fetchImport;
        }

        const resp = await fetchFn(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return res.status(resp.status).json({ error: text || 'failed to reset password' });
        }

        return res.json({ message: 'Password updated' });
    } catch (err) {
        return res.status(500).json({ error: err.message || err });
    }
};


