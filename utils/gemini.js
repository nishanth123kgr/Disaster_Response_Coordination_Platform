import {
    GoogleGenAI,
    Type,
} from '@google/genai';
import { getSupabaseClient } from '../utils/db.js';
import { getCacheData, setCacheData } from './cache.js';


async function callGeminiAPI(prompt, responseScheme = null, model = 'gemini-2.5-flash-lite-preview-06-17') {
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
        thinkingConfig: {
            thinkingBudget: 0,
        },
        responseMimeType: 'application/json',
    };

    if (responseScheme) {
        config.responseSchema = responseScheme;
    }

    const contents = [
        {
            role: 'user',
            parts: [
                {
                    text: prompt,
                },
            ],
        },
    ];

    const response = await ai.models.generateContent({
        model,
        config,
        contents,
    });

    if (response.error) {
        console.error('Error calling Gemini API:', response.error);
        throw new Error('Failed to call Gemini API');
    }

    return response.text;
}



async function extractLocation(title, description, location) {

    let responseSchema = {
        type: Type.OBJECT,
        required: ["geocode", "name"],
        properties:
        {
            geocode: {
                type: Type.STRING,
                description: "Geographic point in SRID 4326 WKT format, e.g., 'SRID=4326;POINT(77.5946 12.9716)'",
            },
            name: {
                type: Type.STRING,
                description: "Full readable location name, e.g., 'Bangalore, India'",
            },
            key: {
                type: Type.STRING,
                description: "A unique identifier for the location, e.g., 'geocode-bangalore-india'",
            },
            lat: {
                type: Type.NUMBER,
                description: "Latitude of the location, e.g., 12.9716",
            },
            lon: {
                type: Type.NUMBER,
                description: "Longitude of the location, e.g., 77.5946",
            }
        }
    }


    const model = 'gemini-2.5-flash-lite-preview-06-17';

    const prompt = `Extract location information from the following text. I need you to identify:

                            1. Specific addresses (street addresses, building numbers)
                            2. Landmarks (parks, buildings, monuments, schools, hospitals)
                            3. Neighborhoods or districts
                            4. Cities, towns, or municipalities
                            5. Geographic features (rivers, mountains, bridges)
                            6. Intersections (street intersections, highway junctions)
                            7. Postal codes or zip codes

                            Text to analyze: "${title}"
                            ${description ? `Additional context: "${description}"` : ''}
                            ${location ? `Current location: "${location}"` : ''}
                            
                            Provide the location in the following format:
                            {
                                "geocode": "SRID=4326;POINT(longitude latitude)",
                                "name": "Full readable location name",
                                "key": "unique-location-key",
                                "lat": latitude,
                                "lon": longitude
                            }`;


    let response = await callGeminiAPI(prompt, responseSchema, model);
    if (!response || response.error) {
        console.error('Error extracting location:', response.error);
        throw new Error('Failed to extract location');
    }
    if (typeof response === 'string') {
        try {
            response = JSON.parse(response);
        } catch (e) {
            console.error('Failed to parse response:', e);
            throw new Error('Invalid response format');
        }
    }



    return response;
}

async function getSocialMediaQuery(title, description, locationName, tags) {

    let cacheKey = `social-media-query:${title}:${description}:${locationName}:${tags ? tags.join(',') : ''}`;

    cacheKey = cacheKey.replace(/[^a-zA-Z0-9_]/g, '-'); // Sanitize key

    let cacheData = await getCacheData(cacheKey);
    if (cacheData) {
        console.log('Cache hit for social media query:', cacheKey);
        return cacheData.query;
    }

    let responseSchema = {
        type: Type.OBJECT,
        required: ["query"],
        properties:
        {
            query: {
                type: Type.STRING,
                description: "A search query string that can be used to find relevant social media posts. It should include the title, description, location name, and tags if available.",
            }
        }
    }

    const prompt = `You are a search query expert. Given a disaster's title, description, location name, and tags, generate one concise, realistic search query that mimics how people would talk about the event on social media.

                    Focus on:

                    Natural phrasing (not formal)

                    Key visible effects (e.g., flooding, damage, traffic jam, no power)

                    Location (city or local area)

                    Disaster type (e.g., flood, fire, earthquake)

                    Avoid uncommon words or too many keywords. Keep the query short and broad enough to match real user posts.

                    Keep It very short like in 2-3 words.

                    Don't exceed 3 words unless it necessary.
                    Input:

                    Title: "${title}"

                    Description: "${description}"

                    Location: "${locationName}"

                    Tags: "${tags ? tags.join(', ') : ''}"`

    const model = 'gemini-2.5-flash-lite-preview-06-17';

    let response = await callGeminiAPI(prompt, responseSchema, model);

    if (!response || response.error) {
        console.error('Error generating social media query:', response.error);
        throw new Error('Failed to generate social media query');
    }
    if (typeof response === 'string') {
        try {
            response = JSON.parse(response);
        } catch (e) {
            console.error('Failed to parse response:', e);
            throw new Error('Invalid response format');
        }
    }

    setCacheData(cacheKey, { query: response.query })



    return response.query;
}

async function filterAndReformatPosts(disasterTitle, disasterDescription, disasterLocationName, disasterTags, rawPosts) {
    if (!rawPosts || rawPosts.length === 0) {
        return [];
    }

    const prompt = `You are a social media post filter and reformatter. Given a disaster's title, description, location name, tags, and a list of raw social media posts, filter and reformat the posts to only include those relevant to the disaster.
                    Disaster Title: "${disasterTitle}"

                    Description: "${disasterDescription}"

                    Location Name: "${disasterLocationName}"

                    Tags: "${disasterTags ? disasterTags.join(', ') : ''}"

                    Raw Posts: ${JSON.stringify(rawPosts)}

                    Return a list of relevant posts with the following format:
                    [
                        {
                            "id": "unique-post-id",
                            "title": "Title of the post",
                            "content": "The content of the post",
                            "author": "Author's username or handle",
                            "timestamp": "ISO 8601 timestamp of the post"
                            "post_url": "URL to the original post"
                        }
                    ]`;


    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            required: ["id", "content", "author", "timestamp", "post_url"],
            properties: {
                id: {
                    type: Type.STRING,
                    description: "Unique identifier for the post"
                },
                title: {
                    type: Type.STRING,
                    description: "Title of the social media post"
                },
                content: {
                    type: Type.STRING,
                    description: "Content of the social media post"
                },
                author: {
                    type: Type.STRING,
                    description: "Author's username or handle"
                },
                timestamp: {
                    type: Type.STRING,
                    description: "ISO 8601 timestamp of when the post was created"
                },
                post_url: {
                    type: Type.STRING,
                    description: "URL to the original post"
                }
            }
        }
    }
    const model = 'gemini-2.5-flash-lite-preview-06-17';
    let response = await callGeminiAPI(prompt, responseSchema, model);

    if (!response || response.error) {
        console.error('Error filtering and reformatting posts:', response.error);
        throw new Error('Failed to filter and reformat posts');
    }
    if (typeof response === 'string') {
        try {
            response = JSON.parse(response);
        } catch (e) {
            console.error('Failed to parse response:', e);
            throw new Error('Invalid response format');
        }
    }
    if (!Array.isArray(response)) {
        console.error('Expected an array of posts, but got:', response);
        throw new Error('Invalid response format: expected an array of posts');
    }
    return response;

}



export {
    extractLocation,
    getSocialMediaQuery,
    filterAndReformatPosts

}