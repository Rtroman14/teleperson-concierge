import Link from "next/link";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/app/components/ui/form";
import { useToast } from "@/app/components/ui/use-toast";
import { ToastAction } from "@/app/components/ui/toast";

export default function Calendly({ form, leadAccess }) {
    const { toast } = useToast();

    const handleUpgrade = async () => {
        toast({
            title: "Premium Feature",
            description: "Upgrade to let your chatbot book meetings",
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
                name="calendly.active"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="calendly_active">Book Meeting</FormLabel>
                            <FormDescription>
                                Enabling this option will send a calendly invite to the user.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                id="calendly_active"
                                className={field.value ? "bg-primary" : "bg-input"}
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

            {leadAccess && form.getValues("calendly.active") && (
                <FormField
                    control={form.control}
                    name="calendly.args.url"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Calendly URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://calendly.com/your-link" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </>
    );
}
