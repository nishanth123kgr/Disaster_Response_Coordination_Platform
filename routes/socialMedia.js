import { Router } from "express";
import { getSupabaseClient } from "../utils/db.js";
import { filterAndReformatPosts, getSocialMediaQuery } from "../utils/gemini.js";
import { getCacheData, setCacheData } from "../utils/cache.js";

const router = Router();

async function createBlueSkySession() {
    let blueSkyUserName = process.env.BLUE_SKY_APP_USERNAME;
    let blueSkyPassword = process.env.BLUE_SKY_APP_PASSWORD;
    if (!blueSkyUserName || !blueSkyPassword) {
        throw new Error("BlueSky username and password must be set in environment variables");
    }

    const response = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            identifier: `${blueSkyUserName}.bsky.social`,
            password: blueSkyPassword
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return data; // includes accessJwt, did, handle
};

async function getPostsFromBlueSky(query) {
    const session = await createBlueSkySession();

    let url = `https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=${query.replaceAll(' ', '+')}&limit=20`;

    console.log(url);


    let posts = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${session.accessJwt}`,
            "Content-Type": "application/json"
        }
    });
    if (!posts.ok) {
        const errorText = await posts.text();
        throw new Error(`Failed to fetch posts: ${posts.status} ${errorText}`);
    }
    const postsData = await posts.json();

    return postsData.posts || [];
}

router.get("/:id/social-media", async (req, res) => {
    const { id } = req.params;

    try {

        const supabase = getSupabaseClient();

        const key = `disaster:${id}:social-media`;

        let cacheData = await getCacheData(key);
        if (cacheData) {
            return res.json(cacheData);
        }




        const { data, error } = await supabase
            .from("disasters")
            .select("*")
            .eq("id", id);

        if (error) {
            console.error("Error fetching disaster data:", error);
            return res.status(500).json({ error: "Failed to fetch disaster data" });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Disaster Not Found" });
        }

        let query = await getSocialMediaQuery(data[0].title, data[0].description, data[0].location_name, data[0].tags);


        let rawPosts = await getPostsFromBlueSky(query);


        if (!rawPosts || rawPosts.length === 0) {
            return res.status(404).json({ error: "No social media posts found" });
        }

        const filteredPosts = await filterAndReformatPosts(
            data[0].title,
            data[0].description,
            data[0].location_name,
            data[0].tags,
            rawPosts
        );
        if (!filteredPosts || filteredPosts.length === 0) {
            return res.status(404).json({ error: "No relevant social media posts found" });
        }

        res.json(filteredPosts);

        setCacheData(key, filteredPosts);
    } catch (err) {
        console.error("Unexpected error:", err);
        res.status(500).json({ error: "An unexpected error occurred" });
    }
}
);

export default router;