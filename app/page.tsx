"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import menuIcon from "../assets/menu_icon.svg";

import { Sidebar } from "@/components/Sidebar";
import { PromptBox } from "@/components/PromptBox";
import { Message as MessageComponent } from "@/components/Message";
import { useAppContext } from "@/context/AppContext";
import { assets } from "@/assets/assets";
import { useClerk, UserButton } from "@clerk/nextjs";

import toast from "react-hot-toast";

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  url?: string;
}

interface MessageType {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  files?: UploadedFile[];
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
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPreAnimation, setShowPreAnimation] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef<string>("");

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
  }, [messages, streamingMessage, showPreAnimation]);

  useEffect(() => {
    console.log("Loading:", loadingChats);
    console.log("Selected Chat:", selectedChat);
  }, [loadingChats, selectedChat]);

  const onStreamingResponse = async (
    chatId: string,
    prompt: string,
    files?: UploadedFile[],
    callback?: (data: unknown) => void,
    isEdit?: boolean,
    editIndex?: number
  ) => {
    try {
      setIsLoading(true);
      setShowPreAnimation(true);
      setStreamingMessage("");
      streamingRef.current = "";

      const response = await fetch("/api/chat/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          prompt,
          files,
          stream: true,
          isEdit,
          editIndex
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      setShowPreAnimation(false);
      setIsStreaming(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (callback) {
                callback(data);
              }

              if (data.error) {
                let msg = data.error;
                const fileMatch = msg.match(/file[s]?: ([^\)]+)\)/i);
                if (fileMatch && fileMatch[1]) {
                  msg += '\nPlease re-upload the affected file(s) or try a different file.';
                } else if (msg.toLowerCase().includes('process') || msg.toLowerCase().includes('upload')) {
                  msg += '\nPlease check your files and try again.';
                }
                toast.error(msg);
                setStreamingMessage("");
                setIsStreaming(false);
                setShowPreAnimation(false);
                streamingRef.current = "";
                return;
              }

              if (data.content) {
                streamingRef.current += data.content;
                setStreamingMessage(streamingRef.current);
              }

              if (data.done) {
                const finalMessage = data.message || {
                  role: "assistant",
                  content: streamingRef.current,
                  timestamp: Date.now(),
                };

                setSelectedChat((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    messages: [...prev.messages, finalMessage],
                  };
                });

                setChat((prevChats) =>
                  prevChats.map((chatItem) =>
                    chatItem._id === chatId
                      ? {
                          ...chatItem,
                          messages: [...chatItem.messages, finalMessage],
                        }
                      : chatItem
                  )
                );

                setStreamingMessage("");
                setIsStreaming(false);
                setShowPreAnimation(false);
                streamingRef.current = "";

                return;
              }
            } catch (parseError) {
              console.error("Error parsing streaming data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in streaming response:", error);
      toast.error("Failed to get response");
      setStreamingMessage("");
      setIsStreaming(false);
      setShowPreAnimation(false);
      streamingRef.current = "";
    } finally {
      setIsLoading(false);
    }
  };

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

      await onStreamingResponse(
        selectedChat._id,
        userMessage.content,
        userMessage.files || [],
        undefined,
        true,
        userMessageIndex
      );
    } catch (error) {
      console.error("Error regenerating response:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar expand={expand} setExpand={setExpand} />

      <div className="flex-1 flex flex-col bg-[#212121] text-white relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={() => setExpand(!expand)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Image src={menuIcon} className="w-6 h-6" alt="Menu" />
          </button>

          <h1 className="text-lg font-semibold truncate mx-4">
            {selectedChat?.name || "New Chat"}
          </h1>

          <div className="flex-shrink-0">
            {user ? (
              <UserButton />
            ) : (
              <button
                onClick={() => openSignIn()}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Image
                  src={assets.profile_icon}
                  className="w-8 h-8"
                  alt="Profile"
                />
              </button>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between p-4">
          <button className="hover:bg-[#3E3F4B] text-white px-4 py-2 rounded-md flex items-center gap-1 transition-colors">
            ChatGPT
          </button>

          <div className="flex items-center">
            {user ? (
              <UserButton />
            ) : (
              <button
                onClick={() => openSignIn()}
                className="flex items-center gap-3 text-white/60 text-sm p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Image
                  src={assets.profile_icon}
                  className="w-7 h-7"
                  alt="Profile"
                />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 relative overflow-hidden">
          {messages.length === 0 && !isStreaming && !showPreAnimation ? (
            <div className="flex items-center gap-3 text-center">
              <p className="text-2xl md:text-3xl mb-4 font-medium">{message}</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative flex flex-col items-center justify-start w-full h-full overflow-y-auto pt-4"
            >
              {/* Chat Title - Desktop Only */}
              <p className="hidden md:block sticky top-0 bg-[#212121] border-transparent hover:border-gray-500/50 py-2 px-4 rounded-lg font-semibold mb-6 z-10">
                {selectedChat?.name || "Untitled Chat"}
              </p>

              {selectedChat?.messages?.map((message, index) => (
                <MessageComponent
                  key={index}
                  role={message.role}
                  content={message.content}
                  files={message.files}
                  messageIndex={index}
                  onEditMessage={(messageIndex, content) => {
                    setEditingMessage({ messageIndex, content });
                  }}
                  onRegenerateResponse={handleRegenerateResponse}
                  isStreaming={false}
                />
              ))}

              {showPreAnimation && (
                <div className="flex flex-col items-center text-sm w-full max-w-3xl">
                  <div className="flex flex-col w-full mb-8">
                    <div className="group flex flex-col max-w-2xl py-3 px-5 rounded-xl bg-transparent gap-3">
                      <div className="flex gap-3">
                        <Image
                          src={assets.logo_icon}
                          alt=""
                          className="h-9 w-9 border p-1 border-white/15 rounded-full flex-shrink-0"
                        />
                        <div className="space-y-4 w-full">
                          <div className="flex items-center gap-1">
                            <div className="typing-animation mt-3">
                              <div className="dot animate-bounce"></div>
                              <div
                                className="dot animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                              <div
                                className="dot animate-bounce"
                                style={{ animationDelay: "0.4s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && (
                <MessageComponent
                  role="assistant"
                  content={streamingMessage}
                  messageIndex={-1}
                  onEditMessage={() => {}}
                  onRegenerateResponse={() => {}}
                  isStreaming={true}
                />
              )}
 
              {isLoading && !isStreaming && !showPreAnimation && (
                <div className="flex gap-4 max-w-3xl w-full py-3">
                  <Image
                    src={assets.logo_icon}
                    alt=""
                    className="h-9 w-9 border p-1 border-white/15 rounded-full flex-shrink-0"
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

          <div className="w-full max-w-4xl mx-auto">
            <PromptBox
              setIsLoading={setIsLoading}
              isLoading={isLoading}
              editingMessage={editingMessage}
              setEditingMessage={setEditingMessage}
              onStreamingResponse={onStreamingResponse}
              isStreaming={isStreaming}
            />
          </div>

          <p className="text-xs text-white/60 mt-2 text-center px-4">
            ChatGPT can make mistakes. Check important info.
          </p>
        </div>
      </div>

      {expand && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setExpand(false)}
        />
      )}

      <style jsx>{`
        .typing-animation {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.6);
          animation: bounce 1.4s infinite ease-in-out;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        /* Hide scrollbar but keep functionality */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
