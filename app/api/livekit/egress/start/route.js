import { NextResponse } from "next/server";
import {
    EgressClient,
    SegmentedFileOutput,
    EncodedFileOutput,
    S3Upload,
    EncodingOptionsPreset,
} from "livekit-server-sdk";

import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import AWS from "aws-sdk";

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

function normalizePrefix(p) {
    if (!p) return "";
    return p.endsWith("/") ? p : p + "/";
}

function s3Target() {
    return new S3Upload({
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secret: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.S3_BUCKET,
        forcePathStyle: false,
    });
}

export async function POST(request) {
    try {
        const { roomName = "demo-room" } = await request.json();

        if (
            !process.env.LIVEKIT_HOST ||
            !process.env.LIVEKIT_API_KEY ||
            !process.env.LIVEKIT_API_SECRET
        ) {
            return NextResponse.json(
                { ok: false, error: "livekit_config_missing" },
                { status: 500 }
            );
        }

        const client = new EgressClient(
            process.env.LIVEKIT_HOST,
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET
        );

        // check existing egress
        const existingEgress = await client.listEgress({ roomName });
        if (existingEgress.items?.length > 0) {
            const existing = existingEgress.items[0];
            return NextResponse.json({
                ok: true,
                message: "Egress already running",
                egressId: existing.egressId,
                status: existing.status,
                playlistUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_PREFIX}${roomName}-stream-live.m3u8`,
            });
        }

        // timestamp folder
        const d = new Date();
        const timestampFolder =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` +
            `-${String(d.getDate()).padStart(2, "0")}_` +
            `${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}-${String(d.getSeconds()).padStart(2, "0")}`;

        const basePrefix = normalizePrefix(process.env.S3_PREFIX || "testvideos/");
        const prefix = `${basePrefix}${timestampFolder}/${roomName}/`;

        const filenamePrefix = `${prefix}${roomName}-stream`;

        // HLS output
        const hlsOut = new SegmentedFileOutput({
            filenamePrefix,
            playlistName: `${roomName}-vod.m3u8`,
            livePlaylistName: `${roomName}-stream-live.m3u8`,
            segmentDuration: 2,
            output: { case: "s3", value: s3Target() },
        });

        const info = await client.startRoomCompositeEgress(roomName, hlsOut, {
            layout: "grid",
            encodingOptions: EncodingOptionsPreset.H264_1080P_30,
            audioOnly: false,
        });

        const playlistUrl =
            `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${prefix}${roomName}-stream-live.m3u8`;

        // respond
        const response = NextResponse.json({
            ok: true,
            egressId: info.egressId,
            status: info.status,
            playlistUrl,
        });

        // MP4 RECORDING (same as old backend)
        (async () => {
            try {
                const mp4Filepath = `${prefix}${roomName}-${Date.now()}.mp4`;

                const mp4Out = new EncodedFileOutput({
                    filepath: mp4Filepath,
                    output: { case: "s3", value: s3Target() },
                });

                await client.startRoomCompositeEgress(roomName, mp4Out, {
                    layout: "grid",
                    encodingOptions: EncodingOptionsPreset.H264_1080P_30,
                    audioOnly: false,
                });

                console.log("📁 MP4 Saving To:", mp4Filepath);
            } catch (err) {
                console.error("❌ MP4 Recording Error:", err);
            }
        })();

        // FFMPEG LOCAL RECORDING (same)
        if (process.env.ENABLE_FFMPEG === "true") {
            setTimeout(() => recordStreamToMP4(roomName, playlistUrl), 5000);
        }

        return response;
    } catch (err) {
        console.error("❌ Egress start error:", err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}

// Local ffmpeg → upload → delete
async function recordStreamToMP4(roomName, playlistUrl) {
    try {
        if (!playlistUrl) return;

        console.log(`⏺ Recording stream from ${playlistUrl}`);

        const outputFile = path.resolve(`./${roomName}-${Date.now()}.mp4`);

        await new Promise((resolve, reject) => {
            ffmpeg(playlistUrl)
                .inputOptions("-re")
                .outputOptions("-c copy")
                .on("start", (cmd) => console.log("FFMPEG START:", cmd))
                .on("stderr", (line) => console.log("FFMPEG:", line))
                .on("end", resolve)
                .on("error", reject)
                .save(outputFile);
        });

        console.log(`✅ Local saved: ${outputFile}`);

        const fileContent = fs.readFileSync(outputFile);
        const key = `${normalizePrefix(process.env.S3_PREFIX)}recordings/${roomName}-${Date.now()}.mp4`;

        await s3
            .upload({
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: fileContent,
                ContentType: "video/mp4",
            })
            .promise();

        fs.unlinkSync(outputFile);
    } catch (err) {
        console.error("❌ Recording upload failed:", err);
    }
}
