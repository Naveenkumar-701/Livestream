"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    CircularProgress,
} from "@mui/material";

export default function CreateStream() {
    const [roomName, setRoom] = useState(`room-${Math.floor(Math.random() * 1000)}`);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = () => {
        if (!name.trim()) return alert("Enter your name");
        setLoading(true);

        // Simulate small delay for smooth UX
        setTimeout(() => {
            router.push(
                // `/stream/room/${encodeURIComponent(roomName)}?name=${encodeURIComponent(name)}`
                `/stream/check-permissions?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(name)}`
            );
            setLoading(false);
        }, 1000);
    };

    return (
        <Box
            sx={{
                bgcolor: "#0f0d16",
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Paper
                sx={{
                    bgcolor: "#1b1726",
                    p: 4,
                    width: 400,
                    borderRadius: 3,
                    boxShadow: "0px 0px 20px rgba(255,255,255,0.05)",
                }}
            >
                <Typography variant="h6" color="white" mb={2}>
                    Create new stream
                </Typography>

                {/* Room Name */}
                <Typography sx={{ color: "#bbb" }}>Room name</Typography>
                <TextField
                    value={roomName}
                    onChange={(e) => setRoom(e.target.value)}
                    fullWidth
                    sx={{
                        my: 1,
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: "white" },
                            "&:hover fieldset": { borderColor: "#ccc" },
                            "&.Mui-focused fieldset": { borderColor: "white" },
                        },
                    }}
                    inputProps={{ style: { color: "white" } }}
                />

                {/* Your Name */}
                <Typography sx={{ color: "#bbb" }}>Your name</Typography>
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    sx={{
                        my: 1,
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: "white" },
                            "&:hover fieldset": { borderColor: "#ccc" },
                            "&.Mui-focused fieldset": { borderColor: "white" },
                        },
                    }}
                    inputProps={{ style: { color: "white" } }}
                />

                {/* Create Button */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleCreate}
                        disabled={loading}
                        sx={{
                            bgcolor: "#7b5de3",
                            "&:hover": { bgcolor: "#684ed1" },
                            minWidth: 100,
                            height: 40,
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={24} sx={{ color: "white" }} />
                        ) : (
                            "Create"
                        )}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
