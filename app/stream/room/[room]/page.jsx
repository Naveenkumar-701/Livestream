
"use client";
import React, { useEffect, useRef, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
import { Box, Typography, Paper, TextField, Button } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";



const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_BASE = "/api/livekit";


export default function LiveRoom({ params }) {
    const { room } = use(params);
    const search = useSearchParams();
    const name = search.get("name") || "guest";

    const [viewerCount, setViewer] = useState(0);
    const [chat, setChat] = useState([]);
    const [msg, setMsg] = useState("");
    const [lkRoom, setLkRoom] = useState(null);
    const [egressId, setEgressId] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const videoRef = useRef(null);
    const joinedRef = useRef(false);

    /* ---------------------- NEW STATES FOR QUESTIONS ---------------------- */
    const questions = [
        "Tell me about yourself?",
        "What are your strengths?",
        "What is your biggest weakness?",
        "Where do you see yourself in 5 years?",
        "Why should we hire you?"
    ];

    const [showQuestions, setShowQuestions] = useState(false);
    const [qIndex, setQIndex] = useState(0);
    const [cameraHeight, setCameraHeight] = useState("80vh"); // default camera height
    /* ---------------------------------------------------------------------- */

    // SAFE STOP CAMERA/MIC/SCREEN
    const stopAllTracks = () => {
        try {
            if (!lkRoom || !lkRoom.localParticipant) return;

            lkRoom.localParticipant.tracks?.forEach(pub => {
                try { pub.track?.stop(); } catch {}
            });

            lkRoom.localParticipant.videoTracks?.forEach(pub => {
                try { pub.track?.mediaStreamTrack?.stop(); } catch {}
            });

            lkRoom.localParticipant.audioTracks?.forEach(pub => {
                try { pub.track?.mediaStreamTrack?.stop(); } catch {}
            });

            lkRoom.localParticipant.tracks?.forEach(pub => {
                if (pub.source === "screen_share") {
                    try { pub.track?.mediaStreamTrack?.stop(); } catch {}
                }
            });

        } catch (e) {
            console.error("stop error:", e);
        }
    };

    useEffect(() => {
        if (!room || joinedRef.current) return;
        joinedRef.current = true;

        joinRoom(room);

        return () => {
            try {
                stopAllTracks();
                lkRoom?.disconnect();
            } catch {}
        };
    }, [room]);

    // SCREEN SHARE (unchanged)
    const startScreenShare = async (roomObj) => {
    try {
        // First, check if getDisplayMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            console.error("❌ Screen sharing not supported");
            return;
        }

        // Create a custom media track constraint to prefer entire screen
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always",
                displaySurface: "monitor" // This prefers entire screen
            },
            audio: false,
            // This is the key - it tries to restrict to monitor/entire screen
            selfBrowserSurface: "exclude",
            systemAudio: "exclude",
            surfaceSwitching: "exclude"
        });

        // Check if user selected entire screen
        const videoTrack = screenStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        
        console.log("🖥️ Screen share settings:", settings);

        // If user didn't select entire screen, show warning and stop
        if (settings.displaySurface !== "monitor") {
            // Stop the track immediately
            videoTrack.stop();
            
            // Show alert to user
            alert("Please share your ENTIRE SCREEN only. Tab and Window sharing are not allowed.");
            
            // Retry screen share
            setTimeout(() => startScreenShare(roomObj), 1000);
            return;
        }

        const screenTrack = new LocalVideoTrack(videoTrack);

        // Handle when user stops screen share
        videoTrack.onended = () => {
            console.log("🖥️ Screen share ended by user");
            // You can add retry logic here if needed
        };

        await roomObj.localParticipant.publishTrack(screenTrack);
        console.log("🖥️ Full Screen Share Published - Entire Screen Only");

    } catch (err) {
        console.error("❌ Screen share error:", err);
        
        // If it's a NotAllowedError, user denied screen share
        if (err.name === "NotAllowedError") {
            console.log("User denied screen share permission");
        } else {
            // Retry after 2 seconds for other errors
            setTimeout(() => startScreenShare(roomObj), 2000);
        }
    }
};

    // JOIN ROOM
    const joinRoom = async (roomName) => {
        const tokenRes = await fetch(`${API_BASE}/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName, identity: name }),
        });
        const { token } = await tokenRes.json();

        const r = new Room();
        await r.connect(LIVEKIT_WS, token);
        setLkRoom(r);

        const gum = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        const [v] = gum.getVideoTracks();
        const [a] = gum.getAudioTracks();

        const vTrack = new LocalVideoTrack(v);
        const aTrack = new LocalAudioTrack(a);

        attach(vTrack, videoRef.current);

        await r.localParticipant.publishTrack(vTrack);
        await r.localParticipant.publishTrack(aTrack);

        await startScreenShare(r);

        await startEgress(roomName);

        const updateCount = () => setViewer(r.participants.size + 1);
        r.on("participantConnected", updateCount);
        r.on("participantDisconnected", updateCount);
        updateCount();

        r.on("dataReceived", (payload, p) => {
            const text = new TextDecoder().decode(payload);
            setChat(c => [...c, { from: p.identity || "anon", text }]);
        });
    };

    const attach = (track, el) => {
        const node = track.attach();
        node.muted = true;
        node.playsInline = true;
        node.style.width = "100%";
        node.style.height = "100%";
        node.style.objectFit = "cover";
        el.innerHTML = "";
        el.appendChild(node);
    };

    // START EGRESS — ADD QUESTION LOGIC HERE
    const startEgress = async (roomName) => {
        const res = await fetch(`${API_BASE}/egress/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName }),
        });

        const j = await res.json();

        if (j.ok) {
            setEgressId(j.egressId);
            setIsStreaming(true);

            // SHOW QUESTIONS + REDUCE CAMERA HEIGHT
            setShowQuestions(true);
            setQIndex(0);
            setCameraHeight("65vh");
        }
    };

    // NEXT QUESTION
    const nextQuestion = () => {
        if (qIndex < questions.length - 1) {
            setQIndex(qIndex + 1);
        } else {
            // All done → hide questions + full camera height
            setShowQuestions(false);
            setCameraHeight("80vh");
        }
    };

    // STOP STREAM
    const stopEgress = async () => {
        if (!egressId) return;

        stopAllTracks();

        await fetch(`${API_BASE}/egress/stop`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ egressId }),
        });

        setIsStreaming(false);
        try { lkRoom?.disconnect(); } catch {}
        alert("Live Stopped Successfully!");
    };

    const sendMsg = () => {
        if (!msg.trim() || !lkRoom) return;

        const d = new TextEncoder().encode(msg.trim());
        lkRoom.localParticipant.publishData(d, 1);

        setChat(c => [...c, { from: "You", text: msg }]);
        setMsg("");
    };

    return (
        <Box sx={{ display: "flex", height: "100vh", bgcolor: "#0b0810" }}>

            <Box sx={{ flex: 1, p: 2 }}>

                {/* TOP HEADER */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography sx={{ color: "#fff", fontWeight: 700 }}>{room}</Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {isStreaming ? (
                            <Button variant="contained" color="error" onClick={stopEgress} sx={{ bgcolor: "#ff3b3b" }}>
                                Stop Live
                            </Button>
                        ) : (
                            <Typography sx={{ color: "#aaa" }}>Stream stopped</Typography>
                        )}

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                bgcolor: isStreaming ? "red" : "gray",
                                animation: isStreaming ? "blink 1s infinite" : "none"
                            }} />
                            <Typography sx={{ color: "#fff" }}>
                                {isStreaming ? "LIVE" : "OFF"}
                            </Typography>
                            <VisibilityIcon fontSize="small" sx={{ color: "#fff" }} />
                            <Typography sx={{ color: "#fff" }}>{viewerCount}</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* ⭐ QUESTION BOX ABOVE CAMERA ⭐ */}
                {showQuestions && (
                    <Box sx={{
                        bgcolor: "#1e1628",
                        color: "#fff",
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 16,
                        fontWeight: 600
                    }}>
                        <Typography>{questions[qIndex]}</Typography>

                        <Button
                            variant="contained"
                            sx={{ bgcolor: "#6f5bd4" }}
                            onClick={nextQuestion}
                        >
                            Next
                        </Button>
                    </Box>
                )}

                {/* CAMERA WINDOW */}
                <Paper sx={{ height: cameraHeight, transition: "height .4s", overflow: "hidden", bgcolor: "#000" }}>
                    <div ref={videoRef} style={{ width: "100%", height: "100%" }} />
                </Paper>
            </Box>

            {/* CHAT */}
            <Box sx={{ width: 360, borderLeft: "1px solid #241f31", p: 2 }}>
                <Typography sx={{ color: "#fff", mb: 1 }}>Live Chat</Typography>

                <Paper sx={{ height: "70vh", overflowY: "auto", p: 2, bgcolor: "#1e1628" }}>
                    {chat.map((m, i) => (
                        <Box key={i} sx={{ mb: 1, display: "flex" }}>
                            <Typography sx={{ fontSize: 14, color: "#f3f3f3", fontWeight: 600, minWidth: 40 }}>
                                {m.from}:
                            </Typography>
                            <Typography sx={{ fontSize: 14, color: "#ddd" }}>{m.text}</Typography>
                        </Box>
                    ))}
                </Paper>

                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <TextField
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="Say something..."
                        inputProps={{ style: { color: "#fff" } }}
                    />
                    <Button variant="contained" onClick={sendMsg}>SEND</Button>
                </Box>
            </Box>

            <style jsx global>{`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Box>
    );
}
