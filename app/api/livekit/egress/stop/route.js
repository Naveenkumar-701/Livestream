


// import { NextResponse } from "next/server";
// import { EgressClient } from "livekit-server-sdk";

// export async function POST(request) {
//     try {
//         const { egressId } = await request.json();

//         if (!egressId) {
//             return NextResponse.json({
//                 ok: false,
//                 error: "Missing egressId"
//             }, { status: 400 });
//         }

//         const client = new EgressClient(
//             process.env.LIVEKIT_HOST,
//             process.env.LIVEKIT_API_KEY,
//             process.env.LIVEKIT_API_SECRET
//         );

//         let info;

//         try {
//             // Try to stop egress normally
//             info = await client.stopEgress(egressId);

//         } catch (err) {

//             // ✔ If egress already completed → treat as success
//             if (err.code === "failed_precondition") {
//                 console.log(`⚠️ Egress ${egressId} already completed. (Nothing to stop)`);
//                 return NextResponse.json({
//                     ok: true,
//                     status: "already_completed"
//                 });
//             }

//             // Other errors → throw
//             throw err;
//         }

//         // ✔ Egress successfully stopped
//         return NextResponse.json({
//             ok: true,
//             status: info?.status || "stopped"
//         });

//     } catch (err) {
//         console.error("❌ Stop egress error:", err);
//         return NextResponse.json({
//             ok: false,
//             error: err.message
//         }, { status: 500 });
//     }
// }
