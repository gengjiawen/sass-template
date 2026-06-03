import NssurgeDashboard from './nssurge-dashboard'

export const metadata = {
  title: 'NSSurge Collector',
  description: 'Capture Surge HTTP traffic to Prisma-backed storage',
}

export default function NssurgePage() {
  return <NssurgeDashboard />
}
