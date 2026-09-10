'use client'

import type { ComponentType, SVGProps } from 'react'
import Image from 'next/image'
import {
  BarChart3Icon,
  BadgeCheckIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  CoffeeIcon,
  HexagonIcon,
  HouseIcon,
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

type NavigationItem = {
  key: DashboardTab
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const NAVIGATION_GROUPS: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: 'Platform',
    items: [
      { key: 'home', label: 'Home', icon: HouseIcon },
      { key: 'profile', label: 'My Profile', icon: UserIcon },
      { key: 'coffee-chats', label: 'Coffee Chats', icon: CoffeeIcon },
      { key: 'members', label: 'All Members', icon: UsersIcon },
      { key: 'events', label: 'Events', icon: CalendarIcon },
      { key: 'attendance', label: 'Attendance', icon: BadgeCheckIcon },
      { key: 'nft-status', label: 'NFT Status', icon: HexagonIcon },
    ],
  },
  {
    label: 'Administration',
    items: [
      { key: 'stats', label: 'Statistics', icon: BarChart3Icon },
      { key: 'link-analytics', label: 'Link Analytics', icon: LinkIcon },
      { key: 'nft-approvals', label: 'NFT Approvals', icon: HexagonIcon },
      { key: 'newsletter', label: 'Newsletter', icon: MailIcon },
    ],
  },
]

const NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((group) => group.items)

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
  const isItemVisible = (item: NavigationItem) => {
    if (item.key === 'nft-approvals') return showNftApprovalsTab
    if (item.key === 'link-analytics') return showLinkAnalyticsTab
    if (item.key === 'newsletter') return showNewsletterTab
    return true
  }

  const handleNavigation = (tab: DashboardTab) => {
    onTabChange(tab)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3 pb-2 group-data-[collapsible=icon]:p-2">
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

      <SidebarContent className="gap-2 py-2">
        <nav aria-label="Dashboard navigation">
          {NAVIGATION_GROUPS.map((group) => {
            const visibleItems = group.items.filter(isItemVisible)
            if (visibleItems.length === 0) return null

            return (
              <SidebarGroup
                key={group.label}
                className="px-3 py-1 group-data-[collapsible=icon]:px-2"
              >
                <SidebarGroupLabel className="mb-1 px-3 text-[0.6875rem] tracking-wide text-sidebar-foreground/50">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
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
                            className="h-9 px-3 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:px-2"
                          >
                            <Icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="p-3 pt-2 group-data-[collapsible=icon]:p-2">
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
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => handleNavigation('profile')}>
                    <UserIcon />
                    My Profile
                  </DropdownMenuItem>
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
