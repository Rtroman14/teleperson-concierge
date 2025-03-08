import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export default function Sources({ darkTheme, sources }) {
    return (
        <Accordion type="single" collapsible className="max-w-[85%] pr-3">
            <AccordionItem value="item-1">
                <AccordionTrigger className={darkTheme ? "text-gray-300 antialiased" : ""}>
                    Sources
                </AccordionTrigger>
                <AccordionContent>
                    <ul className="ml-6 mt-1 space-y-1">
                        {sources.map((source, index) => (
                            <li
                                key={`${source.url}-${index}`}
                                className={cn(
                                    "line-clamp-1 font-light duration-200 hover:underline",
                                    darkTheme ? "text-gray-300" : "text-gray-600"
                                )}
                            >
                                <a href={source.url} target="_blank">
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
