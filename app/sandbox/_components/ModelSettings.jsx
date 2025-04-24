"use client";

import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
// import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

import { modelSettingsFormSchema } from "@/lib/formSchemas";
import { updateModelSettings } from "@/app/_actions/settings";
import { modelSelection, promptMaxCharacters } from "@/lib/globalVariables";

export default function ModelSettings({
    premiumModelAccess,
    chatbot,
    classNames,
    setChatbotSettings = () => {},
}) {
    // const { toast } = useToast();
    const router = useRouter();

    const [characters, setCharacters] = useState(chatbot.prompt ? chatbot.prompt : "");

    const form = useForm({
        resolver: zodResolver(modelSettingsFormSchema),
        defaultValues: {
            prompt: chatbot.prompt,
            model: chatbot.model,
            temperature: chatbot.temperature,
        },
    });

    const { isSubmitting, errors } = form.formState;

    const onSubmit = async (values) => {
        const updatedSettings = await updateModelSettings({
            id: chatbot.id,
            columnValues: values,
        });

        if (updatedSettings.success) {
            // toast({
            //     title: "Saved",
            //     description: "Your chatbot's settings have been saved",
            //     duration: 5000,
            // });

            setChatbotSettings((prevState) => ({ ...prevState, ...values }));
            router.refresh();
        } else {
            // toast({
            //     title: "Error",
            //     description: updatedSettings.message,
            //     duration: 5000,
            //     variant: "destructive",
            // });
        }
    };

    const getProviderIcon = (provider) => {
        const iconSize = 20;
        switch (provider) {
            case "openai":
                return (
                    <Image
                        src="/icons/openai.svg"
                        alt="OpenAI"
                        width={iconSize}
                        height={iconSize}
                        className="dark:invert"
                    />
                );
            case "google":
                return (
                    <Image
                        src="/icons/google.svg"
                        alt="Google"
                        width={iconSize}
                        height={iconSize}
                    />
                );
            case "anthropic":
                return (
                    <Image
                        src="/icons/anthropic.svg"
                        alt="Anthropic"
                        width={iconSize}
                        height={iconSize}
                        className="dark:invert"
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Card className={classNames}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Model</FormLabel>

                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="w-full"
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a model">
                                                {field.value && (
                                                    <div className="flex items-center gap-2">
                                                        {getProviderIcon(
                                                            modelSelection.find(
                                                                (m) => m.model === field.value
                                                            )?.provider
                                                        )}
                                                        <span>
                                                            {
                                                                modelSelection.find(
                                                                    (m) => m.model === field.value
                                                                )?.name
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {modelSelection.map((option) => (
                                            <SelectItem
                                                key={option.model}
                                                value={option.model}
                                                className="cursor-pointer"
                                                disabled={!premiumModelAccess && option.premium}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getProviderIcon(option.provider)}
                                                    <div className="font-medium">{option.name}</div>
                                                    {/* <div className="text-sm text-gray-500">
                                                        -{" "}
                                                        {option.messageCredits === 1
                                                            ? "1 message credit"
                                                            : `${option.messageCredits} message credits`}
                                                    </div> */}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />

                                <p className="text-xs text-muted-foreground">
                                    Learn about the different AI models in our{" "}
                                    <Link
                                        className="underline hover:text-blue-500"
                                        href="https://docs.webagent.ai/essentials/models"
                                        target="_blank"
                                    >
                                        documentation
                                    </Link>
                                </p>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="prompt"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center">
                                    <div className="flex w-full justify-between">
                                        <div className="flex items-center">
                                            <FormLabel>Instructions</FormLabel>

                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <InformationCircleIcon className="ml-1 h-4 w-4 cursor-help text-blue-800 dark:text-white" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-sm">
                                                        <p>
                                                            Instructions guide the type of response
                                                            your chatbot will give.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        <div>
                                            <p className="rounded text-sm text-muted-foreground">
                                                {characters.length.toLocaleString()} /{" "}
                                                {promptMaxCharacters.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <FormControl>
                                    <Textarea
                                        className="h-64 sm:h-96"
                                        placeholder="Write clear instructions for your chatbot to follow"
                                        {...field}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            setCharacters(e.target.value);
                                        }}
                                    />
                                </FormControl>

                                <FormMessage />

                                <p className="text-xs text-muted-foreground">
                                    Learn best practices for instructing your chatbot in our{" "}
                                    <Link
                                        className="underline hover:text-blue-500"
                                        href="https://docs.webagent.ai/essentials/instruct-model"
                                        target="_blank"
                                    >
                                        documentation
                                    </Link>
                                </p>
                            </FormItem>
                        )}
                    />

                    <div>
                        <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between">
                                        <div className="flex items-center justify-start">
                                            <FormLabel>Temperature</FormLabel>
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <InformationCircleIcon className="ml-1 h-4 w-4 cursor-help text-blue-800 dark:text-white" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-sm">
                                                        <p>
                                                            Controls randomness: As the temperature
                                                            approaches zero, the model will become
                                                            deterministic and repetitive.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <FormLabel>{form.getValues("temperature")}</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Slider
                                            className="cursor-pointer pt-2"
                                            defaultValue={[field.value]}
                                            max={1}
                                            step={0.1}
                                            onValueChange={(value) => {
                                                form.setValue("temperature", value[0]);
                                            }}
                                        />
                                    </FormControl>

                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button
                        className="w-full"
                        type="submit"
                        disabled={Object.keys(errors).length > 0 || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </form>
            </Form>
        </Card>
    );
}
