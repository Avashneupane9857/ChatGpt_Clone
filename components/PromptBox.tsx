import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";

interface PromptBoxProps {
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  };
  message?: string;
}

export const PromptBox = ({ setIsLoading, isLoading }: PromptBoxProps) => {
  const [prompt, setPrompt] = useState<string>("");
  const { user, setChat, selectedChat, setSelectedChat } = useAppContext();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(e);
    }
  };

  const sendPrompt = async (
    e:
      | React.FormEvent<HTMLFormElement>
      | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const promptCopy = prompt;
    try {
      e.preventDefault();
      if (!user) return toast.error("Login to send messages");
      if (isLoading) return toast.error("Wait for some time");
      if (!selectedChat) return toast.error("No chat selected");
      const currentChat = selectedChat;

      setIsLoading(true);
      setPrompt("");
      console.log(selectedChat);

      const userPrompt = {
        role: "user" as const,
        content: prompt,
        timestamp: Date.now(),
      };

      setChat((prevChats) =>
        selectedChat
          ? prevChats.map((chatItem) =>
              chatItem._id === currentChat._id
                ? { ...chatItem, messages: [...chatItem.messages, userPrompt] }
                : chatItem
            )
          : prevChats
      );

      setSelectedChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, userPrompt],
        };
      });

      const { data }: { data: ApiResponse } = await axios.post("/api/chat/ai", {
        chatId: currentChat._id,
        prompt,
      });

      if (data.success) {
        setChat((prevChats) =>
          prevChats.map((chatItem) =>
            chatItem._id === currentChat._id
              ? { ...chatItem, messages: [...chatItem.messages, data.data!] }
              : chatItem
          )
        );

        const message = data.data?.content || "No response received";
        const messageTokens = message.split(" ");
        const assistantMessage = {
          role: "assistant" as const,
          content: "",
          timestamp: Date.now(),
        };

        setSelectedChat((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, assistantMessage],
              }
            : null
        );

        for (let i = 0; i < messageTokens.length; i++) {
          setTimeout(() => {
            assistantMessage.content = messageTokens.slice(0, i + 1).join(" ");
            setSelectedChat((prev) => {
              if (!prev) return null;
              const updatedMessages = [
                ...prev.messages.slice(0, -1),
                { ...assistantMessage },
              ];
              return { ...prev, messages: updatedMessages };
            });
          }, i * 100);
        }
      } else {
        toast.error(data.message || "An error occurred");
        setPrompt(promptCopy);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else if (typeof error === "string") {
        toast.error(error);
      } else {
        toast.error("An error occurred");
      }
      setPrompt(promptCopy);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={sendPrompt}
      className={`w-full ${
        (selectedChat?.messages?.length ?? 0) > 0 ? "max-w-3xl" : "max-w-2xl"
      } bg-[#303030] p-4 rounded-3xl mt-4 transition-all`}
    >
      <textarea
        onKeyDown={handleKeyDown}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setPrompt(e.target.value)
        }
        value={prompt}
        className="outline-none w-full resize-none overflow-hidden break-words bg-transparent"
        rows={2}
        placeholder="Ask Anything"
        required
      />
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 py-1 p-2 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image src={assets.deepthink_icon} alt="" />
            ChatGpt
          </p>
          <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition">
            <Image src={assets.search_icon} alt="" />
            Search
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Image src={assets.pin_icon} alt="" className="w-4 cursor-pointer" />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className={`${
              prompt ? "bg-primary" : "bg-[#71717a]"
            } rounded-full p-2 cursor-pointer disabled:opacity-50`}
          >
            <Image
              src={prompt ? assets.arrow_icon : assets.arrow_icon_dull}
              alt=""
              className="w-3.5 aspect-square"
            />
          </button>
        </div>
      </div>
    </form>
  );
};
