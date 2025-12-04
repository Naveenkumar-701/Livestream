
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    followupResponse: [],
    currentParentQuestion: null,
    allFollowUps: [],
    isFollowUpMode: false,
    parentQuestionLogs: {},
};

// features/interview/interviewSlice.js (or in your file)
const interviewSlice = createSlice({
    name: 'interview',
    initialState: {
        followupResponse: [],
        currentParentQuestion: null,
        parentQuestionLogs: {},
        interviewLogs: [], // New: stores all Q&A with proper indexing
    },
    reducers: {
        // Add parent question (index 0)
        addParentQuestion: (state, action) => {
            const { questionIndex, question, answer, quesType, language } = action.payload;
            const parentKey = `Q${questionIndex + 1}`;

            console.log(`📌 Redux: Adding Parent ${parentKey} (Index 0)`);

            // Initialize parent question log
            if (!state.parentQuestionLogs[parentKey]) {
                state.parentQuestionLogs[parentKey] = [];
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
        },

        // Add follow-up question
        addFollowUpQuestion: (state, action) => {
            const { questionIndex, followUpIndex, question, answer, quesType, language } = action.payload;
            const parentKey = `Q${questionIndex + 1}`;
            const followUpNum = followUpIndex + 1; // Convert to 1-based for display

            console.log(`➕ Redux: Adding Follow-up ${followUpNum} to ${parentKey}`);

            // Ensure parent exists
            if (!state.parentQuestionLogs[parentKey]) {
                state.parentQuestionLogs[parentKey] = [];
                console.warn(`⚠️ Parent ${parentKey} not found, creating it`);
            }

            // Add follow-up (follow-up index starts from 1)
            state.parentQuestionLogs[parentKey][followUpNum] = {
                index: followUpNum,
                type: 'follow-up',
                question,
                candiAnswer: answer,
                quesType,
                language: quesType === "coding" ? language : null,
                timestamp: new Date().toISOString(),
            };

            // Add to interview logs
            state.interviewLogs.push({
                parent: parentKey,
                index: followUpNum,
                type: 'follow-up',
                question,
                answer,
                quesType,
                timestamp: new Date().toISOString(),
            });
        },

        // Save current answer to followupResponse (for AI API)
        addToFollowupResponse: (state, action) => {
            const { question, candiAnswer, quesType, language, followUpIndex } = action.payload;

            const shouldClear =
                state.followupResponse.length >= 3 ||
                (state.followupResponse.length > 0 &&
                    state.followupResponse[state.followupResponse.length - 1].candiAnswer === "");

            if (shouldClear) {
                console.log("🔄 Redux: Clearing followupResponse array");
                state.followupResponse = [{
                    question,
                    candiAnswer,
                    quesType,
                    language: quesType === "coding" ? language : null,
                    followUpIndex,
                    timestamp: new Date().toISOString(),
                }];
            } else {
                state.followupResponse.push({
                    question,
                    candiAnswer,
                    quesType,
                    language: quesType === "coding" ? language : null,
                    followUpIndex,
                    timestamp: new Date().toISOString(),
                });
            }
        },

        clearFollowupResponse: (state) => {
            console.log("🧹 Redux: Clearing followupResponse");
            state.followupResponse = [];
        },

        setCurrentParentQuestion: (state, action) => {
            const newIndex = action.payload;
            console.log(`📌 Redux: Setting current parent to Q${newIndex + 1}`);
            state.currentParentQuestion = newIndex;
        },

        // Log parent question completion
        logParentCompletion: (state, action) => {
            const { questionIndex, questionText, followUpCount } = action.payload;
            const parentKey = `Q${questionIndex + 1}`;

            console.log(`✅ Redux: Parent ${parentKey} completed`);
            console.log(`   Question: ${questionText?.substring(0, 50)}...`);
            console.log(`   Total entries (including parent): ${state.parentQuestionLogs[parentKey]?.length || 0}`);
        },

        // Save last question before interview ends
        saveLastQuestion: (state, action) => {
            const { questionIndex, isInFollowUp, followUpIndex, question, answer, quesType, language } = action.payload;

            const parentKey = `Q${questionIndex + 1}`;

            if (!isInFollowUp) {
                // This is a parent question
                console.log(`💾 Redux: Saving last parent question ${parentKey}`);

                if (!state.parentQuestionLogs[parentKey]) {
                    state.parentQuestionLogs[parentKey] = [];
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
                const followUpNum = followUpIndex + 1;
                console.log(`💾 Redux: Saving last follow-up ${followUpNum} of ${parentKey}`);

                if (!state.parentQuestionLogs[parentKey]) {
                    state.parentQuestionLogs[parentKey] = [];
                }

                state.parentQuestionLogs[parentKey][followUpNum] = {
                    index: followUpNum,
                    type: 'follow-up',
                    question,
                    candiAnswer: answer,
                    quesType,
                    language: quesType === "coding" ? language : null,
                    timestamp: new Date().toISOString(),
                };

                state.interviewLogs.push({
                    parent: parentKey,
                    index: followUpNum,
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

            // Log all parent questions with proper indexing
            Object.keys(state.parentQuestionLogs).forEach(parentKey => {
                console.log(`\n${parentKey}:`);
                const logs = state.parentQuestionLogs[parentKey];

                // Parent question (index 0)
                if (logs[0]) {
                    console.log(`  [0] PARENT: ${logs[0].question?.substring(0, 50)}...`);
                    console.log(`      Answer: ${logs[0].candiAnswer?.substring(0, 50)}...`);
                }

                // Follow-ups (index 1, 2, 3...)
                for (let i = 1; i <= 3; i++) {
                    if (logs[i]) {
                        console.log(`  [${i}] FOLLOW-UP ${i}: ${logs[i].question?.substring(0, 50)}...`);
                        console.log(`        Answer: ${logs[i].candiAnswer?.substring(0, 50)}...`);
                    }
                }
            });

            console.log("\nTotal interview logs:", state.interviewLogs.length);
            console.log("Total parent questions:", Object.keys(state.parentQuestionLogs).length);

            // Also log raw data for debugging
            console.log("\n========= RAW DATA =========");
            state.interviewLogs.forEach((log, idx) => {
                console.log(`Log ${idx + 1}: Parent ${log.parent}, Index ${log.index}, Type: ${log.type}`);
                console.log(`  Q: ${log.question?.substring(0, 50)}...`);
                console.log(`  A: ${log.answer?.substring(0, 50)}...`);
            });
            console.log("============================");

            // Reset state
            state.followupResponse = [];
            state.currentParentQuestion = null;
            state.parentQuestionLogs = {};
            state.interviewLogs = [];
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