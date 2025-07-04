import { assets } from "@/assets/assets";
import Image from "next/image";
import { ReactNode, useEffect } from "react";
import Markdown from "react-markdown";
import Prism from "prismjs";
import toast from "react-hot-toast";

interface MessageProps {
  role: "user" | "assistant";
  content: string | ReactNode;
  messageIndex: number;
  onEditMessage?: (messageIndex: number, content: string) => void;
  onRegenerateResponse?: (messageIndex: number) => void;
}

export const Message = ({
  role,
  content,
  messageIndex,
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
            <span className="text-white/90">{content}</span>
          ) : (
            <div className="flex gap-3">
              <div className="space-y-4 w-full overflow-scroll">
                <div className="space-y-4 w-full overflow-scroll">
                  <Markdown>
                    {typeof content === "string" ? content : String(content)}
                  </Markdown>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Image
              onClick={copyMessage}
              src={assets.copy_icon}
              alt="Copy"
              className="w-4 cursor-pointer hover:opacity-70"
              title="Copy message"
            />
            {role === "user" ? (
              <Image
                onClick={handleEditClick}
                src={assets.pencil_icon}
                alt="Edit"
                className="w-4 cursor-pointer hover:opacity-70"
                title="Edit message"
              />
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
