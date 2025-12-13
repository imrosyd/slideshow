import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

interface BlackScreenResponse {
    active: boolean;
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
    blackVideoUrl: string;
    currentTime: string;
}

/**
 * Check if black screen mode is currently active based on scheduled time.
 * Handles schedules that span midnight (e.g., 22:00 - 06:00)
 */
function isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const current = currentHour * 60 + currentMin;
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;

    // Normal range (e.g., 09:00 - 17:00)
    if (start <= end) {
        return current >= start && current < end;
    }

    // Range spans midnight (e.g., 22:00 - 06:00)
    return current >= start || current < end;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<BlackScreenResponse>
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({
            active: false,
            enabled: false,
            startTime: null,
            endTime: null,
            blackVideoUrl: "/black.mp4",
            currentTime: new Date().toISOString(),
        });
    }

    try {
        // Get settings from database
        const settings = await db.getSettings();

        const settingsMap: Record<string, string> = {};
        settings?.forEach((row) => {
            settingsMap[row.key] = row.value ?? '';
        });

        // Parse schedules from JSON string
        interface Schedule {
            id: string;
            name: string;
            enabled: boolean;
            startTime: string;
            endTime: string;
            days: number[];
        }

        let schedules: Schedule[] = [];
        if (settingsMap['blackscreen_schedules']) {
            try {
                schedules = JSON.parse(settingsMap['blackscreen_schedules']);
            } catch {
                console.error('[Check Blackscreen] Failed to parse schedules JSON');
            }
        }

        // Fallback: check old format for backward compatibility
        if (schedules.length === 0 && settingsMap['blackscreen_enabled'] === 'true') {
            const startTime = settingsMap['blackscreen_start_time'] || '22:00';
            const endTime = settingsMap['blackscreen_end_time'] || '06:00';
            const daysStr = settingsMap['blackscreen_days'] || '0,1,2,3,4,5,6';
            schedules = [{
                id: 'legacy',
                name: 'Default',
                enabled: true,
                startTime,
                endTime,
                days: daysStr.split(',').map(Number).filter(n => !isNaN(n)),
            }];
        }

        // Get current time in HH:MM format (server timezone)
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Check if ANY enabled schedule is active right now
        let active = false;
        let activeScheduleName = '';
        for (const schedule of schedules) {
            if (!schedule.enabled) continue;
            const timeInRange = isTimeInRange(currentTime, schedule.startTime, schedule.endTime);
            const dayAllowed = schedule.days.includes(currentDay);
            if (timeInRange && dayAllowed) {
                active = true;
                activeScheduleName = schedule.name;
                break;
            }
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const enabledCount = schedules.filter(s => s.enabled).length;
        console.log(`[Check Blackscreen] schedules=${schedules.length}, enabled=${enabledCount}, current=${currentTime} ${dayNames[currentDay]}, active=${active}${active ? ` (${activeScheduleName})` : ''}`);

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        return res.status(200).json({
            active,
            enabled: enabledCount > 0,
            startTime: null,
            endTime: null,
            blackVideoUrl: "/black.mp4",
            currentTime,
        });
    } catch (error: any) {
        console.error("[Check Blackscreen] Error:", error);
        return res.status(500).json({
            active: false,
            enabled: false,
            startTime: null,
            endTime: null,
            blackVideoUrl: "/black.mp4",
            currentTime: new Date().toISOString(),
        });
    }
}
