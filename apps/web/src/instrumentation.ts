export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureConfiguredAdminUser } = await import('@my-better-t-app/auth')
    await ensureConfiguredAdminUser()
  }
}
