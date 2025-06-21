import { Router } from 'express';

import { getSupabaseClient } from '../utils/db.js';
import { extractLocation } from '../utils/gemini.js';


const router = Router();

router.get('/', async (req, res) => {
    try {
        let { tags, tagsMatchMode, page, perPage } = req.query;

        page = parseInt(page, 10) || 1;
        perPage = parseInt(perPage, 10) || 10;

        const from = (page - 1) * perPage;
        const to = from + perPage || 10;

        const supabase = getSupabaseClient();

        let query = supabase
            .from('disasters')
            .select('*')

        if (tags) {
            let selectedTags = tags.split(',').map(tag => tag.trim());

            console.log(selectedTags);

            tagMatchMode = tagsMatchMode || 'any'; // Default to 'any' if not specified
            if (tagsMatchMode === 'any') {
                query = query.or(
                    selectedTags.map(tag => `tags.cs.{${tag}}`).join(',')
                );
            } else if (tagMatchMode === 'all') {
                query = query.contains('tags', selectedTags);
            }
        }

        query = query.range(from, to)
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching disasters:', error);
            return res.status(500).json({ error: 'Failed to fetch disasters' });
        }

        const hasMorePages = data.length > perPage;

        const totalCount = hasMorePages ? data.length - 1 : data.length;


        res.json({
            disasters: data.slice(0, perPage),
            page_info: {
                current_page: page,
                per_page: perPage,
                has_more_pages: hasMorePages,
                total_count: totalCount
            }
        });


    } catch (error) {
        console.log('Error in /api/disasters:', error);

        // Print the error stack for debugging
        console.error(error.stack);

        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, description, tags, location_name, user_id } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        let selectedTags = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : null;

        let location = await extractLocation(title, description, location_name);

        const supabase = getSupabaseClient();

        const audit_trail = [{
            action: 'create',
            user_id: user_id || null,
            timestamp: new Date().toISOString()
        }]

        const { data, error } = await supabase
            .from('disasters')
            .insert([
                {
                    title,
                    description,
                    tags: selectedTags,
                    location: location.geocode,
                    location_name: location.name,
                    owner_id: user_id || null,
                    audit_trail: audit_trail 
                }
            ])
            .select('*');

        if (error) {
            console.error('Error inserting disaster:', error);
            return res.status(500).json({ error: 'Failed to create disaster' });
        }

        res.status(201).json(data[0]);
    } catch (error) {   
        console.error('Error in /api/disasters POST:', error);
        console.log('Error stack:', error.stack);
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, tags, location_name, user_id } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        let selectedTags = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : null;

        let location = await extractLocation(title, description, location_name);

        const supabase = getSupabaseClient();

        const { data: existingDisaster, error: fetchError } = await supabase
            .from('disasters')
            .select('audit_trail')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Error fetching existing disaster:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch disaster' });
        }

        if (!existingDisaster) {
            return res.status(404).json({ error: 'Disaster not found' });
        }

        const audit_trail = [
            ...(existingDisaster.audit_trail || []),
            {
            action: 'update',
            user_id: user_id || null,
            timestamp: new Date().toISOString()
            }
        ];

        const { data, error } = await supabase
            .from('disasters')
            .update({
                title,
                description,
                tags: selectedTags,
                location: location.geocode,
                location_name: location.name,
                audit_trail: audit_trail
            })
            .eq('id', id)
            .select('*');

        if (error) {
            console.error('Error updating disaster:', error);
            return res.status(500).json({ error: 'Failed to update disaster' });
        }

        res.json(data[0]);
    } catch (error) {
        console.error('Error in /api/disasters/:id PUT:', error);
        console.log('Error stack:', error.stack);
        
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('disasters')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting disaster:', error);
            return res.status(500).json({ error: 'Failed to delete disaster' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error in /api/disasters/:id DELETE:', error);
        console.log('Error stack:', error.stack);
        
        res.status(500).json({ error: 'Internal server error' });
    }
});



export default router;