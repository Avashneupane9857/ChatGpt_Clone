import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface PromptBoxProps {
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
  editingMessage?: {
    messageIndex: number;
    content: string;
  } | null;
  setEditingMessage?: (
    editing: { messageIndex: number; content: string } | null
  ) => void;
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

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  url?: string;
}

export const PromptBox = ({
  setIsLoading,
  isLoading,
  editingMessage,
  setEditingMessage,
}: PromptBoxProps) => {
  const [prompt, setPrompt] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, setChat, selectedChat, setSelectedChat } = useAppContext();

  useEffect(() => {
    if (editingMessage) {
      setPrompt(editingMessage.content);
    }
  }, [editingMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage(e);
      } else {
        sendPrompt(e);
      }
    }
    if (e.key === "Escape" && editingMessage) {
      cancelEdit();
    }
  };

  const cancelEdit = () => {
    if (setEditingMessage) {
      setEditingMessage(null);
    }
    setPrompt("");
    setUploadedFiles([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const processedFiles: UploadedFile[] = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type ${file.type} is not supported`);
        continue;
      }

      try {
        let content = "";

        if (file.type.startsWith("image/")) {
          // For images, convert to base64
          const reader = new FileReader();
          content = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          // For text-based files, read as text
          const reader = new FileReader();
          content = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
          });
        }

        processedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          content,
        });
      } catch (error) {
        toast.error(`Error processing file ${file.name}`);
        console.error(error);
      }
    }

    setUploadedFiles((prev) => [...prev, ...processedFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleEditMessage = async (
    e:
      | React.FormEvent<HTMLFormElement>
      | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (!editingMessage || !setEditingMessage) return;

    const promptCopy = prompt;
    try {
      e.preventDefault();
      if (!user) return toast.error("Login to send messages");
      if (isLoading) return toast.error("Wait for some time");
      if (!selectedChat) return toast.error("No chat selected");
      if (!prompt.trim() && uploadedFiles.length === 0)
        return toast.error("Message cannot be empty");

      const currentChat = selectedChat;
      setIsLoading(true);

      const messagesBeforeEdit = currentChat.messages.slice(
        0,
        editingMessage.messageIndex
      );

      const updatedUserMessage = {
        role: "user" as const,
        content: prompt,
        timestamp: Date.now(),
        files: uploadedFiles,
      };

      const updatedMessages = [...messagesBeforeEdit, updatedUserMessage];

      setChat((prevChats) =>
        prevChats.map((chatItem) =>
          chatItem._id === currentChat._id
            ? { ...chatItem, messages: updatedMessages }
            : chatItem
        )
      );

      setSelectedChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: updatedMessages,
        };
      });

      setEditingMessage(null);
      setPrompt("");
      setUploadedFiles([]);

      const { data }: { data: ApiResponse } = await axios.post("/api/chat/ai", {
        chatId: currentChat._id,
        prompt,
        files: uploadedFiles,
        isEdit: true,
        editIndex: editingMessage.messageIndex,
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
            chatItem._id === currentChat._id
              ? { ...chatItem, messages: [...chatItem.messages, data.data!] }
              : chatItem
          )
        );
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
      if (!prompt.trim() && uploadedFiles.length === 0)
        return toast.error("Message cannot be empty");

      const currentChat = selectedChat;
      setIsLoading(true);
      setPrompt("");

      const userPrompt = {
        role: "user" as const,
        content: prompt,
        timestamp: Date.now(),
        files: uploadedFiles,
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

      setUploadedFiles([]);

      const { data }: { data: ApiResponse } = await axios.post("/api/chat/ai", {
        chatId: currentChat._id,
        prompt,
        files: uploadedFiles,
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
    <div className="w-full max-w-3xl">
      {/* File Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="mb-4 p-3 bg-[#404040] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-white/80">Uploaded files:</span>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-[#505050] p-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {file.type.startsWith("image/") ? (
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-xs text-white">IMG</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                      <span className="text-xs text-white">DOC</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-white truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-white/60">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-400 hover:text-red-300 text-lg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={editingMessage ? handleEditMessage : sendPrompt}
        className={`w-full bg-[#303030] p-4 rounded-3xl transition-all ${
          editingMessage ? "ring-2 ring-blue-500" : ""
        }`}
      >
        {editingMessage && (
          <div className="flex items-center gap-2 mb-2 text-xs text-blue-400">
            <span>✏️ Editing message</span>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-gray-400 hover:text-white"
            >
              (Press Esc to cancel)
            </button>
          </div>
        )}
        <textarea
          onKeyDown={handleKeyDown}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setPrompt(e.target.value)
          }
          value={prompt}
          className="outline-none w-full resize-none overflow-hidden break-words bg-transparent"
          rows={2}
          placeholder={editingMessage ? "Edit your message..." : "Ask Anything"}
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.docx,.doc,.csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs    cursor-pointer hover:text-slate-300 transition"
            >
              <span className="text-3xl ">+</span>
            </button>

            {editingMessage && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-600 hover:bg-gray-500 rounded-full p-2 cursor-pointer transition-colors"
              >
                <span className="text-xs">Cancel</span>
              </button>
            )}
            <button
              type="submit"
              disabled={
                (!prompt.trim() && uploadedFiles.length === 0) || isLoading
              }
              className={`${
                prompt.trim() || uploadedFiles.length > 0
                  ? "bg-primary"
                  : "bg-[#71717a]"
              } rounded-full p-2 cursor-pointer disabled:opacity-50`}
            >
              <Image
                src={
                  prompt.trim() || uploadedFiles.length > 0
                    ? assets.arrow_icon
                    : assets.arrow_icon_dull
                }
                alt=""
                className="w-3.5 aspect-square "
              />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
