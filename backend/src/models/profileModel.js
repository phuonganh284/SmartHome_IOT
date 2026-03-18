import supabase from "../services/supabaseClient.js";

export const getUserProfile = async (supabase, userId) => {
    const { data, error } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .single();

    return { data, error };
};

export default {
    getUserProfile
};
