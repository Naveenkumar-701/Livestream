"use client";
import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function LiveVideoPlayer({ streamUrl }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (!streamUrl) return;
        const video = videoRef.current;

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl;
        } else if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else {
            console.error("HLS not supported in this browser.");
        }
    }, [streamUrl]);

    return (
        <div style={{ width: "100%", background: "#000", borderRadius: 10 }}>
            <video
                ref={videoRef}
                controls
                style={{ width: "100%", height: "auto", borderRadius: 10 }}
            />
        </div>
    );
}
