import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import toast from "react-hot-toast";

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

  const selectChat = () => {
    const chatData = chat.find((chat) => chat._id === id);
    if (chatData) {
      setSelectedChat(chatData);
      console.log(chatData);
    }
  };

  const renameHandler = async () => {
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

  const deleteHandler = async () => {
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
      className="flex items-center justify-between p-2 text-white/80 hover:bg-white/10 rounded-lg text-sm group cursor-pointer"
    >
      <p className="group-hover:max-w-5/6 truncate">{name}</p>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenu({ id, open: !openMenu.open });
        }}
        className="group relative flex items-center justify-center h-6 w-6 aspect-square hover:bg-black/80 rounded-lg"
      >
        <Image
          src={assets.three_dots}
          alt="options"
          className={`w-4 ${
            openMenu.id === id && openMenu.open ? "" : "hidden"
          } group-hover:block`}
        />
        <div
          className={`absolute ${
            openMenu.id === id && openMenu.open ? "block" : "hidden"
          } -right-36 top-6 bg-gray-700 rounded-xl w-max p-2`}
        >
          <div
            onClick={renameHandler}
            className="flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg"
          >
            <Image src={assets.pencil_icon} alt="Rename" className="w-4" />
            <p>Rename</p>
          </div>
          <div
            onClick={deleteHandler}
            className="flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg"
          >
            <Image src={assets.delete_icon} alt="Delete" className="w-4" />
            <p>Delete</p>
          </div>
        </div>
      </div>
    </div>
  );
};
