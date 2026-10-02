/**
 * The sample mailbox behind /demo. Every person, company and address here is
 * made up (addresses use reserved .example domains). Dates are relative to
 * when the demo loads, so the inbox always looks current.
 */
import type { MailAnalysis, MailMessage } from "@/lib/mail-types";
import type { SmartLabel } from "@/lib/labels";
import { localToday, type Task } from "@/lib/tasks";

export const DEMO_USER = { name: "Alex Rivera", email: "alex.rivera@example.com" };

/** A stored message: Gmail's label ids decide which folders it shows in. */
export interface DemoMessage extends MailMessage {
    labels: string[];
}

export interface DemoState {
    messages: DemoMessage[];
    /** AI results per conversation (thread id) */
    analysis: Record<string, MailAnalysis>;
    labels: SmartLabel[];
    tasks: Task[];
    nextId: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Thursday", "October 10" etc. for a day relative to today. */
function dayFromNow(days: number, options: Intl.DateTimeFormatOptions): string {
    return new Date(Date.now() + days * DAY).toLocaleDateString("en-US", options);
}
const weekday = (days: number) => dayFromNow(days, { weekday: "long" });
const monthDay = (days: number) => dayFromNow(days, { month: "long", day: "numeric" });
const isoDay = (days: number) => localToday(new Date(Date.now() + days * DAY));
const isWeekend = (days: number) => [0, 6].includes(new Date(Date.now() + days * DAY).getDay());

/** Days from today until the next Monday-Friday day at least `min` days away. */
function workdayFrom(min: number): number {
    let days = min;
    while (isWeekend(days)) days++;
    return days;
}

// Dates the sample mail refers to, so weekdays and deadlines line up
const SLIDES_DUE = ((4 - new Date().getDay() + 7) % 7) || 7; // next Thursday
const INTERVIEW_SLOTS = [workdayFrom(1), workdayFrom(workdayFrom(1) + 1), workdayFrom(workdayFrom(workdayFrom(1) + 1) + 1)];
const CHECKUP = workdayFrom(12);
const ENROLLMENT_ENDS = workdayFrom(13);

function htmlToSnippet(body: string, isHtml: boolean): string {
    const text = isHtml ? body.replace(/<(style|script)[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ") : body;
    return text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 160);
}

interface Seed {
    id: string;
    threadId: string;
    /** [display name, address]; omit for mail Alex sent */
    from?: [string, string];
    to?: string;
    cc?: string;
    subject: string;
    ago: number;
    body: string;
    html?: boolean;
    labels: string[];
}

export function toDemoMessage(seed: Seed, now: number): DemoMessage {
    const timestamp = now - seed.ago;
    const [from, fromEmail] = seed.from ?? [DEMO_USER.name, DEMO_USER.email];
    return {
        id: seed.id,
        threadId: seed.threadId,
        from,
        fromEmail,
        to: seed.to ?? `${DEMO_USER.name} <${DEMO_USER.email}>`,
        cc: seed.cc ?? "",
        subject: seed.subject,
        date: new Date(timestamp).toUTCString(),
        snippet: htmlToSnippet(seed.body, Boolean(seed.html)),
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        timestamp,
        body: seed.body,
        bodyIsHtml: Boolean(seed.html),
        attachments: [],
        bcc: "",
        messageId: `<${seed.id}@mail.example.com>`,
        references: "",
        labels: seed.labels,
    };
}

const PRIYA: [string, string] = ["Priya Shah", "priya.shah@lumenlabs.example"];
const SAM: [string, string] = ["Sam Okafor", "sam.okafor@example.net"];

/** A plain branded HTML email, the way newsletters and receipts arrive. */
function htmlMail(brand: string, color: string, inner: string): string {
    return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
<div style="background:${color};color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;font-size:20px;font-weight:bold">${brand}</div>
<div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;line-height:1.6">${inner}</div>
<p style="font-size:12px;color:#9ca3af;text-align:center">This is sample mail in the Mail-man demo.</p>
</div>`;
}

function seeds(): Seed[] {
    return [
        {
            id: "m101", threadId: "t01", from: PRIYA, subject: "Q4 roadmap review: slides by Thursday", ago: 2 * DAY,
            body: `Hi Alex,\n\nCould you put together 5-6 slides on the mail client work for the Q4 roadmap review? The main points: what shipped in Q3, adoption numbers, and the plan for Q4.\n\nI need them by ${weekday(SLIDES_DUE)} so I can merge everything into one deck.\n\nThanks,\nPriya`,
            labels: [],
        },
        {
            id: "m102", threadId: "t01", to: `${PRIYA[0]} <${PRIYA[1]}>`, subject: "Re: Q4 roadmap review: slides by Thursday", ago: DAY + 4 * HOUR,
            body: "Sure, I'll have a draft ready the evening before. Do you want the adoption numbers by week or by month?\n\nAlex",
            labels: ["SENT"],
        },
        {
            id: "m103", threadId: "t01", from: PRIYA, subject: "Re: Q4 roadmap review: slides by Thursday", ago: 3 * HOUR,
            body: "By month is fine. Can you also add one slide on risks? The Gmail API quota came up in the last review and leadership will ask about it.\n\nThanks!\nPriya",
            labels: ["INBOX", "UNREAD"],
        },
        {
            id: "m201", threadId: "t02", from: ["Maya Chen", "maya.chen@orbitsystems.example"], subject: "Interview for the Frontend Engineer role", ago: 5 * HOUR,
            body: `Hi Alex,\n\nThanks for applying to the Frontend Engineer role at Orbit Systems. The team enjoyed your portfolio and would like to set up a 45-minute video call with our engineering lead.\n\nDo any of these times work for you (Pacific time)?\n\n- ${weekday(INTERVIEW_SLOTS[0])} at 2:00 PM\n- ${weekday(INTERVIEW_SLOTS[1])} at 11:00 AM\n- ${weekday(INTERVIEW_SLOTS[2])} at 4:00 PM\n\nBest,\nMaya Chen\nRecruiting, Orbit Systems`,
            labels: ["INBOX", "UNREAD", "STARRED"],
        },
        {
            id: "m301", threadId: "t03", from: ["Skyway Air", "noreply@skywayair.example"], subject: "Check-in is open for your flight to Denver", ago: 7 * HOUR, html: true,
            body: htmlMail("Skyway Air", "#0369a1", `<p>Hi Alex,</p><p>Check-in is now open for your trip.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:6px 0;color:#6b7280">Flight</td><td style="padding:6px 0;font-weight:bold">SA 1482</td></tr>
<tr><td style="padding:6px 0;color:#6b7280">From</td><td style="padding:6px 0">Seattle (SEA)</td></tr>
<tr><td style="padding:6px 0;color:#6b7280">To</td><td style="padding:6px 0">Denver (DEN)</td></tr>
<tr><td style="padding:6px 0;color:#6b7280">Departs</td><td style="padding:6px 0">${monthDay(1)}, 8:05 AM</td></tr>
<tr><td style="padding:6px 0;color:#6b7280">Seat</td><td style="padding:6px 0">14C</td></tr>
</table>
<p>Boarding closes 15 minutes before departure. Have a great flight!</p>`),
            labels: ["INBOX", "UNREAD"],
        },
        {
            id: "m401", threadId: "t04", from: ["Jordan Lee", "jordan.lee@example.com"], subject: "Dinner Saturday?", ago: 9 * HOUR,
            body: "Hey! A few of us are trying the new ramen place on 5th this Saturday around 7. You in?\n\nLet me know by Friday so I can book a table.\n\nJ",
            labels: ["INBOX", "UNREAD"],
        },
        {
            id: "m501", threadId: "t05", from: ["Cloudnest Billing", "billing@cloudnest.example"], subject: `Invoice #4821: $48.00 due ${monthDay(8)}`, ago: DAY + 2 * HOUR, html: true,
            body: htmlMail("Cloudnest", "#4f46e5", `<p>Hello Alex,</p><p>Your invoice for September is ready.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb">Pro plan (1 seat)</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right">$40.00</td></tr>
<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb">Extra storage (50 GB)</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right">$8.00</td></tr>
<tr><td style="padding:6px 0;font-weight:bold">Total due ${monthDay(8)}</td><td style="padding:6px 0;text-align:right;font-weight:bold">$48.00</td></tr>
</table>
<p>Your card on file will not be charged automatically. Pay from the billing page before the due date to keep your workspace active.</p>`),
            labels: ["INBOX", "STARRED"],
        },
        {
            id: "m601", threadId: "t06", from: SAM, subject: "Photos from the hike", ago: 2 * DAY + 6 * HOUR,
            body: "Uploaded everything from Saturday to the shared album. The one at the summit came out great, you have to see the light.\n\nSam",
            labels: [],
        },
        {
            id: "m602", threadId: "t06", to: `${SAM[0]} <${SAM[1]}>`, subject: "Re: Photos from the hike", ago: 2 * DAY + 2 * HOUR,
            body: "These are amazing, thanks for taking them! The summit one is going on my wall.",
            labels: ["SENT"],
        },
        {
            id: "m603", threadId: "t06", from: SAM, subject: "Re: Photos from the hike", ago: 20 * HOUR,
            body: "Ha, glad you like it. Same time next month? I'm thinking Eagle Ridge trail, it's about 9 miles with a lake at the top.",
            labels: ["INBOX", "UNREAD"],
        },
        {
            id: "m701", threadId: "t07", from: ["The Weekly Byte", "hello@weeklybyte.example"], subject: "Issue #112: Edge functions, explained", ago: DAY + 8 * HOUR, html: true,
            body: htmlMail("The Weekly Byte", "#111827", `<h2 style="margin-top:0">Edge functions, explained</h2>
<p>This week: when running code close to your users actually helps, and when a plain server is still the better choice.</p>
<ul><li>Cold starts: what the benchmarks leave out</li><li>Caching at the edge without serving stale data</li><li>Three questions to ask before you migrate</li></ul>
<p>Plus: a tiny CSS trick for better focus rings, and this week's job board.</p>`),
            labels: ["INBOX"],
        },
        {
            id: "m801", threadId: "t08", from: ["Trailhead Outfitters", "deals@trailhead.example"], subject: "40% off fall jackets, this weekend only", ago: DAY + 11 * HOUR, html: true,
            body: htmlMail("Trailhead Outfitters", "#b45309", `<h2 style="margin-top:0">Fall is here. Your jacket should be too.</h2>
<p>Take <b>40% off</b> every insulated and rain jacket through Sunday. Members get free shipping on all orders.</p>
<p style="text-align:center;margin:24px 0"><span style="background:#b45309;color:#fff;padding:12px 24px;border-radius:999px;font-weight:bold">Shop the sale</span></p>`),
            labels: ["INBOX"],
        },
        {
            id: "m901", threadId: "t09", from: ["Riverside Dental", "appointments@riversidedental.example"], subject: `Reminder: checkup on ${monthDay(CHECKUP)} at 10:30 AM`, ago: 2 * DAY + 3 * HOUR,
            body: `Hi Alex,\n\nThis is a reminder of your dental checkup with Dr. Elena Ruiz on ${weekday(CHECKUP)}, ${monthDay(CHECKUP)} at 10:30 AM.\n\nIf you need to reschedule, please call us at least 24 hours in advance.\n\nRiverside Dental`,
            labels: ["INBOX"],
        },
        {
            id: "m1001", threadId: "t10", from: ["Meetly", "notify@meetly.example"], subject: "Riya and 3 others commented on your post", ago: 3 * DAY,
            body: "Riya Kapoor, Tom Becker and 2 others commented on your post \"Shipped the conversation view in my mail client today!\"\n\nRiya: \"This looks so clean. Is it open source?\"",
            labels: ["INBOX"],
        },
        {
            id: "m1101", threadId: "t11", from: ["Lumen Labs People Team", "people@lumenlabs.example"], subject: `Open enrollment closes ${monthDay(ENROLLMENT_ENDS)}`, ago: 3 * DAY + 5 * HOUR,
            body: `Hi everyone,\n\nOpen enrollment for next year's benefits is open until ${monthDay(ENROLLMENT_ENDS)}. If you don't make any changes, your current medical plan carries over, but your flexible spending account does not.\n\nYou can review and confirm your choices in the benefits portal.\n\nThe People Team`,
            labels: ["INBOX"],
        },
        {
            id: "m1201", threadId: "t12", from: ["Harbor Bank", "alerts@harborbank.example"], subject: "Your September statement is ready", ago: 4 * DAY,
            body: "Hi Alex,\n\nYour checking account statement for September is ready to view in online banking.\n\nThis is an automated message. Please do not reply.",
            labels: ["INBOX"],
        },
        {
            id: "m1301", threadId: "t13", from: ["Devhub", "notifications@devhub.example"], subject: "[mail-man] New issue #42: Keyboard shortcuts for archive", ago: 4 * DAY + 6 * HOUR,
            body: "tom-becker opened a new issue in alex-rivera/mail-man:\n\n\"It would be great to archive with E and move between messages with J/K, like other mail clients.\"",
            labels: ["INBOX"],
        },
        {
            id: "m1401", threadId: "t14", from: ["Ana Torres", "ana.torres@example.org"], subject: "Water shut-off Monday, 9 AM to noon", ago: 5 * DAY,
            body: "Hello residents,\n\nThe city is replacing a valve on our street, so the water will be off on Monday from 9 AM to noon. Sorry for the inconvenience!\n\nAna Torres\nBuilding manager",
            labels: ["INBOX"],
        },
        {
            id: "m1501", threadId: "t15", from: PRIYA, subject: "Offsite photos and slides", ago: 12 * DAY,
            body: "Thanks again for organizing the offsite! Photos and slides are in the team folder.",
            labels: ["STARRED"],
        },
        {
            id: "m1601", threadId: "t16", to: "Chris Park <chris.park@example.com>", subject: "Lunch next week?", ago: 3 * DAY + 2 * HOUR,
            body: "Hey Chris, are you free for lunch next week? Tuesday or Wednesday works best for me.\n\nAlex",
            labels: ["SENT"],
        },
        {
            id: "m1701", threadId: "t17", to: "design-team@lumenlabs.example", subject: "Proposal: shared design tokens", ago: DAY + 1 * HOUR, html: true,
            body: "<p>Hi team,</p><p>I'd like to move our colours, spacing and type scale into one set of shared design tokens so the web app and the email templates stop drifting apart.</p><p>Rough plan:</p>",
            labels: ["DRAFT"],
        },
        {
            id: "m1801", threadId: "t18", from: ["Prize Center", "winner@prize-center.example"], subject: "Congratulations! You've been selected for a $1,000 gift card", ago: 2 * DAY,
            body: "You have been selected!!! Claim your $1,000 gift card now. Offer expires in 24 hours. Just confirm your card details to pay the small processing fee.",
            labels: ["SPAM"],
        },
        {
            id: "m1901", threadId: "t19", from: ["Trailhead Outfitters", "deals@trailhead.example"], subject: "Last chance: the summer sale ends tonight", ago: 20 * DAY,
            body: "Final hours to save up to 50% on summer gear.",
            labels: ["TRASH"],
        },
    ];
}

