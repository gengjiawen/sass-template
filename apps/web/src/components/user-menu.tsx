'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export default function UserMenu() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <Skeleton className="h-9 w-24" />
  }

  if (!session) {
    return (
      <Link href="/login">
        <Button variant="outline">{t('Sign In')}</Button>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('My Account')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push('/')
                  },
                },
              })
            }}
          >
            {t('Sign Out')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
