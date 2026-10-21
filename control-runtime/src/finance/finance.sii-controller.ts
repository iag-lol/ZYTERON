import { Body, Controller, Get, Headers, Param, Post, Res, StreamableFile } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { rolesFor } from "./finance.access.js";
import { SiiCertificationWorkspace } from "./finance.sii-workspace.js";
import type { FinanceActor, Row } from "./finance.util.js";

type HeadersMap = Record<string, string | undefined>;
const actor = (headers: HeadersMap): FinanceActor => ({
  userId: headers["x-zyteron-user-id"] || null,
  role: headers["x-zyteron-role"] || "",
});
@Controller("finance/certification")
@RequireRoles(...rolesFor("dte.manage"))
export class SiiCertificationController {
  constructor(private readonly workspace: SiiCertificationWorkspace) {}
  @Get() overview(@Headers() h: HeadersMap) {
    return this.workspace.overview(actor(h));
  }
  @Get("drafts/:hash") draft(@Param("hash") hash: string, @Headers() h: HeadersMap) {
    return this.workspace.draft(hash, actor(h));
  }
  @Post("drafts/:hash") saveDraft(
    @Param("hash") hash: string,
    @Body() body: unknown,
    @Headers() h: HeadersMap,
  ) {
    return this.workspace.saveDraft(hash, body, actor(h));
  }
  @Post("inspect") inspect(@Body() body: Row, @Headers() h: HeadersMap) {
    return this.workspace.inspect(body, actor(h));
  }
  @Get("clients/:id") clientParty(@Param("id") id: string, @Headers() h: HeadersMap) {
    return this.workspace.clientParty(id, actor(h));
  }
  @Post("prepare") prepare(@Body() body: unknown, @Headers() h: HeadersMap) {
    return this.workspace.prepare(body, actor(h));
  }
  @Get("runs/:id") detail(@Param("id") id: string, @Headers() h: HeadersMap) {
    return this.workspace.detail(id, actor(h));
  }
  @Post("runs/:runId/submissions/:id/submit")
  @RequireRoles(...rolesFor("dte.issue"))
  submit(@Param("runId") runId: string, @Param("id") id: string, @Headers() h: HeadersMap) {
    return this.workspace.submit(runId, id, actor(h));
  }
  @Post("runs/:runId/submissions/:id/refresh")
  refresh(@Param("runId") runId: string, @Param("id") id: string, @Headers() h: HeadersMap) {
    return this.workspace.refresh(runId, id, actor(h));
  }
  @Post("runs/:runId/submissions/:id/recover")
  @RequireRoles(...rolesFor("dte.issue"))
  recover(@Param("runId") runId: string, @Param("id") id: string, @Headers() h: HeadersMap) {
    return this.workspace.recoverReceipt(runId, id, actor(h));
  }
  @Post("runs/:runId/exchange")
  exchange(@Param("runId") runId: string, @Body() body: unknown, @Headers() h: HeadersMap) {
    return this.workspace.exchange(runId, body, actor(h));
  }
  @Get("runs/:runId/artifacts/:id")
  async download(
    @Param("runId") runId: string,
    @Param("id") id: string,
    @Headers() h: HeadersMap,
    @Res({ passthrough: true }) res: { setHeader: (key: string, value: string) => void },
  ) {
    const file = await this.workspace.download(runId, id, actor(h));
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(file.bytes);
  }
}
