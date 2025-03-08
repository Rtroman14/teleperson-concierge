import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import _ from "@/lib/Helpers";

export async function GET(request, { params }) {
    const { domain } = params;

    if (!domain) {
        return NextResponse.json(
            { success: false, message: "Domain parameter is required" },
            { status: 400 }
        );
    }

    try {
        if (!_.authenticateRequest(request)) {
            return NextResponse.json(
                { success: false, message: "Invalid Auth Token" },
                { status: 401 }
            );
        }

        const supabase = await createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            { auth: { persistSession: false } }
        );

        // Get vendor record
        const { data: vendor, error: vendorError } = await supabase
            .from("vendors")
            .select("id")
            .eq("domain", domain)
            .single();
        if (vendorError) throw new Error(vendorError.message);
        if (!vendor)
            throw new Error(
                `Domain should be structured like 'example.com'. No vendor found for domain: ${domain}`
            );

        // Get counts for each status
        const counts = await Promise.all([
            supabase
                .from("teleperson_web_pages")
                .select("id, status", { count: "exact" })
                .eq("vendor_id", vendor.id),
            supabase
                .from("teleperson_web_pages")
                .select("id, status", { count: "exact" })
                .eq("vendor_id", vendor.id)
                .eq("status", "Staging"),
            supabase
                .from("teleperson_web_pages")
                .select("id, status", { count: "exact" })
                .eq("vendor_id", vendor.id)
                .eq("status", "Training"),
            supabase
                .from("teleperson_web_pages")
                .select("id, status", { count: "exact" })
                .eq("vendor_id", vendor.id)
                .eq("status", "Trained"),
            supabase
                .from("teleperson_web_pages")
                .select("id, status", { count: "exact" })
                .eq("vendor_id", vendor.id)
                .eq("status", "Error"),
        ]);

        // Calculate statistics
        const stats = {
            total_pages: counts[0].count || 0,
            staging_pages: counts[1].count || 0,
            in_progress: counts[2].count || 0,
            trained_pages: counts[3].count || 0,
            failed_pages: counts[4].count || 0,
        };

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
