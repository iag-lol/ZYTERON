import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { SalesWorkspaceService } from "./sales-workspace.service.js";
import { actor } from "./sales-workspace.validation.js";
import type { Row } from "./sales-workspace.types.js";
type H = Record<string, string | undefined>;
@Controller("sales-workspace")
@RequireRoles("GERENTE_GENERAL", "EJECUTIVA_VENTAS")
export class SalesWorkspaceController {
  constructor(private readonly s: SalesWorkspaceService) {}
  @Get() board(@Headers() h: H, @Query() q: H) {
    return this.s.board(actor(h), q);
  }
  @Get("catalog") catalog() {
    return this.s.catalog();
  }
  @Get("export") async export(
    @Headers() h: H,
    @Query() q: H,
    @Res({ passthrough: true }) res: { setHeader: (k: string, v: string) => void },
  ) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="gestion-comercial.csv"');
    res.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(Buffer.from(await this.s.export(actor(h), q)));
  }
  @Get("records/:id") detail(@Headers() h: H, @Param("id") id: string) {
    return this.s.detail(actor(h), id);
  }
  @Post("records") create(@Headers() h: H, @Body() b: Row) {
    return this.s.create(actor(h), b);
  }
  @Patch("records/:id") update(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.update(actor(h), id, b);
  }
  @Post("records/:id/events") event(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.activity(actor(h), id, b);
  }
  @Post("records/:id/review") review(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.reviewRecord(actor(h), id, b);
  }
  @Post("events/:id/review") eventReview(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.reviewOther(actor(h), "event", id, b);
  }
  @Post("reports") report(@Headers() h: H, @Body() b: Row) {
    return this.s.report(actor(h), b);
  }
  @Post("reports/:id/review") reportReview(
    @Headers() h: H,
    @Param("id") id: string,
    @Body() b: Row,
  ) {
    return this.s.reviewOther(actor(h), "report", id, b);
  }
  @Post("records/:id/proposals") proposal(
    @Headers() h: H,
    @Param("id") id: string,
    @Body() b: Row,
  ) {
    return this.s.propose(actor(h), id, b);
  }
  @Post("proposals/:id/review") proposalReview(
    @Headers() h: H,
    @Param("id") id: string,
    @Body() b: Row,
  ) {
    return this.s.reviewProposal(actor(h), id, b);
  }
  @Post("proposals/:id/shared") shared(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.share(actor(h), id, b);
  }
  @Post("proposals/:id/accept") accept(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.accept(actor(h), id, b);
  }
  @Get("proposals/:id/pdf") async pdf(
    @Headers() h: H,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: { setHeader: (k: string, v: string) => void },
  ) {
    const p = await this.s.document(actor(h), id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${p.filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(p.bytes);
  }
  @Post("records/:id/profit") profit(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.validateProfit(actor(h), id, b);
  }
  @Post("records/:id/complete") complete(@Headers() h: H, @Param("id") id: string, @Body() b: Row) {
    return this.s.complete(actor(h), id, b);
  }
}
