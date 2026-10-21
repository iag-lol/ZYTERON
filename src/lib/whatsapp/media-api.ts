import "server-only";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { createMediaHandlers } from "./media-handlers";
import { mediaRepository } from "./media-repository";
import { metaMediaClient } from "./meta-media";
export const mediaHandlers = createMediaHandlers({
  authorize: commercialAdmin,
  repository: mediaRepository,
  meta: metaMediaClient,
});
