import { getSupabaseClient } from './db.js';


export async function getCacheData(key) {
    if (!key) {
        throw new Error('Cache key is required');
    }
    // Import the Supabase client
    let supabase = getSupabaseClient();
    const { data: cacheData, error: cacheError } = await supabase
        .from('cache')
        .select('*')
        .eq('key', key)
        .single();
    if (cacheError) {
        console.error('Error fetching cache data:', cacheError);
        throw new Error('Failed to fetch cache data');
    }

    if (cacheData) {
        if (cacheData.expires_at && new Date(cacheData.expires_at) < new Date()) {
            console.log('Cache expired for key:', key);
            // Cache expired, remove it
            clearCacheData(key).catch(err => {
                console.error('Error clearing expired cache:', err);
            });
        } else {
            return JSON.parse(cacheData.value);
        }
    }

    return null; // No cache found or cache expired

}

export async function setCacheData(key, value, expiresInMinutes = 60) {
    if (!key || !value) {
        throw new Error('Cache key and value are required');
    }

    // Import the Supabase client
    let supabase = getSupabaseClient();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('cache')
        .upsert({
            key,
            value: JSON.stringify(value),
            expires_at: expiresAt
        }, { onConflict: ['key'] });

    if (error) {
        console.error('Error setting cache data:', error);
        throw new Error('Failed to set cache data');
    }

    return data;
}
export async function clearCacheData(key) {
    if (!key) {
        throw new Error('Cache key is required');
    }

    // Import the Supabase client
    let supabase = getSupabaseClient();
    const { error } = await supabase
        .from('cache')
        .delete()
        .eq('key', key);

    if (error) {
        console.error('Error clearing cache data:', error);
        throw new Error('Failed to clear cache data');
    }

    return true; // Cache cleared successfully
}

