import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { contextualizeChunks } from "./contextualizeChunks.js";
import { summarizeWebPage } from "./summarizeWebPage.js";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
const SEPARATORS = ["#", "##", "###", "\n\n", "\n", ".", ""];

async function splitDocsIntoChunks({ text, metadata }) {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
        separators: SEPARATORS,
    });

    return await textSplitter.splitDocuments([new Document({ pageContent: text, metadata })]);
}

async function chunkEmbedInsert({ succeededScrape, pipe, teamID, supabase, chatbotID, vendor }) {
    try {
        const docs = await splitDocsIntoChunks({
            text: succeededScrape.text,
            metadata: {
                source: succeededScrape.url,
                title: succeededScrape.title || null,
            },
        });
        let newDocs = [];

        for (let doc of docs) {
            // Skip documents with less than 5 words
            const wordCount = doc.pageContent.trim().split(/\s+/).length;
            if (wordCount < 5) continue;

            const output = await pipe(doc.pageContent, {
                pooling: "mean",
                normalize: true,
            });

            // Base document structure
            const docData = {
                content: doc.pageContent,
                metadata: doc.metadata,
                embedding: Array.from(output.data),
            };

            // Add fields based on whether vendor exists
            if (vendor) {
                docData.vendor_id = vendor.id;
                docData.vendor_name = vendor.name;
                docData.teleperson_web_page_id = succeededScrape.id;
            } else {
                docData.team_id = teamID;
                docData.chatbots_id = chatbotID;
                docData.web_pages_id = succeededScrape.id;
            }

            newDocs.push(docData);
        }

        // Run contextualization and summarization in parallel
        const [contextualizedDocs, summaryDocs] = await Promise.all([
            contextualizeChunks({
                docs: newDocs,
                text: succeededScrape.text,
            }),
            summarizeWebPage({
                docs: newDocs,
                text: succeededScrape.text,
                pipe,
            }),
        ]);

        // Combine regular docs with summary docs
        newDocs = [...contextualizedDocs, ...summaryDocs];

        // Insert into appropriate table based on vendor
        const documentsTableName = vendor ? "teleperson_documents" : "documents_gte";
        const { error } = await supabase.from(documentsTableName).insert(newDocs);
        if (error) throw new Error(error.message);

        const webPagesTableName = vendor ? "teleperson_web_pages" : "web_pages";
        const { data: updatedWebPage, error: updatedWebPageError } = await supabase
            .from(webPagesTableName)
            .update({
                status: "Trained",
                num_characters: succeededScrape.numCharacters,
                title: succeededScrape.title,
                description: succeededScrape.description,
                error_message: null,
                vendor_id: vendor?.id || null,
            })
            .eq("id", succeededScrape.id)
            .select();
        if (updatedWebPageError) throw new Error(updatedWebPageError.message);

        return {
            success: true,
            results: {
                succeededWebPage: succeededScrape.id,
                data: updatedWebPage,
                failedWebPage: null,
            },
        };
    } catch (error) {
        console.error("chunkEmbedInsert() -->", error.message);

        await supabase
            .from("web_pages")
            .update({
                status: "Error",
                num_characters: succeededScrape.numCharacters,
                title: succeededScrape.title,
                description: succeededScrape.description,
                error_message: error.message,
            })
            .eq("id", succeededScrape.id);

        return {
            success: false,
            results: {
                step: "",
                message: error.message,
            },
        };
    }
}

export { splitDocsIntoChunks, chunkEmbedInsert };
