import deviceModel from "../models/deviceModel.js";

export const getUserDevices = async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({ error: "User id not found on request" });
    }

    const { data, error } = await deviceModel.getDevicesByUser(userId);

    if (error) {
        return res.status(500).json({ error: error.message || "Failed to fetch devices" });
    }

    res.json({ devices: data || [] });
};

export default {
    getUserDevices,
};
