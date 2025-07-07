"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiTrash2 } from "react-icons/fi";

interface Memory {
  id?: string;
  text?: string;
  content?: string;
  memory?: string;
  timestamp?: number;
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemories = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/memories");
        const data = await res.json();
        if (data.success) {
          setMemories(Array.isArray(data.memories) ? data.memories : []);
        } else {
          setError(data.message || "Failed to fetch memories");
        }
      } catch {
        setError("Failed to fetch memories");
      } finally {
        setLoading(false);
      }
    };
    fetchMemories();
  }, []);

  // Filtered memories based on search
  const filteredMemories = memories.filter((memory) => {
    const content = (memory.memory || memory.text || memory.content || "").toLowerCase();
    return content.includes(search.toLowerCase());
  });

  const handleDelete = async (id?: string) => {
    if (!id) return;
    const confirm = window.confirm("Are you sure you want to delete this memory?");
    if (!confirm) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success("Memory deleted");
      } else {
        toast.error(data.message || "Failed to delete memory");
      }
    } catch {
      toast.error("Failed to delete memory");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#181818] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Your Memories</h1>
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full max-w-md px-4 py-2 rounded-lg bg-[#232323] text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/40 transition"
          />
        </div>
        {loading ? (
          <div className="text-white/60 text-center py-8">Loading memories...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-8">{error}</div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-white/40 text-center py-8">No memories found.</div>
        ) : (
          <ul className="space-y-4">
            {filteredMemories.map((memory, idx) => (
              <li
                key={memory.id || idx}
                className="bg-[#232323] rounded-lg px-5 py-4 border border-white/10 shadow-sm flex items-start justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-sm whitespace-pre-line break-words">
                    {memory.memory || memory.text || memory.content || '[No content]'}
                  </div>
                  {memory.timestamp && (
                    <div className="text-[11px] text-white/40 mt-2">
                      {new Date(memory.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
                {memory.id && (
                  <button
                    onClick={() => handleDelete(memory.id)}
                    disabled={deletingId === memory.id}
                    className="ml-2 p-2 rounded-lg hover:bg-red-500/20 transition text-red-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete memory"
                  >
                    <FiTrash2 size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 