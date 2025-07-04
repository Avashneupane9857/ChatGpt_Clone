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

  const renderFilePreview = (file: UploadedFile, index: number) => {
    if (file.type.startsWith("image/")) {
      return (
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden bg-gray-800 w-[120px] h-[120px]">
            <Image
              src={file.content}
              alt={file.name}
              fill
              className="object-cover"
              sizes="120px"
              unoptimized // Add this for base64 images
            />
            {/* Overlay with file name */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-end">
              <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate w-full">
                {file.name}
              </div>
            </div>
          </div>
          {/* Remove button */}
          <button
            onClick={() => removeFile(index)}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors z-10"
          >
            ×
          </button>
          {/* File size indicator */}
          <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            {formatFileSize(file.size)}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-between bg-[#505050] p-3 rounded-lg min-w-[200px] group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm text-white font-semibold">
                {file.type.includes("pdf")
                  ? "PDF"
                  : file.type.includes("word")
                  ? "DOC"
                  : file.type.includes("excel") || file.type.includes("csv")
                  ? "XLS"
                  : "TXT"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate max-w-[150px]">
                {file.name}
              </p>
              <p className="text-xs text-white/60">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <button
            onClick={() => removeFile(index)}
            className="text-red-400 hover:text-red-300 text-lg ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      );
    }
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
      {/* Fixed File Upload Preview Area - ChatGPT Style */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3 p-3 bg-[#2f2f2f] rounded-2xl border border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-white/80">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Compact horizontal layout for images like ChatGPT */}
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index}>{renderFilePreview(file, index)}</div>
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
          className="outline-none w-full resize-none overflow-hidden break-words bg-transparent text-white placeholder-gray-400"
          rows={2}
          placeholder={editingMessage ? "Edit your message..." : "Ask Anything"}
        />
        <div className="flex items-center justify-between text-sm mt-3">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-2 text-xs border border-gray-300/40 py-1 p-2 rounded-full cursor-pointer hover:bg-gray-500/20 transition text-white/80">
              <Image src={assets.deepthink_icon} alt="" />
              ChatGpt
            </p>
            <p className="flex items-center gap-2 text-xs border border-gray-300/40 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition text-white/80">
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
              className="flex items-center gap-1 text-xs cursor-pointer hover:text-slate-300 transition text-white/80"
              title="Attach files"
            >
              <span className="text-2xl">📎</span>
            </button>

            {editingMessage && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-600 hover:bg-gray-500 rounded-full px-3 py-1 cursor-pointer transition-colors text-xs text-white"
              >
                Cancel
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
              } rounded-full p-2 cursor-pointer disabled:opacity-50 transition-colors`}
            >
              <Image
                src={
                  prompt.trim() || uploadedFiles.length > 0
                    ? assets.arrow_icon
                    : assets.arrow_icon_dull
                }
                alt=""
                className="w-3.5 aspect-square"
              />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
