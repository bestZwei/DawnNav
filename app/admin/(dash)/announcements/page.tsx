"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Megaphone, Pencil, Plus, Trash2, Loader2, CalendarClock, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toast } from "sonner"
import { createAnnouncement, deleteAnnouncement, getAnnouncements, updateAnnouncement } from "@/lib/actions"
import { resolveActionError } from "@/lib/action-error"

interface AnnouncementItem {
  id: string
  title: string
  content: string
  linkUrl: string | null
  linkText: string | null
  isPublished: boolean
  startAt: string | null
  endAt: string | null
  createdAt: string
}

interface FormState {
  title: string
  content: string
  linkUrl: string
  linkText: string
  isPublished: boolean
  startAt: string
  endAt: string
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  linkUrl: "",
  linkText: "",
  isPublished: true,
  startAt: "",
  endAt: "",
}

// datetime-local 的值与 Date 互转（值为空表示不限制时间窗）
function toLocalInputValue(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateOrNull(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export default function AnnouncementsPage() {
  const t = useTranslations("admin.announcements")
  const tc = useTranslations("common")
  const tAE = useTranslations("actionErrors")
  const router = useRouter()

  const [items, setItems] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getAnnouncements()
    if (result.success) {
      setItems(
        (result.data as unknown as AnnouncementItem[]).map((item) => ({
          ...item,
          startAt: item.startAt ? String(item.startAt) : null,
          endAt: item.endAt ? String(item.endAt) : null,
          createdAt: String(item.createdAt),
        }))
      )
    } else {
      toast.error(t("loadFailed"), {
        description: resolveActionError(tAE, result.error, t("loadFailed")),
      })
    }
    setLoading(false)
  }, [t, tAE])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (item: AnnouncementItem) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      content: item.content,
      linkUrl: item.linkUrl || "",
      linkText: item.linkText || "",
      isPublished: item.isPublished,
      startAt: toLocalInputValue(item.startAt),
      endAt: toLocalInputValue(item.endAt),
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    const payload = {
      title: form.title,
      content: form.content,
      linkUrl: form.linkUrl || null,
      linkText: form.linkText || null,
      isPublished: form.isPublished,
      startAt: toDateOrNull(form.startAt),
      endAt: toDateOrNull(form.endAt),
    }
    const result = editingId
      ? await updateAnnouncement(editingId, payload)
      : await createAnnouncement(payload)
    setSaving(false)

    if (result.success) {
      toast.success(t(editingId ? "saveSuccess" : "createSuccess"))
      setFormOpen(false)
      await load()
      router.refresh()
    } else {
      toast.error(t("saveFailed"), {
        description: resolveActionError(tAE, result.error, t("saveFailed")),
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const result = await deleteAnnouncement(deleteTarget.id)
    setDeleteTarget(null)
    if (result.success) {
      toast.success(t("deleteSuccess"))
      await load()
      router.refresh()
    } else {
      toast.error(t("deleteFailed"), {
        description: resolveActionError(tAE, result.error, t("deleteFailed")),
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <CardDescription>{t("desc")}</CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tc("loading")}
            </div>
          ) : items.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Megaphone className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("emptyDesc")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <Badge variant={item.isPublished ? "default" : "secondary"}>
                      {item.isPublished ? t("published") : t("draft")}
                    </Badge>
                    {(item.startAt || item.endAt) && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {item.startAt ? new Date(item.startAt).toLocaleString() : t("noLimit")}
                        {" → "}
                        {item.endAt ? new Date(item.endAt).toLocaleString() : t("noLimit")}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.content}
                  </p>
                  {item.linkUrl && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <LinkIcon className="h-3.5 w-3.5" />
                      {item.linkText || item.linkUrl}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t("editTitle") : t("createTitle")}</DialogTitle>
            <DialogDescription>{t("formDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">{t("fieldTitle")}</Label>
              <Input
                id="announcement-title"
                value={form.title}
                maxLength={100}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("titlePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-content">{t("fieldContent")}</Label>
              <Textarea
                id="announcement-content"
                value={form.content}
                rows={6}
                maxLength={5000}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={t("contentPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("markdownHint")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="announcement-link">{t("fieldLink")}</Label>
                <Input
                  id="announcement-link"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-link-text">{t("fieldLinkText")}</Label>
                <Input
                  id="announcement-link-text"
                  value={form.linkText}
                  maxLength={50}
                  onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                  placeholder={t("linkTextPlaceholder")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="announcement-start">{t("fieldStartAt")}</Label>
                <Input
                  id="announcement-start"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-end">{t("fieldEndAt")}</Label>
                <Input
                  id="announcement-end"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="announcement-published">{t("fieldPublished")}</Label>
                <p className="text-xs text-muted-foreground">{t("publishedHint")}</p>
              </div>
              <Switch
                id="announcement-published"
                checked={form.isPublished}
                onCheckedChange={(checked) => setForm({ ...form, isPublished: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
