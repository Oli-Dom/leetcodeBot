import express from 'express'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pkiyiyaghojnchrbvfzo.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraXlpeWFnaG9qbmNocmJ2ZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0OTIzNjUsImV4cCI6MjA0NjA2ODM2NX0.KeJBgYPVsCx0AfmDaVyf96qHAYFNZa5Rt4HPu2yWdxc"
const supabase = createClient(supabaseUrl, supabaseKey)
const app = express()
const port = 3000




app.get('/', (req, res) => {
    // Send a proper JSON response
    res.json({
        message: "welcome to my server"
    });
});

app.get('/questions', async (req, res) => {
    // Send a proper JSON response
    const { data, error } = await supabase
    .from('allQuestions')
    .select()
    .eq('is_premium', false)
    
    res.json({data})
});

app.get('/questions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('allQuestions')
            .select('*')
            .in('tag', ['solved', 'under_review', 'not_solved'])
            .limit(3);

        if (error) throw error;

        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/questions/:id/update-tag', async (req, res) => {
    const { id } = req.params;
    const { tag } = req.body;

    try {
        const { data, error } = await supabase
            .from('allQuestions')
            .update({ tag })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})