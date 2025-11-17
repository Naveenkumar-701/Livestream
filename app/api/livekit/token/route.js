import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request) {
    try {
        const { roomName = "demo-room", identity = `user-${Date.now()}` } =
            await request.json();

        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            return NextResponse.json(
                { ok: false, error: "livekit_keys_missing" },
                { status: 500 }
            );
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            { identity }
        );

        at.addGrant({ roomJoin: true, room: roomName });

        const token = await at.toJwt();

        console.log(`Issued token for identity=${identity} room=${roomName}`);

        return NextResponse.json({ ok: true, token });
    } catch (err) {
        console.error("Token issue error:", err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
