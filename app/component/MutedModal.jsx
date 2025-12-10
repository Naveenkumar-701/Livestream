// "use client";
// import React from "react";
// import { Box, Dialog, DialogContent, IconButton, Typography } from "@mui/material";
// import Image from "next/image";
// import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// function MutedModal({ open, handleClose }) {
//   return (
//     <Box>
//       <Dialog
//         open={open}
//         PaperProps={{
//           sx: {
//             borderRadius: "24px",
//             position: "relative",
//             zIndex: 1300,
//             padding: "20px",
//           },
//         }}
//         aria-labelledby="alert-dialog-title"
//         aria-describedby="alert-dialog-description"
//       >
//         {/* <Image
//           src={"/images/interview-green-curved-design.png"}
//           alt=""
//           height={150}
//           width={150}
//           style={{
//             position: "absolute",
//             top: 0,
//             right: 0,
//             zIndex: -1,
//             opacity: 0.8,
//             transform: "rotate(90deg)",
//           }}
//         />
//         <Image
//           src={"/images/interview-green-curved-design.png"}
//           alt=""
//           height={150}
//           width={150}
//           style={{
//             position: "absolute",
//             bottom: 0,
//             left: 0,
//             zIndex: -1,
//             opacity: 0.8,
//             transform: "rotate(-90deg)",
//           }}
//         /> */}

//         <DialogContent
//           sx={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             gap: { xs: "20px", sm: "15px" },
//             width: { md: "400px", sm: "100%" },
//             height: "200px",
//           }}
//         >
//           <Typography
//             sx={{
//               fontWeight: 800,
//               fontSize: "22px",
//               fontFamily: '"IBM Plex Sans", sans-serif',
//               textAlign: "center",
//             }}
//           >
//             Muted
//           </Typography>
//           <Typography sx={{ mt: "20px", textAlign: "center" }}>
//             Your microphone is muted. Please unmute to continue.
//           </Typography>
//         </DialogContent>
//       </Dialog>
//     </Box>
//   );
// }

// export default MutedModal;


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