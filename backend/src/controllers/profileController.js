import supabase from "../services/supabaseClient.js";
import profileModel from "../models/profileModel.js";

// TRANG PROFILE
export const getProfile = async (req, res) => {
    const userId = req.user.id;

    const { data, error } = await profileModel.getUserProfile(
        req.supabase,
        userId
    );

    console.log("getProfile:", userId, data, error);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json({ profile: data });
};