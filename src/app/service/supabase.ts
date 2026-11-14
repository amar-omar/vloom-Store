import {createClient} from '@supabase/supabase-js'
const supabaseUrl = 'https://vumcsrhmxrumhrhldlck.supabase.co';
const supabaseKey = 'sb_publishable_EjshRg-l9B2MuX_nIY1QTw_vuW4lDc5';
export const supabase = createClient(supabaseUrl, supabaseKey);