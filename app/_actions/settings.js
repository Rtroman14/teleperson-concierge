"use server";

// import { createClient } from "@/app/lib/supabase/server";
import { createClient } from "@/lib/supabase/admin";
import { modelSelection } from "@/lib/globalVariables";

import { modelSettingsFormSchema } from "@/lib/formSchemas";

export async function updateModelSettings({ id, columnValues }) {
    const validatedFields = modelSettingsFormSchema.safeParse(columnValues);

    if (!validatedFields.success) {
        console.log(`validatedFields.error -->`, validatedFields.error);
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: "There was an error parsing the provided values.",
        };
    }

    try {
        const premiumModelAccess = true;

        let model = "gpt-4o";

        if (premiumModelAccess) {
            model = columnValues.model;
        } else {
            const selectedModel = modelSelection.find((m) => m.model === columnValues.model);
            model = selectedModel?.premium ? "gpt-4o" : columnValues.model;
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("chatbots")
            .update({
                ...columnValues,
                model,
            })
            .eq("id", id);

        if (error) throw new Error(error.message);

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error(error);

        return {
            success: false,
            message: error.message,
        };
    }
}
