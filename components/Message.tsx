/* eslint-disable @typescript-eslint/no-explicit-any */
import { assets } from "@/assets/assets";
import Image from "next/image";
import { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import toast from "react-hot-toast";
import "katex/dist/katex.min.css";

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  uploadedAt?: Date;
  processedContent?: string;
}

interface MessageProps {
  role: "user" | "assistant";
  content: string | ReactNode;
  messageIndex: number;
  files?: UploadedFile[];
  onEditMessage?: (messageIndex: number, content: string) => void;
  onRegenerateResponse?: (messageIndex: number) => void;
  isStreaming?: boolean;
}

export const Message = ({
  role,
  content,
  messageIndex,
  files = [],
  onEditMessage,
  onRegenerateResponse,
  isStreaming = false,
}: MessageProps) => {
  const copyMessage = () => {
    if (typeof content === "string") {
      navigator.clipboard.writeText(content);
      toast.success("Text is copied");
    }
  };

  const copyCodeBlock = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const handleEditClick = () => {
    if (onEditMessage && typeof content === "string") {
      onEditMessage(messageIndex, content);
    }
  };

  const handleRegenerateClick = () => {
    if (onRegenerateResponse) {
      onRegenerateResponse(messageIndex);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderFilePreview = (file: UploadedFile) => {
    const imageUrl = file.cloudinaryUrl || file.content;

    if (file.type.startsWith("image/")) {
      return (
        <div className="mb-3">
          <div className="relative max-w-xs">
            <Image
              src={imageUrl || "/placeholder-image.png"}
              alt={file.name}
              width={300}
              height={200}
              className="rounded-lg max-w-full h-auto shadow-md object-cover"
              unoptimized={!!file.content}
              onError={(e) => {
                console.error("Image load error:", e);
                e.currentTarget.src = "/placeholder-image.png";
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
              {file.name}
            </div>
            {file.cloudinaryUrl && (
              <div className="absolute top-2 right-2">
                <a
                  href={file.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70"
                >
                  View Full
                </a>
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="mb-3 p-3 bg-[#404040] rounded-lg border border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-xs text-white">📄</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{file.name}</p>
              <p className="text-xs text-white/60">
                {formatFileSize(file.size)}
              </p>

              {file.uploadedAt && (
                <p className="text-xs text-white/40">
                  Uploaded: {new Date(file.uploadedAt).toLocaleString()}
                </p>
              )}
            </div>
            {file.cloudinaryUrl && (
              <a
                href={file.cloudinaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Download
              </a>
            )}
          </div>
        </div>
      );
    }
  };

  // Custom components for markdown rendering
  const markdownComponents = {
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";

      if (!inline && match) {
        return (
          <div className="relative group">
            <div className="flex justify-between items-center bg-gray-800 px-4 py-2 rounded-t-lg">
              <span className="text-sm text-gray-300 font-medium">
                {language.toUpperCase()}
              </span>
              <button
                onClick={() =>
                  copyCodeBlock(String(children).replace(/\n$/, ""))
                }
                className="text-gray-400 hover:text-white transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                title="Copy code"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              className="!mt-0 !rounded-t-none"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code
          className="bg-gray-800 text-pink-400 px-2 py-1 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table
          className="min-w-full border-collapse border border-gray-600 rounded-lg overflow-hidden"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-gray-700" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: any) => (
      <tbody className="bg-gray-800/50" {...props}>
        {children}
      </tbody>
    ),
    th: ({ children, ...props }: any) => (
      <th
        className="border border-gray-600 px-4 py-2 text-left text-white font-semibold"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="border border-gray-600 px-4 py-2 text-gray-200" {...props}>
        {children}
      </td>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-gray-800/30 text-gray-300 italic"
        {...props}
      >
        {children}
      </blockquote>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-white mb-4 mt-6" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-bold text-white mb-3 mt-5" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-bold text-white mb-2 mt-4" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }: any) => (
      <p className="text-gray-200 mb-4 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul
        className="list-disc list-inside text-gray-200 mb-4 space-y-1"
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol
        className="list-decimal list-inside text-gray-200 mb-4 space-y-1"
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-gray-200" {...props}>
        {children}
      </li>
    ),
    a: ({ children, ...props }: any) => (
      <a
        className="text-blue-400 hover:text-blue-300 underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
  };

  return (
    <div className="flex flex-col items-center text-sm w-full max-w-4xl">
      <div
        className={`flex flex-col w-full mb-8 ${
          role === "user" ? "items-end" : ""
        }`}
      >
        <div
          className={`group flex flex-col max-w-full py-3 px-5 rounded-xl ${
            role === "user" ? "bg-[#303030]" : "bg-transparent gap-3"
          }`}
        >
          {role === "user" ? (
            <>
              <div className="text-white/90">
                {files && files.length > 0 && (
                  <div className="mb-3">
                    {files.map((file, index) => (
                      <div key={index}>{renderFilePreview(file)}</div>
                    ))}
                  </div>
                )}
                {content && <span>{content}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-3 w-full">
                <div className="space-y-4 w-full">
                  {isStreaming ? (
                    <div className="text-white/90 whitespace-pre-wrap">
                      {typeof content === "string" ? content : String(content)}
                      <span className="animate-pulse ml-1 text-white/60">
                        ▋
                      </span>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <Markdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownComponents}
                      >
                        {typeof content === "string"
                          ? content
                          : String(content)}
                      </Markdown>
                    </div>
                  )}
                </div>
              </div>
              {!isStreaming && (
                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Image
                    onClick={copyMessage}
                    src={assets.copy_icon}
                    alt="Copy"
                    className="w-4 cursor-pointer hover:opacity-70"
                    title="Copy message"
                  />
                  <Image
                    onClick={handleRegenerateClick}
                    src={assets.regenerate_icon}
                    alt="Regenerate"
                    className="w-4 cursor-pointer hover:opacity-70"
                    title="Regenerate response"
                  />
                  <Image
                    src={assets.like_icon}
                    alt="Like"
                    className="w-4 cursor-pointer hover:opacity-70"
                    title="Like response"
                  />
                  <Image
                    src={assets.dislike_icon}
                    alt="Dislike"
                    className="w-4 cursor-pointer hover:opacity-70"
                    title="Dislike response"
                  />
                </div>
              )}
            </>
          )}
        </div>
        {/* User message action buttons below the bubble */}
        {role === "user" && (
          <div className="flex gap-2 mt-2 ml-2">
            <Image
              onClick={copyMessage}
              src={assets.copy_icon}
              alt="Copy"
              className="w-4 cursor-pointer hover:opacity-70"
              title="Copy message"
            />
            <Image
              onClick={handleEditClick}
              src={assets.pencil_icon}
              alt="Edit"
              className="w-4 cursor-pointer hover:opacity-70"
              title="Edit message"
            />
          </div>
        )}
      </div>
    </div>
  );
};
