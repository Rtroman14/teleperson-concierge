import { pipeline } from "@xenova/transformers";
import slackNotification from "@/lib/slackNotification";
import _ from "@/lib/Helpers";
// import createTask from "@/lib/createTask";

import { modelSelection } from "@/lib/globalVariables";

// Fetch documents to retrieve relevant information
export const findRelevantContent = async ({ supabase, question, vendorName }) => {
    try {
        // Get embeddings for the question
        const pipe = await pipeline("feature-extraction", "Supabase/gte-small");
        const output = await pipe(question, {
            pooling: "mean",
            normalize: true,
        });
        const embedding = Array.from(output.data);

        // Query matching documents
        const { data: documents, error } = await supabase.rpc("match_documents_by_vendor_name", {
            query_embedding: embedding,
            match_threshold: 0.83,
            match_count: 8,
            vendor_name_param: vendorName,
        });

        if (error) throw error;

        if (!documents?.length) {
            return {
                content: "",
                sources: [],
                messageSources: [],
            };
        }

        // Deduplicate sources by URL and sort by similarity
        const uniqueDocuments = documents
            .reduce((acc, doc) => {
                // Skip documents without URLs
                if (!doc.metadata.source) return acc;

                // Check if we already have a document with this URL
                const existingDoc = acc.find((d) => d.metadata.source === doc.metadata.source);

                // If no existing doc or current doc has higher similarity, use current doc
                if (!existingDoc || doc.similarity > existingDoc.similarity) {
                    // Remove existing doc if present
                    const filtered = acc.filter((d) => d.metadata.source !== doc.metadata.source);
                    return [...filtered, doc];
                }

                return acc;
            }, [])
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3); // Limit to top 3 sources

        return {
            content: documents.map((doc) => doc.content).join("\n\n"),
            sources: uniqueDocuments.map((doc) => ({
                url: doc.metadata.source,
                title: doc?.metadata?.title || doc.metadata.source,
            })),
            messageSources: documents
                .map((doc) => ({
                    document_id: doc.id,
                    similarity: Number(doc.similarity.toFixed(2)),
                }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 6),
        };
    } catch (error) {
        console.error("findRelevantContent error:", error);
        return { content: "", sources: [], messageSources: [] };
    }
};

export const fetchChatbotSettings = async (supabase, chatbotID) => {
    const { data: chatbotSettings, error } = await supabase
        .from("chatbots")
        .select(
            `name, model, temperature, prompt,
            team_id(id, messages_sent, num_messages_extra, openai_key, messages_sent_75_percent, messages_sent_100_percent,
                    prod_id(prod_id, name, num_messages, leads_access, premium_model_access, integration_access)),
            tools(name, description, args, active),
            webhooks (id, url, event_type)
            `
        )
        .eq("id", chatbotID)
        .limit(1)
        .single();

    if (error) {
        console.error(error);
        throw new Error("Error fetching chatbot");
    }
    return chatbotSettings;
};

export const selectModel = ({ team, model }) => {
    const numMessagesAllowed = team.num_messages_extra + team.prod_id.num_messages;
    const teamHasKey = _.teamHasKey(team);
    const useTeamsKey = team.messages_sent >= numMessagesAllowed && teamHasKey;

    // Determine API key based on usage and team settings
    const apiKey = useTeamsKey ? team.openai_key : process.env.OPENAI_API_KEY;

    // Determine model based on access and permissions
    const premiumModelAccess = team.prod_id.premium_model_access;
    if (useTeamsKey || premiumModelAccess) {
        return { model, apiKey };
    }

    // Default to gpt-4o unless the selected model is non-premium
    const foundModel = modelSelection.find((m) => m.model === model);
    return {
        model: foundModel && !foundModel.premium ? model : "gpt-4o",
        apiKey,
    };
};

export const incrementMessagesSent = async ({ supabase, team }) => {
    try {
        const timestamp = new Date();
        const createdAt = timestamp.toISOString();

        // Increment messages sent using RPC function
        const { error } = await supabase.rpc("increment_messages_sent", {
            team_id: team.id,
            increment_value: 1,
            created_at: createdAt,
        });

        if (error) {
            // Create retry task if increment fails
            // await createTask({
            //     queue: "chat-tasks",
            //     url: process.env.CHAT_TASKS_FUNCTION,
            //     payload: {
            //         action: "incrementMessagesSent",
            //         team_id: team.id,
            //         increment_value: 1,
            //         created_at: createdAt,
            //     },
            //     inSeconds: 1,
            // });

            // Notify about the error
            await slackNotification({
                username: "Chat Actions (increment_messages_sent)",
                text: `increment_messages_sent error: ${JSON.stringify(error, null, 4)}`,
            });

            throw error;
        }

        return {
            success: true,
            message: "Successfully incremented messages sent",
        };
    } catch (error) {
        console.error("incrementMessagesSent error:", error);
        return {
            success: false,
            message: error.message,
        };
    }
};

export const saveConversation = async ({ supabase, userQuestion, contactID }) => {
    try {
        const { data, error } = await supabase
            .from("teleperson_conversations")
            .insert({
                preview_message: userQuestion,
                contact_id: contactID,
            })
            .select("id");

        if (error) {
            console.error("Error saving conversation:", error);
            throw new Error("Failed to save conversation");
        }

        return {
            success: true,
            data: data[0].id,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};

export const extractVendorName = ({ question, vendors }) => {
    // First attempt: Simple lowercase match
    const questionLower = question.toLowerCase();
    const simpleMatch = vendors.find((vendor) => questionLower.includes(vendor.toLowerCase()));

    if (simpleMatch) return simpleMatch;

    // Second attempt: Remove spaces and try again
    const questionNoSpaces = questionLower.replace(/\s+/g, "");
    return vendors.find((vendor) => {
        const vendorNoSpaces = vendor.toLowerCase().replace(/\s+/g, "");
        return questionNoSpaces.includes(vendorNoSpaces);
    });
};

export const saveChat = async ({ supabase, messages, conversationID, rephrasedInquiry }) => {
    let messagesToSave = [];
    if (messages.length === 3) {
        messagesToSave = messages;
    } else {
        messagesToSave = messages.slice(-2);
    }

    // Map embedding to messages based on role and add timestamps
    messagesToSave = messagesToSave.map((message, index) => {
        // Extract only role and content from the message
        const { role, content } = message;

        // Parse the created_at timestamp into a Date object
        const timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + index);
        const updatedCreatedAt = timestamp.toISOString();

        const baseMessage = {
            conversations_id: conversationID,
            created_at: updatedCreatedAt,
            role,
            content,
        };

        if (role === "user") {
            return {
                ...baseMessage,
                rephrased_message: rephrasedInquiry.data,
            };
        }

        if (role === "assistant") {
            return {
                ...baseMessage,
            };
        }

        return baseMessage;
    });

    try {
        // * First insert messages
        const { data: messages, error: messagesError } = await supabase
            .from("messages")
            .insert(messagesToSave)
            .select("id, role, content, created_at");

        if (messagesError) {
            console.error("Error saving messages:", messagesError);
            throw new Error("Failed to save chat messages");
        }

        return {
            success: true,
            data: messages,
        };
    } catch (error) {
        console.error("Error in saveChat:", error);

        return {
            success: false,
            error: error.message,
        };
    }
};
