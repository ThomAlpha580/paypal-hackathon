import { useRef, useState } from "react"
import {
  HistoryIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import useUser from "@/hooks/use-user"
import useBilling from "@/hooks/use-billing"
import { useAlphaChats } from "@/hooks/use-alpha-chats"
import { alphaErrorKey } from "@/lib/alpha-state"
import { AlphaResearchConversation } from "./alpha-research-conversation"
import { AlphaResearchWelcome } from "./alpha-research-welcome"

function Research({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { chatId = null } = useParams<{ chatId?: string }>()
  const { setSignInModalOpen } = useUser()
  const { refreshBilling } = useBilling()
  const { chats, loading, error, refresh, create, remove } =
    useAlphaChats(userId)
  const [creating, setCreating] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<API.AlphaChat | null>(null)
  const [deleting, setDeleting] = useState(false)
  const createLock = useRef(false)
  const changed = () => {
    refresh()
    void refreshBilling().catch(() => {})
  }
  const createResearch = async (content: string) => {
    if (!userId) {
      setSignInModalOpen(true)
      return false
    }
    if (createLock.current) return false
    createLock.current = true
    setCreating(true)
    try {
      const accepted = await create(content)
      navigate(`/alpha/research/${accepted.chat.id}`)
      changed()
      return true
    } catch (reason) {
      toast.error(t(alphaErrorKey(reason)))
      return false
    } finally {
      createLock.current = false
      setCreating(false)
    }
  }
  const selectChat = (id: string | null) => {
    navigate(id ? `/alpha/research/${id}` : "/alpha/research")
    setMobileOpen(false)
  }
  const history = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-4">
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() => selectChat(null)}
        >
          <PlusIcon />
          {t("alpha.newResearch")}
        </Button>
      </div>
      <div className="px-5 pt-4 pb-2 text-xs font-medium text-muted-foreground">
        {t("alpha.history")}
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 pb-4 [&>div>div]:block!">
        {loading && !chats.length ? (
          <div className="space-y-2" aria-label={t("alpha.loading")}>
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-9 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="p-2 text-sm text-destructive">
            <p>{t("alpha.errors.generic")}</p>
            <Button size="sm" variant="ghost" onClick={refresh}>
              {t("alpha.retry")}
            </Button>
          </div>
        ) : chats.length ? (
          <div className="flex min-w-0 flex-col gap-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors ${chat.id === chatId ? "bg-muted" : "hover:bg-muted"}`}
              >
                <button
                  type="button"
                  aria-current={chat.id === chatId ? "page" : undefined}
                  title={chat.title}
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => selectChat(chat.id)}
                >
                  {chat.title}
                </button>
                {chat.active_run_id ? (
                  <LoaderCircleIcon
                    aria-label={t("alpha.activity.running")}
                    className="size-4 shrink-0 animate-spin text-muted-foreground"
                  />
                ) : (
                  <button
                    type="button"
                    aria-label={`${t("chat.delete")}: ${chat.title}`}
                    className="rounded p-1 text-muted-foreground transition hover:bg-background hover:text-destructive focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    onClick={() => setDeleteTarget(chat)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-2 text-sm leading-6 text-muted-foreground">
            {t("alpha.emptyHistory")}
          </p>
        )}
      </ScrollArea>
    </div>
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <HistoryIcon />
              {t("alpha.history")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="gap-0">
            <SheetHeader>
              <SheetTitle>{t("alpha.history")}</SheetTitle>
              <SheetDescription>{t("alpha.subtitle")}</SheetDescription>
            </SheetHeader>
            {history}
          </SheetContent>
        </Sheet>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-2xl border bg-card/90 lg:flex">
          {history}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">
          {chatId && userId ? (
            <AlphaResearchConversation
              key={`${userId}:${chatId}`}
              chatId={chatId}
              userId={userId}
              onChanged={changed}
            />
          ) : (
            <AlphaResearchWelcome onSend={createResearch} disabled={creating} />
          )}
        </div>
      </div>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("alpha.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              {t("chat.deleteCancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget || deleting) return
                setDeleting(true)
                try {
                  await remove(deleteTarget.id)
                  if (deleteTarget.id === chatId) selectChat(null)
                  setDeleteTarget(null)
                } catch (reason) {
                  toast.error(t(alphaErrorKey(reason)))
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {t("chat.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AlphaResearchPage() {
  const { isAuthenticated, user } = useUser()
  const userId = isAuthenticated ? user?.id : undefined
  return <Research key={userId ?? "guest"} userId={userId} />
}
