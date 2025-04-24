import * as z from "zod";

import { promptMaxCharacters } from "./globalVariables";

export const modelSettingsFormSchema = z.object({
    prompt: z
        .string()
        .max(promptMaxCharacters, {
            message: `Instructions must be less than ${promptMaxCharacters} characters.`,
        })
        .optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
});
