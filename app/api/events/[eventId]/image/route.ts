import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    eventId: string
  }>
}

const EVENT_IMAGE_BUCKET = "event-images"

const fileExtension = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "")
  return extension || "png"
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const formData = await request.formData()
    const image = formData.get("image")

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 })
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)
    const objectPath = `${eventId}/${Date.now()}.${fileExtension(image.name)}`

    const { error: uploadError } = await dataClient.storage
      .from(EVENT_IMAGE_BUCKET)
      .upload(objectPath, image, {
        cacheControl: "3600",
        upsert: false,
        contentType: image.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = dataClient.storage.from(EVENT_IMAGE_BUCKET).getPublicUrl(objectPath)

    const imageUrl = `${publicUrl}?t=${Date.now()}`
    const { data, error } = await dataClient
      .from("events")
      .update({ image_url: imageUrl })
      .eq("id", eventId)
      .select("image_url")
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not save the uploaded image." }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not upload the event image."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
