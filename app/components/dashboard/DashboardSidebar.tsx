'use client'

import type { ComponentType, SVGProps } from 'react'
import Image from 'next/image'
import {
  BarChart3Icon,
  CalendarIcon,
  ChevronsUpDownIcon,
  CoffeeIcon,
  HexagonIcon,
  LinkIcon,
  LogOutIcon,
  MailIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import type { DashboardMember, DashboardTab } from './types'

type DashboardNavigationProps = {
  member: DashboardMember | null
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onSignOut: () => void
  onTitleClick: () => void
  canUseMemberViewToggle: boolean
  showLinkAnalyticsTab: boolean
  showNftApprovalsTab: boolean
  showNewsletterTab: boolean
  forceMemberView: boolean
  onToggleMemberView: (enabled: boolean) => void
  pictureUrl: string | null
}

const NAVIGATION_ITEMS: Array<{
  key: DashboardTab
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}> = [
  { key: 'profile', label: 'My Profile', icon: UserIcon },
  { key: 'coffee-chats', label: 'Coffee Chats', icon: CoffeeIcon },
  { key: 'members', label: 'All Members', icon: UsersIcon },
  { key: 'events', label: 'Events', icon: CalendarIcon },
  { key: 'stats', label: 'Statistics', icon: BarChart3Icon },
  { key: 'link-analytics', label: 'Link Analytics', icon: LinkIcon },
  { key: 'nft-approvals', label: 'NFT Approvals', icon: HexagonIcon },
  { key: 'nft-status', label: 'NFT Status', icon: HexagonIcon },
  { key: 'newsletter', label: 'Newsletter', icon: MailIcon },
]

export function getDashboardTabLabel(tab: DashboardTab) {
  return NAVIGATION_ITEMS.find((item) => item.key === tab)?.label ?? 'Dashboard'
}

function getInitials(name: string | null | undefined) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return initials?.toUpperCase() || 'TBC'
}

export function DashboardSidebar({
  member,
  activeTab,
  onTabChange,
  onSignOut,
  onTitleClick,
  canUseMemberViewToggle,
  showLinkAnalyticsTab,
  showNftApprovalsTab,
  showNewsletterTab,
  forceMemberView,
  onToggleMemberView,
  pictureUrl,
}: DashboardNavigationProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const memberName = member?.Name || 'Member'
  const memberEmail = member?.['TBC Email'] || 'TBC member account'
  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (item.key === 'nft-approvals') return showNftApprovalsTab
    if (item.key === 'link-analytics') return showLinkAnalyticsTab
    if (item.key === 'newsletter') return showNewsletterTab
    return true
  })

  const handleNavigation = (tab: DashboardTab) => {
    onTabChange(tab)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="TBC Member Portal"
              onClick={onTitleClick}
            >
              <Image
                src="/assets/tbc-logo.png"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-lg object-cover"
                priority
              />
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate font-semibold">TBC Member Portal</span>
                <span className="truncate text-xs text-sidebar-foreground/60">Dashboard</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Dashboard navigation">
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        type="button"
                        tooltip={item.label}
                        isActive={activeTab === item.key}
                        onClick={() => handleNavigation(item.key)}
                        aria-current={activeTab === item.key ? 'page' : undefined}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip={`${memberName} account`}
                aria-label={`Account menu for ${memberName}`}
              >
                <DropdownMenuTrigger>
                  <Avatar size="sm">
                    {pictureUrl && <AvatarImage src={pictureUrl} alt={memberName} />}
                    <AvatarFallback>{getInitials(member?.Name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                    <span className="truncate font-medium">{memberName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{memberEmail}</span>
                  </span>
                  <ChevronsUpDownIcon className="ml-auto" />
                </DropdownMenuTrigger>
              </SidebarMenuButton>
              <DropdownMenuContent
                side={isMobile ? 'top' : 'right'}
                align="end"
                sideOffset={8}
                className="min-w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-foreground">{memberName}</span>
                      <span className="truncate font-normal">{member?.Role || memberEmail}</span>
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                {canUseMemberViewToggle && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuCheckboxItem
                        checked={forceMemberView}
                        onCheckedChange={(checked) => onToggleMemberView(checked === true)}
                      >
                        Normal Member View
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
                    <LogOutIcon />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function DashboardTopbar({ activeTab }: { activeTab: DashboardTab }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{getDashboardTabLabel(activeTab)}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">TUM Blockchain Club</p>
      </div>
    </header>
  )
}
