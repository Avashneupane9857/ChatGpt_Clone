import { assets } from "@/assets/assets";
import Image from "next/image";
import { ReactNode, useEffect } from "react";
import Markdown from "react-markdown";
import Prism from "prismjs";
import toast from "react-hot-toast";

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  uploadedAt?: Date;
}

interface MessageProps {
  role: "user" | "assistant";
  content: string | ReactNode;
  messageIndex: number;
  files?: UploadedFile[];
  onEditMessage?: (messageIndex: number, content: string) => void;
  onRegenerateResponse?: (messageIndex: number) => void;
}

export const Message = ({
  role,
  content,
  messageIndex,
  files = [],
  onEditMessage,
  onRegenerateResponse,
}: MessageProps) => {
  useEffect(() => {
    Prism.highlightAll();
  }, []);

  const copyMessage = () => {
    if (typeof content === "string") {
      navigator.clipboard.writeText(content);
      toast.success("Text is copied");
    }
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

  return (
    <div className="flex flex-col items-center text-sm w-full max-w-3xl">
      <div
        className={`flex flex-col w-full mb-8 ${
          role === "user" ? "items-end" : ""
        }`}
      >
        <div
          className={`group flex flex-col max-w-2xl py-3 px-5 rounded-xl ${
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

              {/* Action buttons below content for user */}
              <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="space-y-4 w-full overflow-scroll">
                  <div className="space-y-4 w-full overflow-scroll">
                    <Markdown>
                      {typeof content === "string" ? content : String(content)}
                    </Markdown>
                  </div>
                </div>
              </div>

              {/* Action buttons below content for assistant */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
