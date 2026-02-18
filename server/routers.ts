import { publicProcedure, protectedProcedure, router } from "./trpc";
import { z } from "zod";
import { getTasksForWeek, createTask, updateTask, deleteTask, getNoteForWeek, upsertNote, getWeekSettings, upsertWeekSettings, updateCustomContent, getWeeklySummary, upsertWeeklySummary } from "./db";
import { uploadToR2 } from "./storage";
import { nanoid } from "nanoid";

const timeBlockSchema = z.enum(["morning", "afternoon", "evening"]);

export const appRouter = router({
  authentication: router({
    me: publicProcedure.query(opts => opts.ctx.user),
  }),

  // Task operations
  tasks: router({
    // Get all tasks for a week
    getForWeek: protectedProcedure
      .input(z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),   // YYYY-MM-DD
      }))
      .query(async ({ ctx, input }) => {
        return getTasksForWeek(ctx.user.id, input.startDate, input.endDate);
      }),

    // Create a new task
    create: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        date: z.string(),
        timeBlock: timeBlockSchema,
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTask({
          userId: ctx.user.id,
          content: input.content,
          date: input.date,
          timeBlock: input.timeBlock,
          sortOrder: input.sortOrder ?? 0,
        });
      }),

    // Update a task
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        completed: z.boolean().optional(),
        date: z.string().optional(),
        timeBlock: timeBlockSchema.optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        return updateTask(id, ctx.user.id, updates);
      }),

    // Delete a task
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteTask(input.id, ctx.user.id);
      }),
  }),

  // Note operations
  notes: router({
    // Get note for a specific week
    getForWeek: protectedProcedure
      .input(z.object({ weekId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getNoteForWeek(ctx.user.id, input.weekId);
      }),

    // Update or create note for a week
    upsert: protectedProcedure
      .input(z.object({
        weekId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertNote(ctx.user.id, input.weekId, input.content);
      }),
  }),

  // Weekly summary operations
  weeklySummary: router({
    // Get summary for a specific week
    get: protectedProcedure
      .input(z.object({ weekId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getWeeklySummary(ctx.user.id, input.weekId);
      }),

    // Update or create summary for a week
    upsert: protectedProcedure
      .input(z.object({
        weekId: z.string(),
        keyword: z.string().nullable().optional(),
        dailyEntries: z.string().nullable().optional(),
        reflection: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { weekId, ...data } = input;
        return upsertWeeklySummary(ctx.user.id, weekId, data);
      }),
  }),

  // Week settings operations
  weekSettings: router({
    // Get settings for a specific week
    get: protectedProcedure
      .input(z.object({ weekId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getWeekSettings(ctx.user.id, input.weekId);
      }),

    // Update column widths for a week
    updateColumnWidths: protectedProcedure
      .input(z.object({
        weekId: z.string(),
        columnWidths: z.record(z.string(), z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const columnWidths: Record<number, number> = {};
        for (const [key, value] of Object.entries(input.columnWidths)) {
          columnWidths[parseInt(key)] = value;
        }
        return upsertWeekSettings(ctx.user.id, input.weekId, columnWidths);
      }),

    // Update custom content (text and/or image)
    updateCustomContent: protectedProcedure
      .input(z.object({
        weekId: z.string(),
        customText: z.string().nullable().optional(),
        customImageUrl: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateCustomContent(
          ctx.user.id,
          input.weekId,
          input.customText,
          input.customImageUrl
        );
      }),

    // Upload custom image
    uploadCustomImage: protectedProcedure
      .input(z.object({
        weekId: z.string(),
        imageBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Decode base64 to buffer
        const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const ext = input.mimeType.split('/')[1] || 'png';
        const filename = `custom-content/${ctx.user.id}/${input.weekId}-${nanoid()}.${ext}`;
        
        // Upload to R2
        const url = await uploadToR2(filename, buffer, input.mimeType);
        
        // Update week settings with new image URL
        await updateCustomContent(ctx.user.id, input.weekId, undefined, url);
        
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
