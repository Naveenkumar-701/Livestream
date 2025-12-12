"use client";

import React, { useMemo } from "react";
import { Box } from "@mui/material";

export default function ProgressBar({
    totalQuestions = 0,
    qIndex = 0,
    isInFollowUp = false,
    currentFollowUpIndex = 0,
}) {
    const percent = useMemo(() => {
        if (!totalQuestions) return 0;

        const numerator = qIndex + (isInFollowUp ? currentFollowUpIndex : 0) + 1;
        return Math.min(100, Math.max(0, Math.round((numerator / totalQuestions) * 100)));
    }, [totalQuestions, qIndex, isInFollowUp, currentFollowUpIndex]);

    return (
        <Box
            sx={{
                width: "100%",
                height: "32px",
                background: "#EEF2FF",
                borderRadius: "8px",
                position: "relative",
                overflow: "visible", 
            }}
        >
            {/* Filled progress */}
            <Box
                sx={{
                    width: `${percent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #2F6BFF 0%, #3EA0FF 60%)",
                    borderRadius: "8px",
                    transition: "width 0.5s ease",
                }}
            />

            {/* Floating percentage badge */}
          <Box
    sx={{
        position: "absolute",
        top: "4px",
        left: `calc(${percent}% - 22px)`,
        transform: "translateX(-50%)",
        width: "40px",
        height: "24px",
        borderRadius: "4px",
        border: "1px solid #2F6BFF",
        background: "#D5E1FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 2px 6px rgba(0,0,0,0.10)",
        transition: "left 0.4s ease",
        zIndex: 10,

        fontFamily: `"IBM Plex Sans", sans-serif`,
        fontWeight: 500,
        fontStyle: "normal",
        fontSize: "14px",
        lineHeight: "20px",
        letterSpacing: "0px",

        color: "#060606FF",
    }}
>
    {percent}%
</Box>



        </Box>
    );
}
