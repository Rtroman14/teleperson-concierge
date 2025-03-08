import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PRIVATE_KEY);

class Supabase {
    constructor(supabaseUrl, supabasePrivateKey) {
        if (!supabaseUrl || !supabasePrivateKey) {
            throw new Error("Using Supabase requires an API key.");
        }

        this.client = createClient(supabaseUrl, supabasePrivateKey);
    }

    insert = async (rows) => {
        try {
        } catch (error) {
            console.error("insert() -->", error.message);
        }
    };
}

export default new Supabase(process.env.SUPABASE_URL, process.env.SUPABASE_PRIVATE_KEY);