function analysis(): Record<string, MailAnalysis> {
    return {
        t01: {
            category: "Important",
            summary: `Priya needs 5-6 Q4 roadmap slides by ${weekday(SLIDES_DUE)}: adoption by month, plus a slide on risks such as the Gmail API quota.`,
            requires_reply: true,
            draft_reply: "Will do. I'll use monthly adoption numbers and add a risks slide covering the Gmail API quota. You'll have the draft the evening before.\n\nAlex",
            appliedLabels: ["Work"],
        },
        t02: {
            category: "Important",
            summary: "Orbit Systems wants a 45-minute interview with their engineering lead and offers three time slots.",
            requires_reply: true,
            draft_reply: `Hi Maya,\n\nThank you, I'd love to talk with the team. ${weekday(INTERVIEW_SLOTS[1])} at 11:00 AM Pacific works well for me.\n\nBest,\nAlex`,
            appliedLabels: ["Job Search"],
        },
        t03: {
            category: "Important",
            summary: `Check-in is open for flight SA 1482 from Seattle to Denver, departing ${monthDay(1)} at 8:05 AM, seat 14C.`,
            requires_reply: false,
            draft_reply: "",
            appliedLabels: ["Travel"],
        },
        t04: {
            category: "General",
            summary: "Jordan invites you to ramen on Saturday at 7 and needs an answer by Friday to book.",
            requires_reply: true,
            draft_reply: "I'm in! Saturday at 7 sounds great, thanks for booking.",
            appliedLabels: [],
        },
        t05: {
            category: "Important",
            summary: `Cloudnest invoice #4821 for $48.00 is due ${monthDay(8)} and won't be charged automatically.`,
            requires_reply: false,
            draft_reply: "",
            appliedLabels: ["Finance"],
        },
        t06: {
            category: "General",
            summary: "Sam suggests hiking Eagle Ridge trail next month, about 9 miles with a lake at the top.",
            requires_reply: true,
            draft_reply: "Eagle Ridge sounds perfect, count me in. Let's pick a date closer to the time.",
            appliedLabels: [],
        },
        t07: { category: "Promotions", summary: "Newsletter on when edge functions help, caching at the edge, and questions to ask before migrating.", requires_reply: false, draft_reply: "", appliedLabels: [] },
        t08: { category: "Promotions", summary: "Trailhead Outfitters has 40% off fall jackets through Sunday.", requires_reply: false, draft_reply: "", appliedLabels: [] },
        t09: { category: "Important", summary: `Dental checkup with Dr. Ruiz on ${monthDay(CHECKUP)} at 10:30 AM; reschedule at least 24 hours ahead.`, requires_reply: false, draft_reply: "", appliedLabels: [] },
        t10: { category: "Social", summary: "Four people commented on your post about the conversation view; Riya asks if it's open source.", requires_reply: false, draft_reply: "", appliedLabels: [] },
        t11: { category: "Important", summary: `Benefits open enrollment closes ${monthDay(ENROLLMENT_ENDS)}; the FSA does not carry over automatically.`, requires_reply: false, draft_reply: "", appliedLabels: ["Work"] },
        t12: { category: "General", summary: "Your September checking statement is ready in online banking.", requires_reply: false, draft_reply: "", appliedLabels: ["Finance"] },
        t13: { category: "General", summary: "New issue on mail-man asking for keyboard shortcuts: E to archive, J/K to move.", requires_reply: false, draft_reply: "", appliedLabels: [] },
        t14: { category: "General", summary: "Water will be off Monday from 9 AM to noon for street valve work.", requires_reply: false, draft_reply: "", appliedLabels: [] },
        t15: { category: "General", summary: "Priya thanks you for organizing the offsite; photos and slides are in the team folder.", requires_reply: false, draft_reply: "", appliedLabels: ["Work"] },
        t18: { category: "Spam", summary: "Gift card prize scam asking for card details.", requires_reply: false, draft_reply: "", appliedLabels: [] },
    };
}

