import Image from "next/image";
import { assets } from "../assets/assets";
import { useAppContext } from "@/context/AppContext";
import { ChatLabel } from "./ChatLabel";
import { useState, useEffect, useRef } from "react";

interface SidebarProps {
  expand: boolean;
  setExpand: (expand: boolean) => void;
}

export const Sidebar = ({ expand, setExpand }: SidebarProps) => {
  const { chat, createNewChat } = useAppContext();
  const [openMenu, setOpenMenu] = useState({ id: "", open: false });
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setOpenMenu({ id: "", open: false });
      }
    };

    if (openMenu.open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu.open]);

  // Close menu when sidebar collapses
  useEffect(() => {
    if (!expand) {
      setOpenMenu({ id: "", open: false });
    }
  }, [expand]);

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col bg-[#1a1a1a] transition-all z-50 max-md:h-screen ${
        expand ? "p-5 w-60" : "md:w-20 w-0 max-md:overflow-hidden"
      }`}
    >
      <div className={`flex-1 flex flex-col min-h-0 ${!expand ? "p-5" : ""}`}>
        <div
          className={`flex items-center justify-between mb-8 flex-shrink-0 ${
            expand ? "" : "justify-center"
          }`}
        >
          <div
            className={`${expand ? "" : "group relative cursor-pointer"}`}
            onClick={() => !expand && setExpand(true)}
          >
            <Image
              src={expand ? assets.logo_icon : assets.logo_icon}
              className={`w-8 h-8 transition-opacity ${
                !expand ? "group-hover:opacity-0" : ""
              }`}
              alt=""
            />
            {!expand && (
              <>
                <Image
                  src={assets.sidebar_icon}
                  className="w-8 h-8 absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  alt=""
                />
                <div className="absolute w-max left-12 top-0 opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                  Open sidebar
                  <div className="w-3 h-3 absolute bg-black rotate-45 -left-1.5 top-1/2 -translate-y-1/2"></div>
                </div>
              </>
            )}
          </div>
          <div
            onClick={() => (expand ? setExpand(false) : setExpand(true))}
            className={`group relative flex items-center justify-center hover:bg-gray-500/20 transition-all duration-300 h-9 w-9 aspect-square rounded cursor-pointer ${
              expand ? "" : "hidden"
            }`}
          >
            <Image
              src={expand ? assets.sidebar_close_icon : assets.sidebar_icon}
              alt=""
              className="w-6 h-6"
            />
            {expand && (
              <div className="absolute w-max left-1/2 -translate-x-1/2 top-12 opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                Close Sidebar
                <div className="w-3 h-3 absolute bg-black rotate-45 left-1/2 -top-1.5 -translate-x-1/2"></div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed height container for the scrollable content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="space-y-2 flex-shrink-0">
            <button
              onClick={createNewChat}
              className={`flex items-center w-full text-left text-white/90 hover:bg-gray-500/20 transition-all duration-200 rounded-lg ${
                expand
                  ? "px-4 py-3 gap-3"
                  : "group relative h-10 w-10 mx-auto justify-center"
              }`}
            >
              <Image
                src={expand ? assets.chat_icon : assets.chat_icon_dull}
                alt=""
                className="w-5 h-5"
              />
              {expand && <span className="text-sm font-medium">New chat</span>}
              {!expand && (
                <div className="absolute w-max -top-12 -right-12 opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                  New Chat
                  <div className="w-3 h-3 absolute bg-black rotate-45 left-4 -bottom-1.5"></div>
                </div>
              )}
            </button>

            <button
              className={`flex items-center w-full text-left text-white/70 hover:bg-gray-500/20 transition-all duration-200 rounded-lg ${
                expand
                  ? "px-4 py-3 gap-3"
                  : "group relative h-10 w-10 mx-auto justify-center"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {expand && <span className="text-sm">Search chats</span>}
              {!expand && (
                <div className="absolute w-max -top-12 -right-12 opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                  Search chats
                  <div className="w-3 h-3 absolute bg-black rotate-45 left-4 -bottom-1.5"></div>
                </div>
              )}
            </button>

            <button
              className={`flex items-center w-full text-left text-white/70 hover:bg-gray-500/20 transition-all duration-200 rounded-lg ${
                expand
                  ? "px-4 py-3 gap-3"
                  : "group relative h-10 w-10 mx-auto justify-center"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              {expand && <span className="text-sm">Library</span>}
              {!expand && (
                <div className="absolute w-max -top-12 -right-12 opacity-0 group-hover:opacity-100 transition bg-black text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none">
                  Library
                  <div className="w-3 h-3 absolute bg-black rotate-45 left-4 -bottom-1.5"></div>
                </div>
              )}
            </button>

            <div className={`my-6 ${expand ? "block" : "hidden"}`}>
              <div className="h-px bg-white/10"></div>
            </div>

            {expand && (
              <div className="space-y-2 flex-shrink-0">
                <button className="flex items-center w-full text-left text-white/70 hover:bg-gray-500/20 transition-all duration-200 rounded-lg px-4 py-3 gap-3">
                  <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="text-sm">Sora</span>
                </button>

                <button className="flex items-center w-full text-left text-white/70 hover:bg-gray-500/20 transition-all duration-200 rounded-lg px-4 py-3 gap-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="text-sm">GPTs</span>
                </button>
              </div>
            )}
          </div>

          {/* Scrollable chat section with proper height constraints */}
          <div
            className={`flex-1 flex flex-col min-h-0 ${
              expand ? "mt-8" : "hidden"
            }`}
          >
            <div className="mb-3 flex-shrink-0">
              <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider px-4">
                Chats
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
              {chat.map((chatItem) => (
                <ChatLabel
                  key={chatItem._id}
                  name={chatItem.name}
                  id={chatItem._id}
                  openMenu={openMenu}
                  setOpenMenu={setOpenMenu}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom section */}
      <div
        className={`mt-6 pt-4 border-t border-white/10 flex-shrink-0 ${
          expand ? "block" : "hidden"
        }`}
      >
        <button className="flex items-center w-full text-left text-white/70 hover:bg-gray-500/20 transition-all duration-200 rounded-lg px-4 py-3 gap-3">
          <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Upgrade plan</div>
            <div className="text-xs text-white/50">
              More access to the best models
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
