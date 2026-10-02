import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/auth";
import { unauthorized } from "@/lib/api-response";
import { cleanDueDate, cleanTitle, MAX_TASKS, normalizeTask, Task } from "@/lib/tasks";
import { rateLimit } from "@/lib/rate-limit";

/**
 * The user's to-do list. Each change updates one task in place (no
 * whole-list overwrites, so quick successive edits can't clobber each other).
 * Every response is the full, updated list: { tasks }.
 *   GET
 *   POST   { title, dueDate?, isUrgent? }               add a task by hand
 *   PATCH  { id, title?, dueDate?, isUrgent?, status? }  edit
 *   DELETE ?id=                                          remove
 */

async function respondWithTasks(email: string) {
    const user = await User.findOne({ email }).select("globalTasks").lean<{ globalTasks?: Partial<Task>[] }>();
    const tasks = (user?.globalTasks ?? []).map((t) => normalizeTask(t as Partial<Task> & Record<string, unknown>));
    return NextResponse.json({ tasks });
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET() {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    await dbConnect();
    return respondWithTasks(email);
}

export async function POST(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    const limited = await rateLimit(email, "writes");
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const title = cleanTitle(body?.title);
    if (!title) return badRequest("Give the task a title.");

    await dbConnect();
    const user = await User.findOne({ email }).select("globalTasks").lean<{ globalTasks?: unknown[] }>();
    if ((user?.globalTasks?.length ?? 0) >= MAX_TASKS) return badRequest(`You can have up to ${MAX_TASKS} tasks.`);

    const task: Task = {
        id: randomUUID(),
        // Set when the task is made from an email ("Add to To-do")
        emailId: typeof body?.emailId === "string" && /^[a-zA-Z0-9]{1,64}$/.test(body.emailId) ? body.emailId : "",
        title,
        dueDate: cleanDueDate(body?.dueDate),
        date: "",
        isUrgent: Boolean(body?.isUrgent),
        status: "active",
        createdAt: new Date().toISOString(),
        completedAt: "",
    };
    await User.updateOne({ email }, { $push: { globalTasks: task } }, { upsert: true });
    return respondWithTasks(email);
}

export async function PATCH(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    const limited = await rateLimit(email, "writes");
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    if (typeof body?.id !== "string" || !body.id) return badRequest("Which task?");

    const set: Record<string, unknown> = {};
    if (body.title !== undefined) {
        const title = cleanTitle(body.title);
        if (!title) return badRequest("A task needs a title.");
        set["globalTasks.$[t].title"] = title;
    }
    if (body.dueDate !== undefined) {
        const dueDate = cleanDueDate(body.dueDate);
        if (body.dueDate && !dueDate) return badRequest("Invalid due date.");
        set["globalTasks.$[t].dueDate"] = dueDate;
    }
    if (body.isUrgent !== undefined) set["globalTasks.$[t].isUrgent"] = Boolean(body.isUrgent);
    if (body.status !== undefined) {
        if (body.status !== "active" && body.status !== "done") return badRequest("Invalid status.");
        set["globalTasks.$[t].status"] = body.status;
        set["globalTasks.$[t].completedAt"] = body.status === "done" ? new Date().toISOString() : "";
    }
    if (Object.keys(set).length === 0) return badRequest("Nothing to change.");

    await dbConnect();
    if (!(await User.exists({ email, "globalTasks.id": body.id }))) {
        return NextResponse.json({ error: "That task no longer exists." }, { status: 404 });
    }
    await User.updateOne({ email }, { $set: set }, { arrayFilters: [{ "t.id": body.id }] });
    return respondWithTasks(email);
}

export async function DELETE(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    const limited = await rateLimit(email, "writes");
    if (limited) return limited;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return badRequest("Which task?");

    await dbConnect();
    await User.updateOne({ email }, { $pull: { globalTasks: { id } } });
    return respondWithTasks(email);
}
