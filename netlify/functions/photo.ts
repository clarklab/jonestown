import { getStore } from "@netlify/blobs";

/**
 * Per-couple photo storage. Each couple has its own blob namespace.
 *
 *   POST /api/photo            multipart { slug, id?, file } → { id }
 *   GET  /api/photo/:id?slug=… → serves the image bytes
 */

function getPhotoStore() {
  return getStore({ name: "jonestown-photos", consistency: "strong" });
}

function uuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2) +
      "-" +
      Math.random().toString(36).slice(2);
}

function key(slug: string, id: string) {
  return `${slug}/${id}`;
}

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments.length >= 3 ? segments[segments.length - 1] : null;

    if (req.method === "POST") {
      const ct = req.headers.get("content-type") ?? "";
      const store = getPhotoStore();

      let bodyBuffer: ArrayBuffer;
      let type = "application/octet-stream";
      let providedId: string | null = null;
      let slug: string | null = null;

      if (ct.startsWith("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof Blob)) {
          return new Response(JSON.stringify({ error: "missing file" }), {
            status: 400,
          });
        }
        bodyBuffer = await file.arrayBuffer();
        type = file.type || type;
        const i = form.get("id");
        providedId = typeof i === "string" && i ? i : null;
        const s = form.get("slug");
        slug = typeof s === "string" && s ? s : null;
      } else {
        bodyBuffer = await req.arrayBuffer();
        type = ct || type;
        providedId = req.headers.get("x-photo-id");
        slug = url.searchParams.get("slug");
      }

      if (!slug || !/^[a-z0-9-]{2,48}$/.test(slug)) {
        return new Response(JSON.stringify({ error: "missing slug" }), {
          status: 400,
        });
      }

      const photoId = providedId || uuid();
      await store.set(key(slug, photoId), bodyBuffer, {
        metadata: { contentType: type, slug },
      });

      return new Response(JSON.stringify({ id: photoId }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (req.method === "GET") {
      if (!id) {
        return new Response(JSON.stringify({ error: "missing id" }), {
          status: 400,
        });
      }
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return new Response(JSON.stringify({ error: "missing slug" }), {
          status: 400,
        });
      }
      const store = getPhotoStore();
      const result = await store.getWithMetadata(key(slug, id), {
        type: "arrayBuffer",
      });
      if (!result) {
        return new Response("not found", { status: 404 });
      }
      const contentType =
        (result.metadata?.contentType as string | undefined) ?? "image/webp";
      return new Response(result.data, {
        status: 200,
        headers: {
          "content-type": contentType,
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};

export const config = { path: "/api/photo*" };
