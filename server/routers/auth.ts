import { protectedProcedure, router } from "../_core/trpc";

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
});
