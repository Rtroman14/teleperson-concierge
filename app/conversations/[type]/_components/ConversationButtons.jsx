"use client";

import { useContext } from "react";
import { ConversationContext } from "@/context/conversationContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { TrashIcon, EnvelopeIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

import { updateRecords } from "@/app/_actions/common";

import { useParams, useRouter } from "next/navigation";
// import { useToast } from "@/app/components/ui/use-toast";

// const options = ["Open", "Closed", "All"];
const options = ["Unread", "Read", "All"];

export default function ConversationButtons() {
    const { id: chatbotID } = useParams();
    // const { toast } = useToast();
    const router = useRouter();

    const {
        selectedConversation,
        setLoading,
        setActionLoading,
        setConversations,
        setSelectedConversation,
        selected,
        setSelected,
        conversationsByStatus,
        setPage,
        checkedConversations,
        setCheckedConversations,
    } = useContext(ConversationContext);

    const handleUpdate = async (status) => {
        setActionLoading(true);

        let selectedRows = [selectedConversation.id];
        if (checkedConversations.length) {
            selectedRows = checkedConversations;
        }

        const records = selectedRows.map((row) => ({
            id: row,
            closed: status,
            chatbots_id: chatbotID,
        }));

        const updatedRecords = await updateRecords({
            table: "conversations",
            records,
        });

        if (updatedRecords.success) {
            if (selected !== "All") {
                setConversations((prevState) => {
                    const updatedConversations = prevState.filter(
                        (conversation) => !selectedRows.includes(conversation.id)
                    );

                    if (updatedConversations.length) {
                        setSelectedConversation(updatedConversations[0]);
                    } else {
                        setSelectedConversation(null);
                    }

                    return updatedConversations;
                });
            } else {
                setConversations((prevState) =>
                    prevState.map((conversation) =>
                        selectedRows.includes(selectedConversation.id)
                            ? { ...conversation, closed: status }
                            : conversation
                    )
                );

                setSelectedConversation((prevState) => ({
                    ...prevState,
                    closed: status,
                }));
            }

            setCheckedConversations([]);
            router.refresh();
        } else {
            // toast({
            //     title: "Error",
            //     description: updatedRecords.message,
            //     duration: 5000,
            //     variant: "destructive",
            // });
        }

        setActionLoading(false);
    };

    const handleDelete = async () => {
        setActionLoading(true);

        let idsToUpdate = [selectedConversation.id];

        if (checkedConversations.length) {
            idsToUpdate = checkedConversations;
        }

        const records = idsToUpdate.map((id) => ({
            id,
            is_archived: true,
            chatbots_id: chatbotID,
        }));

        const updatedRecords = await updateRecords({
            table: "conversations",
            records,
        });

        if (updatedRecords.success) {
            setConversations((prevState) => {
                const updatedConversations = prevState.filter(
                    (conversation) => !idsToUpdate.includes(conversation.id)
                );

                if (updatedConversations.length) {
                    setSelectedConversation(updatedConversations[0]);
                } else {
                    setSelectedConversation(null);
                }

                return updatedConversations;
            });

            setCheckedConversations([]);
            router.refresh();
        } else {
            // toast({
            //     title: "Error",
            //     description: updatedRecords.message,
            //     duration: 5000,
            //     variant: "destructive",
            // });
        }

        setActionLoading(false);
    };

    // const handleDelete = async () => {
    //     setActionLoading(true);

    //     let idsToDelete = [selectedConversation.id];

    //     if (checkedConversations.length) {
    //         idsToDelete = checkedConversations;
    //     }

    //     const deletedRecords = await deleteRecords("conversations", idsToDelete);

    //     if (deletedRecords.success) {
    //         setConversations((prevState) => {
    //             const updatedConversations = prevState.filter(
    //                 (conversation) => !idsToDelete.includes(conversation.id)
    //             );

    //             if (updatedConversations.length) {
    //                 setSelectedConversation(updatedConversations[0]);
    //             } else {
    //                 setSelectedConversation(null);
    //             }

    //             return updatedConversations;
    //         });

    //         setCheckedConversations([]);
    //         router.refresh();
    //     } else {
    //         toast({
    //             title: "Error",
    //             description: deletedRecords.message,
    //             duration: 5000,
    //             variant: "destructive",
    //         });
    //     }

    //     setActionLoading(false);
    // };

    const handleDropdownSelect = async (selection) => {
        if (selection === selected) return;

        setSelected(selection);

        setLoading(true);
        const conversationsRes = await conversationsByStatus({
            chatbotID,
            status: selection,
            page: 0,
        });
        setLoading(false);

        if (conversationsRes.success) {
            setConversations(conversationsRes.data);
            setPage(0);

            if (conversationsRes.data.length) {
                setSelectedConversation(conversationsRes.data[0]);
            } else {
                setSelectedConversation(null);
            }
        } else {
            setSelected(selected);
        }
    };

    return (
        <div className="flex flex-row">
            <div>
                <div className="w-[337px] border-b border-border p-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8">
                                {selected}
                                <ChevronDownIcon className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {options.map((option) => (
                                <DropdownMenuItem
                                    key={option}
                                    className="hover:cursor-pointer"
                                    onClick={() => handleDropdownSelect(option)}
                                >
                                    {option}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex w-full justify-end gap-6 border-b border-border p-2">
                {selectedConversation ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8">
                                Action
                                <ChevronDownIcon className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem
                                className="hover:cursor-pointer"
                                onClick={() => handleUpdate(!selectedConversation.closed)}
                            >
                                {selectedConversation.closed ? (
                                    <>
                                        <EnvelopeIcon className="mr-2 h-4 w-4" />
                                        <span>Unread</span>
                                    </>
                                ) : (
                                    <>
                                        <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
                                        <span>Read</span>
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="hover:cursor-pointer"
                                onClick={handleDelete}
                            >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>
        </div>
    );
}
