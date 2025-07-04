"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import menuIcon from "../assets/menu_icon.svg";
import ChatIcon from "../assets/chat_icon.svg";

import { Sidebar } from "@/components/Sidebar";
import { PromptBox } from "@/components/PromptBox";
import { Message } from "@/components/Message";
import { useAppContext } from "@/context/AppContext";
import { assets } from "@/assets/assets";
import { useClerk, UserButton } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";

interface MessageType {
  role: string;
  content: string;
  timestamp: number;
  files?: [];
}

export default function Home() {
  const greetings = [
    "Hi, I'm Avash's_AI",
    "How can I help you today?",
    "Ready when you are.",
    "What are we building today?",
    "Need some code magic?",
    "Here to make your ideas real.",
    "Just say the word.",
    "Your AI sidekick reporting in.",
    "What's on your mind?",
    "Let's make something awesome.",
  ];
  const [message, setMessage] = useState("");
  const { openSignIn } = useClerk();
  const { user, selectedChat, loadingChats, setSelectedChat, setChat } =
    useAppContext();
  const [editingMessage, setEditingMessage] = useState<{
    messageIndex: number;
    content: string;
  } | null>(null);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * greetings.length);
    setMessage(greetings[randomIndex]);
  }, []);

  const [expand, setExpand] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChat?.messages) {
      setMessages(selectedChat.messages);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    console.log("Loading:", loadingChats);
    console.log("Selected Chat:", selectedChat);
  }, [loadingChats, selectedChat]);

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (!selectedChat) return;

    try {
      setIsLoading(true);

      const userMessageIndex = messageIndex - 1;
      if (
        userMessageIndex < 0 ||
        selectedChat.messages[userMessageIndex].role !== "user"
      ) {
        toast.error("Cannot regenerate this response");
        return;
      }

      const userMessage = selectedChat.messages[userMessageIndex];

      const messagesBeforeRegenerate = selectedChat.messages.slice(
        0,
        userMessageIndex + 1
      );

      setSelectedChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: messagesBeforeRegenerate,
        };
      });

      const { data } = await axios.post("/api/chat/ai", {
        chatId: selectedChat._id,
        prompt: userMessage.content,
      });

      if (data.success) {
        const message = data.data?.content || "No response received";
        const messageTokens = message.split(" ");
        const assistantMessage = {
          role: "assistant" as const,
          content: "",
          timestamp: Date.now(),
        };

        setSelectedChat((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, assistantMessage],
          };
        });

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

        setChat((prevChats) =>
          prevChats.map((chatItem) =>
            chatItem._id === selectedChat._id
              ? { ...chatItem, messages: [...chatItem.messages, data.data!] }
              : chatItem
          )
        );

        toast.success("Response regenerated");
      } else {
        toast.error(data.message || "Failed to regenerate response");
      }
    } catch (error) {
      console.error("Error regenerating response:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex h-screen">
        <Sidebar expand={expand} setExpand={setExpand} />
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 bg-[#212121] text-white relative">
          <button className="hover:bg-[#3E3F4B] absolute top-4 left-4 text-white px-4 py-2 rounded-md flex items-center gap-1">
            ChatGPT
          </button>
          <div className="absolute top-2 right-2">
            <div
              onClick={() => (user ? null : openSignIn())}
              className={`flex items-center ${
                expand
                  ? "hover:bg-white/10 rounded-lg "
                  : "justify-center w-full"
              }gap-3 text-white/60 text-sm p-2 mt-2 cursor-pointer`}
            >
              {user ? (
                <UserButton />
              ) : (
                <Image src={assets.profile_icon} className="w-7" alt="" />
              )}
            </div>
          </div>

          <div className="md:hidden absolute px-4 top-6 flex items-center justify-between w-full">
            <Image
              onClick={() => (expand ? setExpand(false) : setExpand(true))}
              src={menuIcon}
              className="rotate-180 "
              alt=""
            />
            <Image src={ChatIcon} className="opacity-70" alt="" />
          </div>
          {messages.length === 0 ? (
            <>
              <div className="flex items-center gap-3">
                <p className="text-3xl mb-4 font-medium">{message}</p>
              </div>
            </>
          ) : (
            <div
              ref={containerRef}
              className="relative flex flex-col items-center justify-start w-full mt-20 max-h-screen overflow-y-auto"
            >
              <p className="fixed top-8 border-transparent hover:border-gray-500/50 py-1 px-2 rounded-lg font-semibold mb-6">
                {selectedChat?.name || "Untitled Chat"}
              </p>
              {selectedChat?.messages?.map((message, index) => (
                <Message
                  key={index}
                  role={message.role}
                  content={message.content}
                  files={message.files}
                  messageIndex={index}
                  onEditMessage={(messageIndex, content) => {
                    setEditingMessage({ messageIndex, content });
                  }}
                  onRegenerateResponse={handleRegenerateResponse}
                />
              ))}
              {isLoading && (
                <div className="flex gap-4 max-w-3xl w-full py-3">
                  <Image
                    src={assets.logo_icon}
                    alt=""
                    className="h-9 w-9 border p-1 border-white/15 rounded-full "
                  />
                  <div className="loader flex justify-center items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                    <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                    <div className="w-1 h-1 rounded-full bg-white animate-bounce"></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <PromptBox
            setIsLoading={setIsLoading}
            isLoading={isLoading}
            editingMessage={editingMessage}
            setEditingMessage={setEditingMessage}
          />
          <p className="text-xs absolute bottom-1 text-white">
            ChatGPT can make mistakes. Check important info.{" "}
          </p>
        </div>
      </div>
    </div>
  );
}
