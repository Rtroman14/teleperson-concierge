"use server";

import { createClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import _ from "@/lib/Helpers";

export const deleteRecords = async (table, ids) => {
    const supabase = await createClient();

    try {
        const { error } = await supabase.from(table).delete().in("id", ids);
        if (error) throw new Error(error.message);

        if (table === "conversations") {
            revalidatePath("/conversations", "page");
        }

        return { success: true, data: ids };
    } catch (error) {
        console.error(error);

        return {
            success: false,
            data: [],
            message: error.message,
        };
    }
};

export const updateRecords = async ({ table, records }) => {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase.from(table).upsert(records).select();

        if (error) throw new Error(error.message);

        return { success: true, data };
    } catch (error) {
        console.error(error);

        return {
            success: false,
            data: null,
            message: error.message,
        };
    }
};

export const conversationsByStatus = async ({ chatbotID, status, page, pageSize }) => {
    try {
        const { start, end } = _.pageIndexRange(Number(page), Number(pageSize));

        let queryArray = [false];
        if (status === "Unread") {
            queryArray = [false];
        }
        if (status === "Read") {
            queryArray = [true];
        }
        if (status === "All") {
            queryArray = [true, false];
        }

        const supabase = await createClient();

        const { data, count, error } = await supabase
            .from("conversations")
            .select(
                "id, created_at, closed, messages (content, role, created_at), contact_id(first_name, last_name, email)",
                {
                    count: "exact",
                }
            )
            .eq("chatbot_id", chatbotID)
            .in("closed", queryArray)
            .eq("is_archived", false)
            .order("created_at", { ascending: false })
            .range(start, end);

        if (error) throw new Error(error.message);

        return {
            success: true,
            data,
            count,
        };
    } catch (error) {
        console.error(error);

        return {
            success: false,
            message: error.message,
        };
    }
};
