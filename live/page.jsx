"use client";
import React, { useEffect, useRef } from "react";
import Hls from "hls.js";
import { Box, Typography, TextField, Button } from "@mui/material";

export default function ViewStream() {
    const videoRef = useRef(null);
    const inputRef = useRef(null);

    // Example default URL (your S3 HLS link)
    const defaultStreamUrl =
        "https://recrootbucket.s3.ap-southeast-2.amazonaws.com/testvideos/room-18-stream-live.m3u8";

    const playStream = () => {
        const streamUrl = inputRef.current.value.trim();
        if (!streamUrl) return alert("Enter a valid .m3u8 URL");
        initPlayer(streamUrl);
    };

    const initPlayer = (url) => {
        if (!videoRef.current) return;

        if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true });
            hls.loadSource(url);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("🎬 HLS stream loaded");
                videoRef.current.play();
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("HLS error:", data);
            });
        } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
            // For Safari
            videoRef.current.src = url;
            videoRef.current.addEventListener("loadedmetadata", () => {
                videoRef.current.play();
            });
        } else {
            alert("HLS not supported in this browser");
        }
    };

    // Auto-load default stream
    useEffect(() => {
        initPlayer(defaultStreamUrl);
    }, []);

    return (
        <Box
            sx={{
                bgcolor: "#0f0d16",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
            }}
        >
            <Typography variant="h5" mb={3}>
                🎥 Live Stream Viewer
            </Typography>

            <video
                ref={videoRef}
                controls
                autoPlay
                style={{
                    width: "80%",
                    maxWidth: 800,
                    borderRadius: 12,
                    backgroundColor: "#000",
                }}
            />

            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    mt: 3,
                    width: "80%",
                    maxWidth: 800,
                }}
            >
                <TextField
                    fullWidth
                    inputRef={inputRef}
                    placeholder="Enter .m3u8 stream URL"
                    variant="outlined"
                    defaultValue={defaultStreamUrl}
                    InputProps={{
                        style: { color: "#fff", borderColor: "white" },
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: "white" },
                            "&:hover fieldset": { borderColor: "#ccc" },
                            "&.Mui-focused fieldset": { borderColor: "white" },
                        },
                    }}
                />
                <Button
                    variant="contained"
                    onClick={playStream}
                    sx={{
                        bgcolor: "#7b5de3",
                        "&:hover": { bgcolor: "#684ed1" },
                    }}
                >
                    Play
                </Button>
            </Box>
        </Box>
    );
}
