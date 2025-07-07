import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import MemoryClient from 'mem0ai';

const memoryClient = new MemoryClient({ 
  apiKey: process.env.MEM0AI_KEY || ""
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }
    // Fetch all memories for the user
    const memories = await memoryClient.getAll({ user_id: userId });
    return NextResponse.json({ success: true, memories });
  } catch (error) {
    console.error("Error fetching memories:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error occurred" });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "User not authenticated" });
    }
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "Memory id is required" });
    }
    await memoryClient.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error occurred" });
  }
} 