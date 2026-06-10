import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { courses, courseEnrollments, certificates } from "../../drizzle/schema";
import { protectedProcedure, router, publicProcedure } from "../_core/trpc";
import { getDb } from "../_core/db";

const DEFAULT_COURSES = [
  {
    slug: "salesforce-admin-fundamentals",
    title: "Fundamentos de Administrador Salesforce",
    description: "Curso completo para iniciantes no caminho da certificação Administrator.",
    modules: [
      { id: "m1", title: "Introdução ao Salesforce", duration: 30 },
      { id: "m2", title: "Modelo de Dados e Objetos", duration: 45 },
      { id: "m3", title: "Segurança e Perfis", duration: 40 },
      { id: "m4", title: "Automação com Flow", duration: 50 },
      { id: "m5", title: "Relatórios e Dashboards", duration: 35 },
    ],
  },
  {
    slug: "platform-developer-basics",
    title: "Platform Developer — Básico",
    description: "Aprenda Apex, triggers e integrações para a certificação PD1.",
    modules: [
      { id: "m1", title: "Apex Fundamentals", duration: 40 },
      { id: "m2", title: "Triggers e DML", duration: 45 },
      { id: "m3", title: "SOQL e SOSL", duration: 35 },
      { id: "m4", title: "Testes Unitários", duration: 50 },
    ],
  },
];

async function ensureDefaultCourses() {
  const db = getDb();
  for (const course of DEFAULT_COURSES) {
    const [existing] = await db.select().from(courses).where(eq(courses.slug, course.slug)).limit(1);
    if (!existing) {
      await db.insert(courses).values(course);
    }
  }
}

export const coursesRouter = router({
  list: publicProcedure.query(async () => {
    await ensureDefaultCourses();
    const db = getDb();
    return db.select().from(courses);
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [course] = await db.select().from(courses).where(eq(courses.slug, input.slug)).limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  enroll: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.userId, ctx.user.id),
            eq(courseEnrollments.courseId, input.courseId)
          )
        )
        .limit(1);

      if (existing) return existing;

      const [result] = await db.insert(courseEnrollments).values({
        userId: ctx.user.id,
        courseId: input.courseId,
      });

      return { id: result.insertId, userId: ctx.user.id, courseId: input.courseId, progress: 0 };
    }),

  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        enrollment: courseEnrollments,
        course: courses,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, ctx.user.id));
  }),

  markModuleComplete: protectedProcedure
    .input(z.object({ courseId: z.number(), moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [enrollment] = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.userId, ctx.user.id),
            eq(courseEnrollments.courseId, input.courseId)
          )
        )
        .limit(1);

      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND", message: "Matrícula não encontrada" });

      const [course] = await db.select().from(courses).where(eq(courses.id, input.courseId)).limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const modules = course.modules as Array<{ id: string }>;
      const completed = (enrollment.completedModules as string[]) ?? [];
      if (!completed.includes(input.moduleId)) completed.push(input.moduleId);

      const progress = Math.round((completed.length / modules.length) * 100);

      await db
        .update(courseEnrollments)
        .set({
          completedModules: completed,
          progress,
          completedAt: progress >= 100 ? new Date() : null,
        })
        .where(eq(courseEnrollments.id, enrollment.id));

      if (progress >= 100) {
        const verifyCode = randomBytes(4).toString("hex").toUpperCase();
        await db.insert(certificates).values({
          userId: ctx.user.id,
          courseId: input.courseId,
          studentName: ctx.user.name ?? "Aluno",
          courseTitle: course.title,
          verifyCode,
        });
      }

      return { progress, completed };
    }),

  myCertificates: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(certificates).where(eq(certificates.userId, ctx.user.id));
  }),
});
