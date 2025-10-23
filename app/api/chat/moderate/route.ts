import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { spawn } from "child_process";
import path from "path";

export async function POST(request: NextRequest) {
  console.log("🔍 [MODERATION] Starting moderation check");

  try {
    const supabaseServer = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      console.log("❌ [MODERATION] Authentication failed:", authError?.message);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("✅ [MODERATION] User authenticated:", user.id);

    const { message, conversation_id } = await request.json();
    console.log(
      "📝 [MODERATION] Message to moderate:",
      message?.substring(0, 50) + "..."
    );

    if (!message || typeof message !== "string") {
      console.log("❌ [MODERATION] Invalid message format");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if moderation is disabled
    if (process.env.DISABLE_MODERATION === "true") {
      console.log(
        "⚠️ [MODERATION] Moderation disabled via environment variable"
      );
      return NextResponse.json({
        allowed: true,
        action: "ALLOW",
        warnings: 0,
        reason: "Moderation disabled",
      });
    }

    // Check if Google API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      console.log("❌ [MODERATION] GOOGLE_API_KEY not configured");
      return NextResponse.json({
        allowed: true,
        action: "ALLOW",
        warnings: 0,
        reason: "Moderation not configured",
      });
    }

    console.log(
      "🔑 [MODERATION] API key configured, length:",
      process.env.GOOGLE_API_KEY.length
    );

    // Get user's current warning count
    console.log("📊 [MODERATION] Getting warning count for user:", user.id);
    const { data: warningCount, error: countError } = await supabaseServer.rpc(
      "get_user_warning_count",
      { user_uuid: user.id }
    );

    if (countError) {
      console.error("❌ [MODERATION] Error getting warning count:", countError);
      // Continue with moderation even if count fails
    }

    const currentWarnings = warningCount || 0;
    console.log("📊 [MODERATION] Current warnings:", currentWarnings);

    // If user already has 3+ warnings, block immediately
    if (currentWarnings >= 3) {
      console.log(
        "🚫 [MODERATION] User has max warnings, blocking immediately"
      );
      return NextResponse.json({
        allowed: false,
        action: "STOP",
        warnings: currentWarnings,
        reason: "Maximum warnings exceeded (3/3)",
      });
    }

    // Run Python moderation service
    console.log("🐍 [MODERATION] Calling Python moderation service...");
    const moderationResult = await runModeration(message, user.id);
    console.log("🐍 [MODERATION] Python service result:", moderationResult);

    // Handle moderation result
    if (moderationResult.action === "STOP") {
      console.log("🚫 [MODERATION] Message blocked (STOP)");
      // Log the violation
      await logModerationWarning(
        supabaseServer,
        user.id,
        conversation_id,
        message,
        "STOP",
        moderationResult.reason
      );

      return NextResponse.json({
        allowed: false,
        action: "STOP",
        warnings: currentWarnings,
        reason: moderationResult.reason,
      });
    }

    if (moderationResult.action === "WARN") {
      console.log("⚠️ [MODERATION] Message blocked (WARN)");
      // Log the warning
      await logModerationWarning(
        supabaseServer,
        user.id,
        conversation_id,
        message,
        "WARN",
        moderationResult.reason
      );

      const newWarningCount = currentWarnings + 1;
      console.log("📊 [MODERATION] New warning count:", newWarningCount);

      // Check if user should be banned after this warning
      const { data: shouldBan, error: banError } = await supabaseServer.rpc(
        "ban_user_after_warnings",
        { p_user_id: user.id }
      );

      if (banError) {
        console.error("❌ [MODERATION] Error checking ban status:", banError);
      } else if (shouldBan) {
        console.log("🚫 [MODERATION] User banned after 3 warnings");
        return NextResponse.json({
          allowed: false,
          action: "BANNED",
          warnings: newWarningCount,
          reason:
            "You have been banned from the platform after receiving 3 warnings",
        });
      }

      return NextResponse.json({
        allowed: false,
        action: "WARN",
        warnings: newWarningCount,
        reason: moderationResult.reason,
      });
    }

    // ALLOW - message is fine
    console.log("✅ [MODERATION] Message allowed (ALLOW)");
    return NextResponse.json({
      allowed: true,
      action: "ALLOW",
      warnings: currentWarnings,
      reason: moderationResult.reason,
    });
  } catch (error: any) {
    console.error("💥 [MODERATION] API error:", error);

    // Fail open - allow message if moderation fails
    return NextResponse.json({
      allowed: true,
      action: "ALLOW",
      warnings: 0,
      reason: "Moderation service unavailable",
      error: error.message,
    });
  }
}

async function runModeration(message: string, userId: string): Promise<any> {
  console.log("🐍 [MODERATION] Starting Python subprocess...");
  console.log(
    "🐍 [MODERATION] Python path:",
    process.env.PYTHON_PATH || "python"
  );
  console.log(
    "🐍 [MODERATION] Script path:",
    path.join(process.cwd(), "python-services", "chat_moderator.py")
  );

  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || "python";
    const scriptPath = path.join(
      process.cwd(),
      "python-services",
      "chat_moderator.py"
    );

    console.log(
      "🐍 [MODERATION] Executing command:",
      `${pythonPath} ${scriptPath} "${message}" --user-id ${userId}`
    );

    const python = spawn(
      pythonPath,
      [scriptPath, message, "--user-id", userId],
      {
        env: {
          ...process.env,
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        },
      }
    );

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      const chunk = data.toString();
      console.log("🐍 [MODERATION] Python stdout:", chunk);
      output += chunk;
    });

    python.stderr.on("data", (data) => {
      const chunk = data.toString();
      console.log("🐍 [MODERATION] Python stderr:", chunk);
      errorOutput += chunk;
    });

    python.on("close", (code) => {
      console.log("🐍 [MODERATION] Python process closed with code:", code);
      console.log("🐍 [MODERATION] Final output:", output);

      if (code !== 0) {
        console.error("❌ [MODERATION] Python script failed with code:", code);
        console.error("❌ [MODERATION] Error output:", errorOutput);
        resolve({
          action: "ALLOW",
          reason: "Moderation service error",
          error: errorOutput,
        });
        return;
      }

      try {
        const result = JSON.parse(output);
        console.log("🐍 [MODERATION] Parsed result:", result);
        resolve(result);
      } catch (parseError) {
        console.error("❌ [MODERATION] Failed to parse Python output:", output);
        console.error("❌ [MODERATION] Parse error:", parseError);
        resolve({
          action: "ALLOW",
          reason: "Invalid moderation response",
          error: "Parse error",
        });
      }
    });

    python.on("error", (error) => {
      console.error("❌ [MODERATION] Failed to start Python process:", error);
      resolve({
        action: "ALLOW",
        reason: "Moderation service unavailable",
        error: error.message,
      });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log("⏰ [MODERATION] Python process timeout, killing...");
      python.kill();
      resolve({
        action: "ALLOW",
        reason: "Moderation timeout",
        error: "Timeout",
      });
    }, 10000);
  });
}

async function logModerationWarning(
  supabaseServer: any,
  userId: string,
  conversationId: string | undefined,
  message: string,
  action: "WARN" | "STOP",
  reason: string
) {
  try {
    await supabaseServer.from("moderation_warnings").insert({
      user_id: userId,
      conversation_id: conversationId,
      message_content: message,
      moderation_action: action,
      reason: reason,
    });
  } catch (error) {
    console.error("Failed to log moderation warning:", error);
    // Don't fail the request if logging fails
  }
}
