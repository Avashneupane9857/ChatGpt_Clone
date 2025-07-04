"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import type { UserResource } from "@clerk/types";
import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import toast from "react-hot-toast";

interface Chat {
  _id: string;
  name: string;
  messages: {
    role: "user" | "assistant"; // ✅ Fixed: constrained to specific values
    content: string;
    timestamp: number;
  }[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AppContextType {
  user: UserResource | null | undefined;
  chat: Chat[];
  setChat: React.Dispatch<React.SetStateAction<Chat[]>>;
  selectedChat: Chat | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  fetchUserChats: () => Promise<void>;
  createNewChat: () => Promise<void>;
  loadingChats: boolean;
}

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};

export const AppContextProvider: React.FC<AppContextProviderProps> = ({
  children,
}) => {
  const { user } = useUser();
  const [loadingChats, setLoadingChats] = useState(true);
  const { getToken } = useAuth();
  const [chat, setChat] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  const createNewChat = async (): Promise<void> => {
    try {
      if (!user) return;
      const token = await getToken();
      await axios.post(
        "/api/chat/create",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchUserChats();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create new chat";
      toast.error(message);
    }
  };

  const fetchUserChats = async (): Promise<void> => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/chat/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        if (data.data.length === 0) {
          await createNewChat(); // This also calls fetchUserChats again, so...
          return;
        }
        data.data.sort(
          (a: Chat, b: Chat) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        console.log("Fetching chats...");
        console.log("Chat data received:", data.data);
        setChat(data.data);
        setSelectedChat(data.data[0]); // ✅ properly sets it
        console.log("Current selectedChat:", selectedChat);
      } else {
        toast.error(data.message || "Failed to fetch chats");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch chats";
      toast.error(message);
    }
  };

  useEffect(() => {
    console.log("User:", user);
    if (user) {
      fetchUserChats().finally(() => setLoadingChats(false));
    }
  }, [user]);

  const value: AppContextType = {
    user,
    chat,
    setChat,
    selectedChat,
    setSelectedChat,
    fetchUserChats,
    createNewChat,
    loadingChats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
