import { DOMAIN } from "@/้host";

// src/api/upload.ts
export type UploadedImage = {
  image_id: string;
  url: string;
};

export async function uploadImage(
  uri: string,
  token: string
): Promise<UploadedImage> {
  const fileName = uri.split("/").pop() || "image.jpg";

  // เดา mime type แบบง่าย ๆ จากนามสกุล
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await fetch(`${DOMAIN}/images/upload`, {
    method: "POST",
    headers: {
      // สำคัญ: อย่าเซ็ต Content-Type เอง ปล่อยให้ fetch ใส่ boundary ให้
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("upload error:", text);
    throw new Error("Upload failed");
  }

  const json = await res.json();
  // สมมติ response แบบ success_response: { success, message, data: { image_id, url } }
  return json.data as UploadedImage;
}
