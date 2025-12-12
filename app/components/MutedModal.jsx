"use client";

import { useEffect } from 'react';
import { Box, Typography, Modal } from "@mui/material";

const MutedModal = ({ open, handleClose }) => {
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                handleClose();
            }, 5000); // Auto-close after 5 seconds if user doesn't speak
            return () => clearTimeout(timer);
        }
    }, [open, handleClose]);

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="muted-modal-title"
        >
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: 2,
                textAlign: 'center'
            }}>
                <Typography id="muted-modal-title" variant="h6" component="h2" gutterBottom>
                    🔇 Mic Not Detecting Speech
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Please speak louder or check your microphone. The system will auto-close when you start speaking.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Speak now to dismiss...
                </Typography>
            </Box>
        </Modal>
    );
};

export default MutedModal;

