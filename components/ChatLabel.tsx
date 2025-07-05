import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import toast from "react-hot-toast";
import { useEffect, useRef } from "react";

interface ChatLabelProps {
  openMenu: {
    id: string;
    open: boolean;
  };
  setOpenMenu: React.Dispatch<
    React.SetStateAction<{ id: string; open: boolean }>
  >;
  id: string;
  name: string;
}

export const ChatLabel = ({
  openMenu,
  setOpenMenu,
  id,
  name,
}: ChatLabelProps) => {
  const { fetchUserChats, chat, setSelectedChat } = useAppContext();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu({ id: "", open: false });
      }
    };

    if (openMenu.id === id && openMenu.open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu.id, openMenu.open, id, setOpenMenu]);

  const selectChat = () => {
    const chatData = chat.find((chat) => chat._id === id);
    if (chatData) {
      setSelectedChat(chatData);
      console.log(chatData);
    }
  };

  const renameHandler = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newName = prompt("Enter new name");
      if (!newName) return;
      const { data } = await axios.post("/api/chat/rename", {
        chatId: id,
        name: newName,
      });
      if (data.success) {
        fetchUserChats();
        setOpenMenu({ id: "", open: false });
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An error occurred while renaming");
      }
    }
  };

  const deleteHandler = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const confirm = window.confirm("Do you really want to delete it?");
      if (!confirm) return;
      const { data } = await axios.post("/api/chat/delete", {
        chatId: id,
      });
      if (data.success) {
        fetchUserChats();
        setOpenMenu({ id: "", open: false });
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An error occurred while deleting");
      }
    }
  };

  return (
    <div
      onClick={selectChat}
      className="flex items-center justify-between p-2 text-white/80 hover:bg-white/10 rounded-lg text-sm group cursor-pointer relative"
    >
      <p className="group-hover:max-w-5/6 truncate">{name}</p>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenu({
            id: openMenu.id === id && openMenu.open ? "" : id,
            open: !(openMenu.id === id && openMenu.open),
          });
        }}
        className="group relative flex items-center justify-center h-6 w-6 aspect-square hover:bg-black/80 rounded-lg z-10"
      >
        <Image
          src={assets.three_dots}
          alt="options"
          className={`w-4 ${
            openMenu.id === id && openMenu.open ? "block" : "hidden"
          } group-hover:block`}
        />

        {/* Dropdown Menu */}
        {openMenu.id === id && openMenu.open && (
          <div className="absolute right-0 top-8 bg-[#353535] rounded-xl w-max p-2 shadow-lg z-20">
            <div
              onClick={renameHandler}
              className="flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Image src={assets.pencil_icon} alt="Rename" className="w-4" />
              <p>Rename</p>
            </div>
            <div
              onClick={deleteHandler}
              className="flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Image src={assets.delete_icon} alt="Delete" className="w-4" />
              <p>Delete</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
