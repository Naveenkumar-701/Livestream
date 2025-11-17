// "use client";

// import React, { useEffect, useRef } from "react";
// import Hls from "hls.js";
// import { Box, Typography } from "@mui/material";

// export default function WatchStream({ params }) {
//     const videoRef = useRef(null);
//     const room = params?.room; // ✅ get room name like "room-500"

//     useEffect(() => {
//         if (!room) return;
//         const video = videoRef.current;

//         // ✅ Dynamically create stream URL using your backend proxy
//         const streamUrl = `https://recrootbucket.s3.ap-southeast-2.amazonaws.com/testvideos/room-821-stream-live.m3u8`;
//         console.log("🎥 Loading stream:", streamUrl);

//         if (Hls.isSupported()) {
//             const hls = new Hls();
//             hls.loadSource(streamUrl);
//             hls.attachMedia(video);
//             hls.on(Hls.Events.MANIFEST_PARSED, () => {
//                 console.log("✅ HLS manifest loaded, starting playback");
//                 video.play();
//             });
//             hls.on(Hls.Events.ERROR, (event, data) => {
//                 console.error("❌ HLS error:", data);
//             });
//         } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
//             video.src = streamUrl; // Safari fallback
//         } else {
//             console.error("❌ HLS not supported in this browser");
//         }
//     }, [room]);

//     return (
//         <Box
//             sx={{
//                 bgcolor: "#0f0d16",
//                 minHeight: "100vh",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 p: 4,
//             }}
//         >
//             <Typography variant="h5" sx={{ color: "#fff", mb: 3 }}>
//                 Watching Live Room: {room}
//             </Typography>

//             <video
//                 ref={videoRef}
//                 controls
//                 autoPlay
//                 muted={false}
//                 playsInline
//                 style={{
//                     width: "80%",
//                     maxWidth: "900px",
//                     borderRadius: 12,
//                     border: "2px solid #444",
//                     background: "#000",
//                 }}
//             />

//             <Typography sx={{ color: "#aaa", mt: 2, fontSize: 14 }}>
//                 If video doesn’t start, wait a few seconds — stream may still be starting.
//             </Typography>
//         </Box>
//     );
// }




"use client";

import React, { useEffect, useRef, use } from "react";
import Hls from "hls.js";
import { Box, Typography } from "@mui/material";

export default function WatchStream({ params }) {
    // ✅ unwrap the params Promise
    const { room } = use(params);

    const videoRef = useRef(null);

    useEffect(() => {
        if (!room) return;
        const video = videoRef.current;

        // Build the stream URL from environment vars
        const bucket = process.env.NEXT_PUBLIC_S3_BUCKET;
        const region = process.env.NEXT_PUBLIC_S3_REGION;
        const prefix = process.env.NEXT_PUBLIC_S3_PREFIX || "";
        const normalizedPrefix = prefix === "" ? "" : prefix.endsWith("/") ? prefix : `${prefix}/`;

        const streamUrl = `https://${bucket}.s3.${region}.amazonaws.com/${normalizedPrefix}${encodeURIComponent(
            room
        )}-stream-live.m3u8`;

        console.log("🎥 Loading stream:", streamUrl);

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("✅ HLS manifest loaded");
                video.play().catch((e) => console.warn("play prevented:", e));
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("❌ HLS error:", data);
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl;
        } else {
            console.error("❌ HLS not supported in this browser");
        }
    }, [room]);

    return (
        <Box
            sx={{
                bgcolor: "#0f0d16",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
            }}
        >
            <Typography variant="h5" sx={{ color: "#fff", mb: 3 }}>
                Watching Live Room: {room}
            </Typography>

            <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                style={{
                    width: "80%",
                    maxWidth: "900px",
                    borderRadius: 12,
                    border: "2px solid #444",
                    background: "#000",
                }}
            />

            <Typography sx={{ color: "#aaa", mt: 2, fontSize: 14 }}>
                If video doesn't start, check your S3 playlist URL and permissions.
            </Typography>
        </Box>
    );
}
