import * as React from "react"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { cjk } from "@streamdown/cjk"
import { Streamdown } from "streamdown"
import {
  ArrowUpIcon,
  CheckCircle2Icon,
  CircleXIcon,
  EllipsisIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { ScrollArea } from "@/components/ui/scroll-area"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createAgentRun,
  deleteAgentConversation,
  getActiveAgentRuns,
  getAgentConversations,
  getAgentMessages,
  getQuotaError,
  getToken,
  renameAgentConversation,
  ApiPrefix,
} from "@/lib/service"
import { cn } from "@/lib/utils"
import useUser from "@/hooks/use-user"
import useBilling from "@/hooks/use-billing"
import { useChatAutoScroll } from "@/hooks/use-chat-auto-scroll"
import chatRobot from "@/assets/chat-robot.png"

type RunState = {
  runId: string
  conversationId: string
  status: API.AgentRunStatus
  content: string
  steps: API.AgentProgressStep[]
  errorMessage?: string | null
}

type StreamSnapshot = {
  run_id?: string
  conversation_id?: string
  status?: API.AgentRunStatus
  content?: string
  error_code?: string | null
  error_message?: string | null
  steps?: API.AgentProgressStep[]
}

const TERMINAL_STATUSES = new Set<API.AgentRunStatus>([
  "completed",
  "failed",
  "cancelled",
])

function mergeProgressSteps(
  current: API.AgentProgressStep[],
  incoming?: API.AgentProgressStep[]
) {
  if (!incoming?.length) return current

  const currentById = new Map(current.map((step) => [step.id, step]))
  const mergedIds = new Set<string>()
  const merged = incoming.map((step) => {
    mergedIds.add(step.id)
    return { ...currentById.get(step.id), ...step }
  })

  for (const step of current) {
    if (!mergedIds.has(step.id)) merged.push(step)
  }

  return merged
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date)
}

function getErrorMessage(error: unknown) {
  const requestError = error as {
    data?: { detail?: string | { message?: string } }
    message?: string
  }
  const detail = requestError?.data?.detail

  if (typeof detail === "string") return detail
  if (detail?.message) return detail.message
  return requestError?.message ?? ""
}

function getInitialChatDraft() {
  return new URLSearchParams(window.location.search).get("symbol")?.trim() ?? ""
}

