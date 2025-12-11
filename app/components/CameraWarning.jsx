import React from "react";
import { Modal, Box, Typography, IconButton, Button } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";

const CameraWarning = ({
    open,
    onClose,
    title = "Warning",
    message = "We can't detect you on camera. Please stay visible. If it happens again, your interview will be interrupted."
}) => {

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: { xs: "90%", sm: 400 },
                    bgcolor: "#fff",
                    borderRadius: "8px",
                    boxShadow: 24,
                    p: 2,
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                            sx={{
                                borderRadius: "4px",
                                width: "24px",
                                height: "24px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "#F0F1F4",
                            }}
                        >
                            <WarningAmberRoundedIcon sx={{ fontSize: 16 }} />
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{ fontSize: "16px", color: "#333" }}
                        >
                            {title}
                        </Typography>
                    </Box>

                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{ color: "#666666" }}
                    >
                        <HighlightOffRoundedIcon />
                    </IconButton>
                </Box>

                {/* Message */}
                <Typography
                    sx={{
                        mt: "16px",
                        color: "#333",
                        fontSize: "14px",
                        lineHeight: 1.5,
                    }}
                >
                    {message}
                </Typography>

                {/* Got It Button */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: "16px" }}>
                    <Button
                        onClick={onClose}
                        sx={{
                            backgroundColor: "#316BFF !important",
                            color: "#fff !important",
                            textTransform: "none",
                            minWidth: "120px",
                        }}
                    >
                        Got it
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default CameraWarning;