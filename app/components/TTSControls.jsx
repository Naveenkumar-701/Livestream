"use client";

import React from 'react';
import { Box, Typography, IconButton, CircularProgress, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CloudIcon from '@mui/icons-material/Cloud';

const TTSControls = ({ 
    isTTSPlaying, 
    isReading, 
    isQuestionRead, 
    onReadQuestion,
    useGoogleAPI = true,
    onToggleAPI,
    disabled = false,
    compact = false,
    showStatus = true
}) => {
    const handleReadClick = () => {
        if (!disabled && !isTTSPlaying && !isReading) {
            onReadQuestion?.();
        }
    };

    if (compact) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {onToggleAPI && useGoogleAPI && (
                    <Tooltip title="Using Google TTS API">
                        <CloudIcon 
                            fontSize="small" 
                            sx={{ 
                                color: '#4285f4',
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.8 }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleAPI?.();
                            }}
                        />
                    </Tooltip>
                )}
                
                <IconButton
                    onClick={handleReadClick}
                    disabled={disabled || isTTSPlaying || isReading}
                    sx={{
                        color: isTTSPlaying || isReading ? '#ccc' : '#1976d2',
                        '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.04)'
                        }
                    }}
                    title="Replay question"
                    size="small"
                >
                    <VolumeUpIcon fontSize="small" />
                    {(isTTSPlaying || isReading) && (
                        <CircularProgress 
                            size={14} 
                            sx={{ 
                                position: 'absolute',
                                color: '#1976d2'
                            }} 
                        />
                    )}
                </IconButton>
                
                {showStatus && (isTTSPlaying || isReading) && (
                    <Typography sx={{ fontSize: '10px', color: '#1976d2', whiteSpace: 'nowrap' }}>
                        Reading...
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* {showStatus && (
                <>
                    {isTTSPlaying || isReading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CircularProgress size={16} sx={{ mr: 1, color: '#1976d2' }} />
                            <Typography sx={{ fontSize: '12px', color: '#1976d2' }}>
                                Reading question...
                            </Typography>
                        </Box>
                    ) : !isQuestionRead ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <VolumeUpIcon fontSize="small" sx={{ mr: 0.5, color: '#f57c00' }} />
                            <Typography sx={{ fontSize: '12px', color: '#f57c00' }}>
                                Click speaker to replay question
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <VolumeUpIcon fontSize="small" sx={{ mr: 0.5, color: '#4caf50' }} />
                            <Typography sx={{ fontSize: '12px', color: '#4caf50' }}>
                                Question ready
                            </Typography>
                        </Box>
                    )}
                </>
            )} */}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {onToggleAPI && (
                    <Tooltip title={useGoogleAPI ? "Using Google TTS API (Click to switch to Browser)" : "Using Browser TTS (Click to switch to Google API)"}>
                        <IconButton
                            onClick={onToggleAPI}
                            size="small"
                            sx={{
                                color: useGoogleAPI ? '#4285f4' : '#757575',
                                '&:hover': {
                                    backgroundColor: 'rgba(66, 133, 244, 0.04)'
                                }
                            }}
                        >
                            {/* <CloudIcon fontSize="small" /> */}
                        </IconButton>
                    </Tooltip>
                )}

                <IconButton
                    onClick={handleReadClick}
                    disabled={disabled || isTTSPlaying || isReading}
                    sx={{
                        color: isTTSPlaying || isReading ? '#ccc' : '#1976d2',
                        '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.04)'
                        }
                    }}
                    title="Replay question"
                    size="small"
                >
                    <VolumeUpIcon fontSize="small" />
                </IconButton>
            </Box>
        </Box>
    );
};

export default TTSControls;