export function ChatPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id: selectedConversationId = null } = useParams<{ id: string }>()
  const { isAuthenticated, setSignInModalOpen, user } = useUser()
  const { refreshBilling } = useBilling()
  const [conversations, setConversations] = React.useState<
    API.AgentConversation[]
  >([])
  const [messagesByConversation, setMessagesByConversation] = React.useState<
    Record<string, API.AgentMessage[]>
  >({})
  const [runStates, setRunStates] = React.useState<
    Record<string, RunState | undefined>
  >({})
  const [draft, setDraft] = React.useState(getInitialChatDraft)
  const [loadingConversations, setLoadingConversations] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [renameTarget, setRenameTarget] =
    React.useState<API.AgentConversation | null>(null)
  const [renameTitle, setRenameTitle] = React.useState("")
  const [renaming, setRenaming] = React.useState(false)
  const [deleteTarget, setDeleteTarget] =
    React.useState<API.AgentConversation | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const subscriptionsRef = React.useRef(new Map<string, AbortController>())

  const loadConversations = React.useCallback(async () => {
    if (!isAuthenticated) return []

    const page = await getAgentConversations({ limit: 50 })
    setConversations(page.items)
    return page.items
  }, [isAuthenticated])

  const loadMessages = React.useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated) return []

      const page = await getAgentMessages({
        conversationId,
        limit: 200,
      })
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: page.items,
      }))
      return page.items
    },
    [isAuthenticated]
  )

  const subscribeToRun = React.useCallback(
    (runId: string, conversationId: string) => {
      if (subscriptionsRef.current.has(runId)) return

      const controller = new AbortController()
      subscriptionsRef.current.set(runId, controller)
      setRunStates((current) => ({
        ...current,
        [conversationId]: {
          runId,
          conversationId,
          status: current[conversationId]?.status ?? "queued",
          content: current[conversationId]?.content ?? "",
          steps: current[conversationId]?.steps ?? [],
        },
      }))

      const finishSubscription = async () => {
        try {
          await loadMessages(conversationId)
          await loadConversations()
        } catch (error) {
          console.error("Failed to refresh agent chat after run:", error)
        } finally {
          subscriptionsRef.current.delete(runId)
        }
      }

      void fetchEventSource(`${ApiPrefix}/agent/runs/${runId}/events`, {
        headers: {
          Authorization: `Bearer ${getToken() ?? ""}`,
        },
        signal: controller.signal,
        openWhenHidden: true,
        onmessage: (event) => {
          if (!event.data) return

          try {
            const payload = JSON.parse(event.data) as StreamSnapshot
            const status = payload.status
            const content =
              typeof payload.content === "string" ? payload.content : undefined

            if (event.event === "error") {
              setRunStates((current) => ({
                ...current,
                [conversationId]: {
                  runId,
                  conversationId,
                  status: "failed",
                  content: content ?? current[conversationId]?.content ?? "",
                  steps: mergeProgressSteps(
                    current[conversationId]?.steps ?? [],
                    payload.steps
                  ),
                  errorMessage:
                    payload.error_message ?? t("chat.streamUnavailable"),
                },
              }))
              return
            }

            setRunStates((current) => ({
              ...current,
              [conversationId]: {
                runId,
                conversationId,
                status: status ?? current[conversationId]?.status ?? "running",
                content: content ?? current[conversationId]?.content ?? "",
                steps: mergeProgressSteps(
                  current[conversationId]?.steps ?? [],
                  payload.steps
                ),
                errorMessage: payload.error_message,
              },
            }))
          } catch (error) {
            console.error("Failed to parse agent chat event:", error)
          }
        },
        onerror: (error) => {
          if (!controller.signal.aborted) throw error
        },
      })
        .then(() => finishSubscription())
        .catch((error) => {
          if (controller.signal.aborted) return

          console.error("Agent chat stream failed:", error)
          setRunStates((current) => ({
            ...current,
            [conversationId]: {
              runId,
              conversationId,
              status: "failed",
              content: current[conversationId]?.content ?? "",
              steps: current[conversationId]?.steps ?? [],
              errorMessage: t("chat.streamError"),
            },
          }))
          subscriptionsRef.current.delete(runId)
          toast.error(t("chat.streamError"))
        })
    },
    [loadConversations, loadMessages, t]
  )

  React.useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let cancelled = false
    const subscriptions = subscriptionsRef.current

    void Promise.all([
      getAgentConversations({ limit: 50 }),
      getActiveAgentRuns(),
    ])
      .then(([conversationPage, activeRuns]) => {
        if (cancelled) return

        setConversations(conversationPage.items)
        for (const run of activeRuns) {
          setRunStates((current) => ({
            ...current,
            [run.conversation_id]: {
              runId: run.id,
              conversationId: run.conversation_id,
              status: run.status,
              content: "",
              steps: run.steps ?? [],
            },
          }))
          subscribeToRun(run.id, run.conversation_id)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load agent conversations:", error)
          toast.error(t("chat.loadError"))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false)
      })

    return () => {
      cancelled = true
      for (const controller of subscriptions.values()) {
        controller.abort()
      }
      subscriptions.clear()
    }
  }, [isAuthenticated, loadMessages, subscribeToRun, t])

  React.useEffect(() => {
    if (!isAuthenticated || !selectedConversationId) return

    let cancelled = false
    void getAgentMessages({
      conversationId: selectedConversationId,
      limit: 200,
    })
      .then((page) => {
        if (cancelled) return
        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversationId]: page.items,
        }))
      })
      .catch((error) => {
        if (cancelled) return
        console.error("Failed to load agent messages:", error)
        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversationId]: current[selectedConversationId] ?? [],
        }))
        toast.error(t("chat.messagesError"))
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, selectedConversationId, t])

  const visibleConversationId = isAuthenticated ? selectedConversationId : null
  const visibleConversations = isAuthenticated ? conversations : []
  const loadingMessages = Boolean(
    visibleConversationId && !messagesByConversation[visibleConversationId]
  )

  const selectedMessages = React.useMemo(
    () =>
      visibleConversationId
        ? (messagesByConversation[visibleConversationId] ?? [])
        : [],
    [messagesByConversation, visibleConversationId]
  )
  const selectedRun = visibleConversationId
    ? runStates[visibleConversationId]
    : undefined
  const canSend =
    draft.trim().length > 0 &&
    !submitting &&
    selectedRun?.status !== "queued" &&
    selectedRun?.status !== "running"

  const displayMessages = React.useMemo(() => {
    if (!selectedRun) return selectedMessages

    const hasPersistedAssistant = selectedMessages.some(
      (message) =>
        message.role === "assistant" && message.run_id === selectedRun.runId
    )
    if (hasPersistedAssistant) {
      return selectedMessages.map((message) => {
        if (
          message.role !== "assistant" ||
          message.run_id !== selectedRun.runId
        ) {
          return message
        }

        return {
          ...message,
          metadata: {
            ...message.metadata,
            steps: mergeProgressSteps(
              selectedRun.steps,
              message.metadata?.steps
            ),
          },
        }
      })
    }

    const runMessage: API.AgentMessage = {
      id: `stream-${selectedRun.runId}`,
      conversation_id: selectedRun.conversationId,
      run_id: selectedRun.runId,
      user_id: user?.id ?? "",
      role: "assistant",
      content: selectedRun.content,
      status: selectedRun.status === "failed" ? "failed" : "completed",
      client_message_id: null,
      metadata: { steps: selectedRun.steps },
      created_at: new Date().toISOString(),
    }

    return [...selectedMessages, runMessage]
  }, [selectedMessages, selectedRun, user?.id])

  const { viewportRef, contentRef } = useChatAutoScroll(
    visibleConversationId,
    displayMessages
  )

  const handleNewConversation = () => {
    void navigate("/chat")
    setDraft("")
  }

  const handleSelectConversation = (conversationId: string) => {
    void navigate(`/chat/${encodeURIComponent(conversationId)}`)
    setDraft("")
  }

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !canSend) return
    if (!isAuthenticated) {
      setSignInModalOpen(true)
      return
    }

    const clientMessageId = createId()
    setSubmitting(true)
    setDraft("")

    try {
      const response = await createAgentRun({
        conversation_id: selectedConversationId,
        content,
        client_message_id: clientMessageId,
      })
      const conversationId = response.conversation_id
      const now = new Date().toISOString()
      const optimisticMessage: API.AgentMessage = {
        id: response.user_message_id,
        conversation_id: conversationId,
        run_id: response.run_id,
        user_id: user?.id ?? "",
        role: "user",
        content,
        status: "completed",
        client_message_id: clientMessageId,
        metadata: {},
        created_at: now,
      }

      if (selectedConversationId !== conversationId) {
        void navigate(`/chat/${encodeURIComponent(conversationId)}`, {
          replace: true,
        })
      }
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [
          ...(current[conversationId] ?? []).filter(
            (message) => message.id !== optimisticMessage.id
          ),
          optimisticMessage,
        ],
      }))
      setConversations((current) => {
        const existing = current.find(
          (conversation) => conversation.id === conversationId
        )
        if (existing) {
          return current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updated_at: now,
                  active_run_id: response.run_id,
                }
              : conversation
          )
        }

        return [
          {
            id: conversationId,
            user_id: user?.id ?? "",
            title: content.slice(0, 80),
            status: "active",
            active_run_id: response.run_id,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
          ...current,
        ]
      })
      setRunStates((current) => ({
        ...current,
        [conversationId]: {
          runId: response.run_id,
          conversationId,
          status: response.status,
          content: "",
          steps: [],
        },
      }))
      subscribeToRun(response.run_id, conversationId)
      void refreshBilling().catch((error) => {
        console.error("Failed to refresh Chat usage:", error)
      })
    } catch (error) {
      console.error("Failed to create agent run:", error)
      setDraft(content)
      const quotaError = getQuotaError(error)
      toast.error(
        quotaError
          ? t("chat.quotaReached")
          : getErrorMessage(error) || t("chat.sendError")
      )
      if (quotaError) {
        void refreshBilling().catch((refreshError) => {
          console.error("Failed to refresh Chat usage:", refreshError)
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenRename = (conversation: API.AgentConversation) => {
    setRenameTarget(conversation)
    setRenameTitle(conversation.title)
  }

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!renameTarget) return

    const title = renameTitle.trim()
    if (!title || renaming) return

    setRenaming(true)
    try {
      const updated = await renameAgentConversation({
        conversationId: renameTarget.id,
        title,
      })
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === updated.id
            ? { ...conversation, ...updated }
            : conversation
        )
      )
      setRenameTarget(null)
    } catch (error) {
      console.error("Failed to rename agent conversation:", error)
      toast.error(getErrorMessage(error) || t("chat.renameError"))
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    const conversationId = deleteTarget.id
    setDeleting(true)
    try {
      await deleteAgentConversation(conversationId)
      const run = runStates[conversationId]
      if (run) {
        subscriptionsRef.current.get(run.runId)?.abort()
        subscriptionsRef.current.delete(run.runId)
      }
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId)
      )
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setRunStates((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      if (selectedConversationId === conversationId) {
        void navigate("/chat", { replace: true })
        setDraft("")
      }
      setDeleteTarget(null)
    } catch (error) {
      console.error("Failed to delete agent conversation:", error)
      toast.error(getErrorMessage(error) || t("chat.deleteError"))
    } finally {
      setDeleting(false)
    }
  }

  const composer = (
    <form
      onSubmit={(event) => void handleSend(event)}
      className={cn(
        "mx-auto w-full shrink-0 bg-background",
        visibleConversationId ? "max-w-4xl px-4 pb-3 sm:px-6" : "mt-6"
      )}
    >
      <div className="flex w-full items-end gap-2 rounded-2xl bg-muted/70 p-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder={t("chat.placeholder")}
          className="max-h-36 min-h-18 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 shadow-none focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent"
          disabled={
            submitting ||
            selectedRun?.status === "queued" ||
            selectedRun?.status === "running"
          }
          aria-label={t("chat.placeholder")}
        />
        <Button
          type="submit"
          size="icon"
          className="mb-0.5 rounded-full"
          disabled={!canSend}
          aria-label={t("chat.send")}
        >
          {submitting ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <ArrowUpIcon className="size-5" />
          )}
        </Button>
      </div>
    </form>
  )

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      <aside className="flex w-52 min-w-0 shrink-0 flex-col rounded-xl border p-3 sm:w-64 lg:w-72">
        <div className="mb-3">
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={handleNewConversation}
          >
            <PlusIcon className="size-4" />
            <span>{t("chat.newConversation")}</span>
          </Button>
        </div>
        <div className="pb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {t("chat.recent")}
        </div>
        <ScrollArea className="min-h-0 min-w-0 flex-1 pb-2 [&_[data-slot=scroll-area-viewport]>div]:block!">
          {isAuthenticated && loadingConversations ? (
            <div className="space-y-2 px-1">
              {["one", "two", "three"].map((item) => (
                <div
                  key={item}
                  className="h-10 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-muted-foreground">
              {t("chat.emptyConversations")}
            </div>
          ) : (
            <div className="space-y-1">
              {visibleConversations.map((conversation) => {
                const run = runStates[conversation.id]
                const active = conversation.id === visibleConversationId

                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex w-full min-w-0 items-stretch rounded-lg text-left transition-colors hover:bg-muted",
                      active && "bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-3 py-2 text-left"
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {conversation.title}
                        </span>
                        {run && !TERMINAL_STATUSES.has(run.status) ? (
                          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin text-primary" />
                        ) : null}
                      </div>
                      <div className="mt-1 pl-6 text-[11px] text-muted-foreground">
                        {formatDate(conversation.updated_at)}
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-1 mr-1 self-start opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          aria-label={t("chat.conversationActions")}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <EllipsisIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-36">
                        <DropdownMenuItem
                          onSelect={() => handleOpenRename(conversation)}
                        >
                          <PencilIcon />
                          {t("chat.rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget(conversation)}
                        >
                          <Trash2Icon />
                          {t("chat.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {!visibleConversationId ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="m-auto w-full max-w-xl py-6">
              <div className="flex flex-col items-center text-center">
                <img
                  src={chatRobot}
                  alt=""
                  className="mb-4 size-20 object-contain"
                />
                <h2 className="text-xl font-semibold">{t("chat.welcome")}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {t("chat.welcomeDescription")}
                </p>
              </div>

              {composer}
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
              <div
                ref={contentRef}
                className={
                  "mx-auto flex h-full min-h-full w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6"
                }
              >
                {loadingMessages && selectedMessages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-20 text-sm text-muted-foreground">
                    <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                    {t("chat.loadingMessages")}
                  </div>
                ) : displayMessages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <MessageCircleIcon className="size-6" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("chat.emptyMessages")}
                    </p>
                  </div>
                ) : (
                  displayMessages.map((message) => {
                    const isUser = message.role === "user"
                    const progressSteps =
                      !isUser && Array.isArray(message.metadata?.steps)
                        ? message.metadata.steps
                        : []
                    const isStreaming =
                      message.id === `stream-${selectedRun?.runId}`
                    const isFailed =
                      isStreaming && selectedRun?.status === "failed"
                    const isCancelled =
                      isStreaming && selectedRun?.status === "cancelled"

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-start gap-3",
                          isUser && "justify-end"
                        )}
                      >
                        {!isUser ? (
                          <img
                            src={chatRobot}
                            alt=""
                            className="size-8 shrink-0 object-contain"
                          />
                        ) : null}
                        <div
                          className={cn(
                            "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6",
                            isUser
                              ? "rounded-tr-sm bg-primary text-primary-foreground"
                              : "rounded-tl-sm bg-muted/70",
                            (isFailed || isCancelled) &&
                              "border border-destructive/30 bg-destructive/5 text-destructive"
                          )}
                        >
                          {progressSteps.length > 0 ? (
                            <div className="mb-3 rounded-xl border bg-background/30 p-3 text-foreground">
                              <div className="mb-2 text-xs font-medium text-muted-foreground">
                                {t("chat.progressTitle")}
                              </div>
                              <div className="space-y-2">
                                {progressSteps.map((step) => {
                                  const StepIcon =
                                    step.status === "completed"
                                      ? CheckCircle2Icon
                                      : step.status === "failed"
                                        ? CircleXIcon
                                        : LoaderCircleIcon
                                  const statusClassName =
                                    step.status === "completed"
                                      ? "text-emerald-500"
                                      : step.status === "failed"
                                        ? "text-destructive"
                                        : "animate-spin text-primary"
                                  const progressLabel = step.label?.startsWith(
                                    "agent.progress."
                                  )
                                    ? t(step.label, {
                                        defaultValue: t(
                                          "agent.progress.execute_tool"
                                        ),
                                      })
                                    : step.label ||
                                      t("agent.progress.execute_tool")

                                  return (
                                    <div
                                      key={step.id}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <StepIcon
                                        className={cn(
                                          "size-3.5",
                                          statusClassName
                                        )}
                                      />
                                      <span className="min-w-0 flex-1 truncate">
                                        {progressLabel}
                                      </span>
                                      <span className="shrink-0 text-muted-foreground">
                                        {t(`chat.progress.${step.status}`, {
                                          defaultValue: step.status,
                                        })}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null}

                          {isStreaming &&
                          !message.content &&
                          !isFailed &&
                          !isCancelled ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <LoaderCircleIcon className="size-4 animate-spin" />
                              <span>{t("chat.thinking")}</span>
                            </div>
                          ) : isFailed ? (
                            <span>
                              {selectedRun?.errorMessage || t("chat.runFailed")}
                            </span>
                          ) : isCancelled ? (
                            <span>{t("chat.cancelled")}</span>
                          ) : isUser ? (
                            <span className="whitespace-pre-wrap">
                              {message.content}
                            </span>
                          ) : (
                            <Streamdown plugins={{ cjk }}>
                              {message.content || t("chat.thinking")}
                            </Streamdown>
                          )}
                        </div>
                        {isUser ? (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <UserRoundIcon className="size-4" />
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>

            {composer}
          </>
        )}
      </div>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open && !renaming) setRenameTarget(null)
        }}
      >
        <DialogContent>
          <form onSubmit={(event) => void handleRename(event)}>
            <DialogHeader>
              <DialogTitle>{t("chat.renameTitle")}</DialogTitle>
              <DialogDescription>
                {t("chat.renameDescription")}
              </DialogDescription>
            </DialogHeader>
            <Input
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              placeholder={t("chat.renamePlaceholder")}
              maxLength={80}
              autoFocus
              className="mt-4"
              disabled={renaming}
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
                disabled={renaming}
              >
                {t("chat.renameCancel")}
              </Button>
              <Button type="submit" disabled={!renameTitle.trim() || renaming}>
                {renaming ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {t("chat.renameSave")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("chat.deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {t("chat.deleteCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? <LoaderCircleIcon className="animate-spin" /> : null}
              {t("chat.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
