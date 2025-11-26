"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Button, Typography, Paper } from "@mui/material";

export default function CheckPermissions() {
    const router = useRouter();
    const search = useSearchParams();
    const room = search.get("room");
    const name = search.get("name");

    const videoRef = useRef(null);
    const previewStreamRef = useRef(null);

    const [camOK, setCamOK] = useState(false);
    const [micOK, setMicOK] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        setChecking(true);

        try {
            // request and test stream
            const testStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            previewStreamRef.current = testStream;

            // attach video
            if (videoRef.current) {
                videoRef.current.srcObject = testStream;
                videoRef.current.play();
            }

            // check tracks
            const vtrack = testStream.getVideoTracks()[0];
            const atrack = testStream.getAudioTracks()[0];

            setCamOK(!!vtrack);
            setMicOK(!!atrack);

        } catch (err) {
            console.error("Permission check error:", err);
        }

        setChecking(false);
    };

    const stopPreviewStream = () => {
        try {
            if (previewStreamRef.current) {
                previewStreamRef.current.getTracks().forEach((t) => t.stop());
                previewStreamRef.current = null;
            }

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        } catch (err) {
            console.error("Preview stop error:", err);
        }
    };

    const goNext = () => {
        // Stop test camera/mic BEFORE going to room
        stopPreviewStream();

        router.push(`/stream/room/${room}?name=${name}`);
    };

    return (
        <Box
            sx={{
                bgcolor: "#0f0d16",
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
            }}
        >
            <Paper
                sx={{
                    p: 3,
                    width: 420,
                    bgcolor: "#1b1726",
                    borderRadius: 3,
                    boxShadow: "0px 0px 20px rgba(255,255,255,0.08)",
                }}
            >
                <Typography sx={{ color: "#fff", fontSize: 18, mb: 2 }}>
                    Camera & Microphone Check
                </Typography>

                {/* VIDEO PREVIEW */}
                <Paper
                    sx={{
                        height: 220,
                        overflow: "hidden",
                        borderRadius: 2,
                        bgcolor: "#000",
                        mb: 2,
                    }}
                >
                    <video
                        ref={videoRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                        muted
                        playsInline
                    />
                </Paper>

                <Typography sx={{ color: camOK ? "#00ff9d" : "red", mb: 1 }}>
                    {camOK ? "✔ Camera Detected" : "❌ Camera Not Working"}
                </Typography>

                <Typography sx={{ color: micOK ? "#00ff9d" : "red", mb: 2 }}>
                    {micOK ? "✔ Microphone Detected" : "❌ Microphone Not Working"}
                </Typography>

                <Button
                    variant="contained"
                    fullWidth
                    onClick={goNext}
                    disabled={!camOK || !micOK || checking}
                    sx={{
                        bgcolor: (!camOK || !micOK) ? "#444" : "#7b5de3",
                        "&:hover": { bgcolor: "#6a4eda" },
                        height: 42,
                    }}
                >
                    {checking ? "Checking..." : "Continue"}
                </Button>
            </Paper>
        </Box>
    );
}
