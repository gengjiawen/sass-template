import { todoRouter } from './routers/todo'
import { protectedProcedure, publicProcedure, router } from './trpc'

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return 'OK'
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: 'This is private',
      user: ctx.session.user,
    }
  }),
  todo: todoRouter,
})

export type AppRouter = typeof appRouter
