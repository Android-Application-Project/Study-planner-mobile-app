import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zwsjcwwgyqbcrqqcopfb.supabase.co' 
const supabaseKey = 'sb_publishable_YrwSAvef8LfKFckXzk1coQ_W0kUmX6w'
export const supabase = createClient(supabaseUrl, supabaseKey)