"use client";

import _ from "@/app/lib/Helpers";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";

import { Form, FormLabel, FormDescription } from "@/app/components/ui/form";
import { useToast } from "@/app/components/ui/use-toast";
import { Card } from "@/app/components/ui/card";

import { toolSettingsFormSchema } from "@/app/lib/formSchemas";

import { updateToolSettings } from "@/app/_actions/settings";

import { EnvelopeIcon } from "@heroicons/react/24/outline";

import CaptureLeads from "./CaptureLeadsFormFields";
import Calendly from "./CalendlyFormFields";
import { useEffect } from "react";

export default function Tools({ chatbot, leadAccess, classNames, setChatbotSettings = () => {} }) {
    const { toast } = useToast();
    const router = useRouter();

    const [chatbotTools, setChatbotTools] = useState(chatbot.tools || []);

    const calendlyTool = chatbotTools.find((tool) => tool.name === "bookCalendlyMeeting");
    const captureLeadsTool = chatbotTools.find((tool) => tool.name === "contactForm");

    const form = useForm({
        resolver: zodResolver(toolSettingsFormSchema),
        defaultValues: {
            capture_leads: {
                active: captureLeadsTool?.active || false,
                args: {
                    trigger: captureLeadsTool?.args?.trigger || "messages",
                    trigger_messages: captureLeadsTool?.args?.trigger_messages || "1",
                    trigger_intent:
                        captureLeadsTool?.args?.trigger_intent ||
                        "Send the contact form when the user asks to speak to an agent.",
                    heading:
                        captureLeadsTool?.args?.heading ||
                        "Please provide your contact info so we can follow up with you.",
                    name: captureLeadsTool?.args?.name || true,
                    email: captureLeadsTool?.args?.email || true,
                    phone: captureLeadsTool?.args?.phone || false,
                },
            },
            calendly: {
                active: calendlyTool?.active || false,
                args: {
                    url: calendlyTool?.args?.url || "",
                },
            },
        },
    });

    const { isSubmitting, errors } = form.formState;

    const onSubmit = async (values) => {
        // Prepare tools array for database updates
        const tools = [
            {
                id: captureLeadsTool?.id,
                active: values.capture_leads.active,
                args: values.capture_leads.args,
                name: "contactForm",
                description: values.capture_leads.args.trigger_intent,
            },
            {
                id: calendlyTool?.id,
                active: values.calendly.active,
                args: values.calendly.args,
                name: "bookCalendlyMeeting",
                description:
                    "Send the user a booking calendar to book a call, meeting, or appointment.",
            },
        ];

        const updatedSettings = await updateToolSettings({
            chatbotID: chatbot.id,
            tools,
            toolFields: values,
        });

        if (updatedSettings.success) {
            setChatbotTools(updatedSettings.data);

            setChatbotSettings((prevState) => ({ ...prevState, tools: updatedSettings.data }));

            router.refresh();
            // toast({
            //     title: "Success",
            //     description: "Settings updated successfully",
            //     duration: 5000,
            // });
        } else {
            toast({
                title: "Error",
                description: updatedSettings.message,
                duration: 5000,
                variant: "destructive",
            });
        }
    };

    // useEffect(() => {
    //     console.log(`errors -->`, errors);
    // }, [errors]);

    return (
        <Card className={classNames}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4 rounded-lg border border-border p-4">
                        <CaptureLeads form={form} leadAccess={leadAccess} />
                    </div>
                    <div className="space-y-4 rounded-lg border border-border p-4">
                        <Calendly form={form} leadAccess={leadAccess} />
                    </div>

                    <div className="space-y-4 rounded-lg border border-border p-4">
                        <div className="flex flex-col space-y-2">
                            <FormLabel>Request Custom Tool</FormLabel>
                            <FormDescription>
                                Need a specific tool for your chatbot? Let us know!
                            </FormDescription>
                            <Button type="button" variant="outline" asChild>
                                <Link
                                    href="mailto:ryan@webagent.ai?subject=Tool Request"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <EnvelopeIcon className="mr-2 h-4 w-4" />
                                    Request Tool
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        type="submit"
                        disabled={Object.keys(errors).length > 0 || isSubmitting}
                        size="sm"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </form>
            </Form>
        </Card>
    );
}
