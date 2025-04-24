import Link from "next/link";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/lib/utils";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/app/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Label } from "@/app/components/ui/label";
import { useToast } from "@/app/components/ui/use-toast";
import { ToastAction } from "@/app/components/ui/toast";

const leadCaptureFields = [
    { name: "Name", field: "name" },
    { name: "Email", field: "email" },
    { name: "Phone Number", field: "phone" },
];

const triggerOptions = [
    { value: "messages", label: "After X Messages" },
    { value: "intent", label: "After User Intent" },
    { value: "before", label: "Before Chat" },
];

export default function CaptureLeads({ form, leadAccess }) {
    const { toast } = useToast();

    const handleUpgrade = async () => {
        toast({
            title: "Premium Feature",
            description: "Upgrade to collect visitor contact information",
            duration: 3000,
            variant: "destructive",
            action: (
                <ToastAction altText="Upgrade">
                    <Link href="/settings?tab=subscription">Upgrade</Link>
                </ToastAction>
            ),
        });
    };

    return (
        <>
            <FormField
                control={form.control}
                name="capture_leads.active"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="capture_leads_active">Capture Leads</FormLabel>
                            <FormDescription>
                                Enabling this option will display a contact form to the user.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                id="capture_leads_active"
                                className={
                                    leadAccess && field.value ? "ml-3 bg-primary" : "ml-3 bg-input"
                                }
                                checked={leadAccess ? field.value : false}
                                onCheckedChange={(checked) => {
                                    if (!leadAccess) {
                                        handleUpgrade();
                                        return;
                                    }
                                    field.onChange(checked);
                                }}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />

            {leadAccess && form.getValues("capture_leads.active") ? (
                <>
                    <FormField
                        control={form.control}
                        name="capture_leads.args.trigger"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Display contact form</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-col"
                                    >
                                        {triggerOptions.map((option) => (
                                            <div
                                                key={option.value}
                                                className="flex flex-1 items-center gap-2 rounded-lg border border-border p-3"
                                            >
                                                <RadioGroupItem
                                                    value={option.value}
                                                    id={option.value}
                                                />
                                                <Label htmlFor={option.value}>{option.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="capture_leads.args.trigger_messages"
                        render={({ field }) => (
                            <FormItem
                                className={cn(
                                    "space-y-2",
                                    form.watch("capture_leads.args.trigger") === "messages"
                                        ? "block"
                                        : "hidden"
                                )}
                            >
                                <FormLabel>Number of messages</FormLabel>
                                <FormDescription>
                                    Send the contact form after the visitor sends this many
                                    messages.
                                </FormDescription>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="1"
                                        className="w-full"
                                        placeholder="1"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="capture_leads.args.trigger_intent"
                        render={({ field }) => (
                            <FormItem
                                className={cn(
                                    "space-y-2",
                                    form.watch("capture_leads.args.trigger") === "intent"
                                        ? "block"
                                        : "hidden"
                                )}
                            >
                                <FormLabel>Instructions</FormLabel>
                                <FormDescription>
                                    Describe what this tool does and when the contact form should be
                                    sent.
                                </FormDescription>
                                <FormControl>
                                    <Input
                                        type="text"
                                        className="w-full"
                                        placeholder="Send the contact form when the user asks to speak to a human."
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <hr className="h-[1px] border-0 bg-border" />

                    <div className="space-y-4">
                        <Label className="text-base">Form Configurations</Label>

                        <FormField
                            control={form.control}
                            name="capture_leads.args.heading"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Form Title</FormLabel>

                                    <FormControl>
                                        <Input
                                            placeholder="Please provide your info so we can follow up with you."
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {leadCaptureFields.map((leadField) => (
                            <FormField
                                key={leadField.name}
                                control={form.control}
                                name={`capture_leads.args.${leadField.field}`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between gap-5 rounded-lg border border-border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel htmlFor="capture_leads">
                                                {leadField.name}
                                            </FormLabel>
                                            <FormDescription>
                                                Capture the visitor's {leadField.name.toLowerCase()}
                                                .
                                            </FormDescription>
                                        </div>

                                        <FormControl>
                                            <Switch
                                                id={leadField.field}
                                                className={
                                                    leadAccess && field.value
                                                        ? "bg-primary"
                                                        : "bg-input"
                                                }
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={!leadAccess}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>

                    {/* <hr className="h-[1px] border-0 bg-border" /> */}

                    {/* <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="capture_leads.args.required"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between gap-5">
                                    <div className="space-y-0.5">
                                        <FormLabel htmlFor="capture_leads_required">
                                            Required
                                        </FormLabel>
                                        <FormDescription>
                                            Require the user to submit the contact form before
                                            proceeding to chat.
                                        </FormDescription>
                                    </div>

                                    <FormControl>
                                        <Switch
                                            id="capture_leads_required"
                                            className={
                                                leadAccess && field.value
                                                    ? "bg-primary"
                                                    : "bg-input"
                                            }
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={!leadAccess}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div> */}
                </>
            ) : null}
        </>
    );
}
