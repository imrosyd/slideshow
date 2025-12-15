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
            timezone?: string; // Optional for backward compatibility
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

        // Helper function to get current time in a specific GMT offset timezone
        // Supports formats like: GMT+7, GMT-5, GMT+5:30, GMT+0
        const getTimeInTimezone = (timezone: string): { time: string; day: number } => {
            const now = new Date();

            // Parse GMT offset (e.g., "GMT+7", "GMT-5", "GMT+5:30")
            const gmtMatch = timezone.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
            if (gmtMatch) {
                const sign = gmtMatch[1] === '+' ? 1 : -1;
                const hours = parseInt(gmtMatch[2], 10);
                const minutes = parseInt(gmtMatch[3] || '0', 10);
                const offsetMinutes = sign * (hours * 60 + minutes);

                // Get UTC time and apply offset
                const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
                const targetMs = utcMs + (offsetMinutes * 60 * 1000);
                const targetDate = new Date(targetMs);

                return {
                    time: `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`,
                    day: targetDate.getDay(),
                };
            }

            // Fallback: try IANA timezone format for backward compatibility
            try {
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone === 'UTC' ? 'UTC' : timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    weekday: 'short',
                });
                const parts = formatter.formatToParts(now);
                const hour = parts.find(p => p.type === 'hour')?.value || '00';
                const minute = parts.find(p => p.type === 'minute')?.value || '00';
                const weekday = parts.find(p => p.type === 'weekday')?.value || 'Sun';

                const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
                return {
                    time: `${hour}:${minute}`,
                    day: dayMap[weekday] ?? now.getDay()
                };
            } catch {
                // Fallback to server timezone if invalid timezone
                return {
                    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                    day: now.getDay(),
                };
            }
        };

        // Get server time for logging
        const now = new Date();
        const serverTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Check if ANY enabled schedule is active right now
        let active = false;
        let activeScheduleName = '';
        let activeTimezone = '';
        for (const schedule of schedules) {
            if (!schedule.enabled) continue;

            // Get current time in the schedule's timezone (default to server timezone if not set)
            const tz = schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            const { time: currentTime, day: currentDay } = getTimeInTimezone(tz);

            const timeInRange = isTimeInRange(currentTime, schedule.startTime, schedule.endTime);
            const dayAllowed = schedule.days.includes(currentDay);
            if (timeInRange && dayAllowed) {
                active = true;
                activeScheduleName = schedule.name;
                activeTimezone = tz;
                break;
            }
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const enabledCount = schedules.filter(s => s.enabled).length;
        console.log(`[Check Blackscreen] schedules=${schedules.length}, enabled=${enabledCount}, serverTime=${serverTime}, active=${active}${active ? ` (${activeScheduleName} @ ${activeTimezone})` : ''}`);

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        return res.status(200).json({
            active,
            enabled: enabledCount > 0,
            startTime: null,
            endTime: null,
            blackVideoUrl: "/black.mp4",
            currentTime: serverTime,
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
