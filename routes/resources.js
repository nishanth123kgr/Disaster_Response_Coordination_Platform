import { Router } from "express";
import { getSupabaseClient } from "../utils/db.js";
import { filterAndReformatPosts, getSocialMediaQuery } from "../utils/gemini.js";
import { setCacheData } from "../utils/cache.js";

const router = Router();


router.get("/:id/resources", async (req, res) => {
    const { id } = req.params;
    const { lat, lon } = req.query; 

    try {

        const supabase = getSupabaseClient();

        const key = `disaster:${id}:resources`;

        

        let cacheData = await getCacheData(key);
        if (cacheData) {
            return res.json(cacheData);
        }

        const radius = 10000; // Default radius in meters

        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .eq('disaster_id', disasterId)
            .filter(
                'location',
                'st_dwithin',
                `SRID=4326;POINT(${lon} ${lat}),${radius}`
            );

        if (error) {
            console.error("Error fetching resources:", error);
            return res.status(500).json({ error: "Failed to fetch resources" });
        }
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No resources found for this disaster" });
        }

        setCacheData(key, data);
        res.json(data);

    } catch (err) {
        console.error("Unexpected error:", err);
        res.status(500).json({ error: "An unexpected error occurred" });
    }
}
);

export default router;