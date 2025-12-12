
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    followupResponse: [],
    currentParentQuestion: null,
    parentQuestionLogs: {},
    interviewLogs: [],
    isFollowUpMode: false,
    allFollowUps: [],
};

const interviewSlice = createSlice({
    name: 'interview',
    initialState,
    reducers: {
        // Add parent question (index 0)
        addParentQuestion: (state, action) => {
            const { questionIndex, question, answer, quesType, language } = action.payload;
            const parentKey = `Q${questionIndex + 1}`;

            console.log(`📌 Redux: Adding Parent ${parentKey} (Index 0)`);

            // Initialize parent question log with space for 4 items (0-3)
            if (!state.parentQuestionLogs[parentKey]) {
                state.parentQuestionLogs[parentKey] = new Array(4); // Index 0, 1, 2, 3
            }

            // Add parent question as index 0
            state.parentQuestionLogs[parentKey][0] = {
                index: 0,
                type: 'parent',
                question,
                candiAnswer: answer,
                quesType,
                language: quesType === "coding" ? language : null,
                timestamp: new Date().toISOString(),
            };

            // Add to interview logs
            state.interviewLogs.push({
                parent: parentKey,
                index: 0,
                type: 'parent',
                question,
                answer,
                quesType,
                timestamp: new Date().toISOString(),
            });

            // Set follow-up mode
            state.isFollowUpMode = true;
            state.currentParentQuestion = questionIndex;

            console.log(`🚀 Entering follow-up mode for ${parentKey}`);
        },

        // Add follow-up question (index 1, 2, or 3)
        addFollowUpQuestion: (state, action) => {
            const { questionIndex, followUpIndex, question, answer, quesType, language } = action.payload;
            const parentKey = `Q${questionIndex + 1}`;

            // followUpIndex is 0-based from frontend: 0 = follow-up 1, 1 = follow-up 2, 2 = follow-up 3
            // For storage: index 1 = follow-up 1, index 2 = follow-up 2, index 3 = follow-up 3
            const storageIndex = followUpIndex + 1;
            const displayIndex = storageIndex; // 1, 2, or 3

            console.log(`➕ Redux: Adding Follow-up ${displayIndex} to ${parentKey} (storage index: ${storageIndex})`);

            // Ensure parent exists and has space for follow-ups
            if (!state.parentQuestionLogs[parentKey]) {
                state.parentQuestionLogs[parentKey] = new Array(4); // Index 0-3
                console.warn(`⚠️ Parent ${parentKey} not found, creating it`);
            }

            // Add follow-up at correct index (1, 2, or 3)
            state.parentQuestionLogs[parentKey][storageIndex] = {
                index: displayIndex,
                type: 'follow-up',
                question,
                candiAnswer: answer,
                quesType,
                language: quesType === "coding" ? language : null,
                timestamp: new Date().toISOString(),
                originalFollowUpIndex: followUpIndex, // Keep original 0-based index
            };

            // Add to interview logs
            state.interviewLogs.push({
                parent: parentKey,
                index: displayIndex,
                type: 'follow-up',
                question,
                answer,
                quesType,
                timestamp: new Date().toISOString(),
            });

            // Track in allFollowUps array
            state.allFollowUps.push({
                parentKey,
                followUpIndex: displayIndex,
                question,
                answer,
                timestamp: new Date().toISOString(),
            });

            console.log(`✅ Follow-up ${displayIndex} added to ${parentKey}`);
        },

        // Save current answer to followupResponse (for AI API) - UPDATED
        // In interviewSlice.js
        addToFollowupResponse: (state, action) => {
            const { question, candiAnswer, quesType, language, followUpIndex } = action.payload;

            console.log(`📝 Redux: Adding to followupResponse (followUpIndex: ${followUpIndex})`);

            // Create a copy of the array
            const newFollowupResponse = [...state.followupResponse];

            // Set at the specific index
            newFollowupResponse[followUpIndex] = {
                question,
                candiAnswer,
                quesType,
                language: quesType === "coding" ? language : null,
                followUpIndex,
                timestamp: new Date().toISOString(),
            };

            // Filter out undefined/null items
            state.followupResponse = newFollowupResponse.filter(item => item !== undefined && item !== null);

            // Ensure proper order
            state.followupResponse.sort((a, b) => a.followUpIndex - b.followUpIndex);

            console.log(`📊 Redux: followupResponse now has ${state.followupResponse.length} items`);
            console.log(`Indices: ${state.followupResponse.map(item => item.followUpIndex).join(', ')}`);
        },

        clearFollowupResponse: (state) => {
            console.log("🧹 Redux: Clearing followupResponse for new parent question");
            state.followupResponse = [];
            state.isFollowUpMode = false;
            state.allFollowUps = [];
            console.log("✅ followupResponse cleared, exiting follow-up mode");
        },

        setCurrentParentQuestion: (state, action) => {
            const newIndex = action.payload;
            console.log(`📌 Redux: Setting current parent to Q${newIndex + 1}`);
            state.currentParentQuestion = newIndex;
            state.isFollowUpMode = true; // Enter follow-up mode for this parent
        },

        // Log parent question completion
        logParentCompletion: (state, action) => {
            const { questionIndex, questionText, followUpCount } = action.payload;
            const parentKey = `Q${questionIndex + 1}`;

            console.log(`✅ Redux: Parent ${parentKey} completed`);
            console.log(`   Question: ${questionText?.substring(0, 50)}...`);

            // Count actual filled slots (0-3)
            const filledSlots = state.parentQuestionLogs[parentKey]?.filter(item => item !== undefined).length || 0;
            console.log(`   Total filled slots: ${filledSlots} (0=parent, 1-3=follow-ups)`);
            console.log(`   Expected follow-ups: ${followUpCount}`);

            // Don't exit follow-up mode here - let frontend handle it
            console.log(`📊 Current state for ${parentKey}:`);
            if (state.parentQuestionLogs[parentKey]) {
                for (let i = 0; i < 4; i++) {
                    if (state.parentQuestionLogs[parentKey][i]) {
                        const type = i === 0 ? 'PARENT' : `FOLLOW-UP ${i}`;
                        console.log(`   [${i}] ${type}: ${state.parentQuestionLogs[parentKey][i].question?.substring(0, 50)}...`);
                    }
                }
            }
        },

        // Save last question before interview ends
        saveLastQuestion: (state, action) => {
            const { questionIndex, isInFollowUp, followUpIndex, question, answer, quesType, language } = action.payload;

            const parentKey = `Q${questionIndex + 1}`;

            if (!isInFollowUp) {
                // This is a parent question
                console.log(`💾 Redux: Saving last parent question ${parentKey}`);

                if (!state.parentQuestionLogs[parentKey]) {
                    state.parentQuestionLogs[parentKey] = new Array(4);
                }

                state.parentQuestionLogs[parentKey][0] = {
                    index: 0,
                    type: 'parent',
                    question,
                    candiAnswer: answer,
                    quesType,
                    language: quesType === "coding" ? language : null,
                    timestamp: new Date().toISOString(),
                };

                state.interviewLogs.push({
                    parent: parentKey,
                    index: 0,
                    type: 'parent',
                    question,
                    answer,
                    quesType,
                    timestamp: new Date().toISOString(),
                });
            } else {
                // This is a follow-up
                const storageIndex = followUpIndex + 1;
                const displayIndex = storageIndex;

                console.log(`💾 Redux: Saving last follow-up ${displayIndex} of ${parentKey}`);

                if (!state.parentQuestionLogs[parentKey]) {
                    state.parentQuestionLogs[parentKey] = new Array(4);
                }

                state.parentQuestionLogs[parentKey][storageIndex] = {
                    index: displayIndex,
                    type: 'follow-up',
                    question,
                    candiAnswer: answer,
                    quesType,
                    language: quesType === "coding" ? language : null,
                    timestamp: new Date().toISOString(),
                    originalFollowUpIndex: followUpIndex,
                };

                state.interviewLogs.push({
                    parent: parentKey,
                    index: displayIndex,
                    type: 'follow-up',
                    question,
                    answer,
                    quesType,
                    timestamp: new Date().toISOString(),
                });
            }
        },

        // Clear all data
        clearInterviewData: (state) => {
            console.log("🎯 Redux: Final Interview Log");
            console.log("========= REDUX FINAL LOG =========");

            // Log all parent questions with proper indexing (0-3)
            Object.keys(state.parentQuestionLogs).sort().forEach(parentKey => {
                console.log(`\n${parentKey}:`);
                const logs = state.parentQuestionLogs[parentKey];

                // Parent question (index 0)
                if (logs && logs[0]) {
                    console.log(`  [0] PARENT: ${logs[0].question?.substring(0, 50)}...`);
                    console.log(`      Answer: ${logs[0].candiAnswer?.substring(0, 50)}...`);
                } else {
                    console.log(`  [0] PARENT: MISSING`);
                }

                // Follow-ups (index 1, 2, 3)
                for (let i = 1; i <= 3; i++) {
                    if (logs && logs[i]) {
                        console.log(`  [${i}] FOLLOW-UP ${i}: ${logs[i].question?.substring(0, 50)}...`);
                        console.log(`        Answer: ${logs[i].candiAnswer?.substring(0, 50)}...`);
                        console.log(`        Type: ${logs[i].quesType}, AI: ${logs[i].isAIGenerated || false}`);
                    } else {
                        console.log(`  [${i}] FOLLOW-UP ${i}: EMPTY`);
                    }
                }
            });

            console.log("\n========= FOLLOWUP RESPONSE =========");
            console.log(`Items in followupResponse: ${state.followupResponse.length}`);
            state.followupResponse.forEach((item, idx) => {
                const type = item.followUpIndex === 0 ? 'PARENT' : `FOLLOW-UP ${item.followUpIndex}`;
                console.log(`  [${idx}] ${type}: ${item.question?.substring(0, 50)}...`);
            });

            console.log("\n========= SUMMARY =========");
            console.log(`Total parent questions: ${Object.keys(state.parentQuestionLogs).length}`);
            console.log(`Total interview logs: ${state.interviewLogs.length}`);
            console.log(`Total follow-ups in allFollowUps: ${state.allFollowUps.length}`);
            console.log(`Current follow-up mode: ${state.isFollowUpMode}`);
            console.log(`Current parent: Q${state.currentParentQuestion + 1}`);
            console.log("============================");

            // Reset state
            state.followupResponse = [];
            state.currentParentQuestion = null;
            state.parentQuestionLogs = {};
            state.interviewLogs = [];
            state.isFollowUpMode = false;
            state.allFollowUps = [];
        },
    },
});

export const {
    addParentQuestion,
    addFollowUpQuestion,
    addToFollowupResponse,
    clearFollowupResponse,
    setCurrentParentQuestion,
    logParentCompletion,
    saveLastQuestion,
    clearInterviewData,
} = interviewSlice.actions;

export default interviewSlice.reducer;