function task(id: string, emailId: string, title: string, dueIn: number | null, extra: Partial<Task> = {}): Task {
    return {
        id,
        emailId,
        title,
        dueDate: dueIn === null ? "" : isoDay(dueIn),
        date: "",
        isUrgent: false,
        status: "active",
        createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
        completedAt: "",
        ...extra,
    };
}

function tasks(): Task[] {
    return [
        task("task1", "m103", "Send Q4 roadmap slides to Priya", SLIDES_DUE, { isUrgent: true }),
        task("task2", "m201", "Reply to Maya with an interview time", 0, { isUrgent: true }),
        task("task3", "m301", "Check in for flight SA 1482", 0),
        task("task4", "m501", "Pay Cloudnest invoice #4821 ($48.00)", 8),
        task("task5", "m901", "Dental checkup at 10:30 AM", CHECKUP),
        task("task6", "m1101", "Confirm benefits in open enrollment", ENROLLMENT_ENDS),
        task("task7", "", "Return library books", -1),
        task("task8", "", "Renew passport", null),
        task("task9", "", "Book hotel in Denver", null, { status: "done", completedAt: new Date(Date.now() - DAY).toISOString() }),
    ];
}

export function createDemoState(): DemoState {
    const now = Date.now();
    const messages = seeds().map((s) => toDemoMessage(s, now));
    return {
        messages,
        analysis: analysis(),
        labels: [
            { name: "Work", prompt: "Emails from my team at Lumen Labs or about work projects", color: "blue" },
            { name: "Finance", prompt: "Bills, invoices, bank statements and receipts", color: "green" },
            { name: "Travel", prompt: "Flights, hotels, bookings and travel plans", color: "yellow" },
            { name: "Job Search", prompt: "Recruiters, interviews and job applications", color: "purple" },
        ],
        tasks: tasks(),
        nextId: 1,
    };
}

/** Builds a new message (sent mail, a draft) with the same shape as the seeds. */
export function newDemoMessage(fields: Omit<Seed, "ago">): DemoMessage {
    return toDemoMessage({ ...fields, ago: 0 }, Date.now());
}
