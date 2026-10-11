import { handleMediaUpload } from "@/lib/admin/media-upload";

export async function POST(request: Request) {
  return handleMediaUpload(request, "casos");
}
