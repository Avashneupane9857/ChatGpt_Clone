
import { Webhook } from "svix";
import connectDB from "@/config/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
interface WebhookData {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string;
    last_name: string;
    image_url: string;
}
interface WebhookEvent {
    data: WebhookData;
    type: string;
}
export async function POST(req: NextRequest) {
    const wh = new Webhook(process.env.SIGNING_SECRET as string);
    const headerPayload = await headers();
 const svixId = headerPayload.get("svix-id");
const svixSignature = headerPayload.get("svix-signature");
const svixTimestamp = headerPayload.get("svix-timestamp");

if (!svixId || !svixSignature || !svixTimestamp) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
}

const svixHeaders = {
    "svix-id": svixId,
    "svix-signature": svixSignature,
    "svix-timestamp": svixTimestamp
};
    const payload = await req.json();
    const body: string = JSON.stringify(payload);
    const { data, type }: WebhookEvent = wh.verify(body, svixHeaders) as WebhookEvent;
    const userData = {
        _id: data.id,
        email: data.email_addresses[0].email_address,
        name: `${data.first_name} ${data.last_name}`,
        image: data.image_url
    };
    await connectDB();
    switch(type){
        case "user.created":
            await User.create(userData)
            break;
        case "user.updated":
            await User.findByIdAndUpdate(data.id,userData)
            break;    
        case "user.deleted":
            await User.findByIdAndDelete(data.id)
            break;   
        default:
            break;
    }
    return NextResponse.json({message:"Event received"})
}