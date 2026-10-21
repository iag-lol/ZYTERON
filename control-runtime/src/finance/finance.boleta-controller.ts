import { Body, Controller, Post, Res, StreamableFile } from "@nestjs/common";
import { Public } from "../auth/roles.decorator.js";
import { SiiCertificationWorkspace } from "./finance.sii-workspace.js";

@Controller("public/boletas")
export class PublicBoletaController {
  constructor(private readonly workspace: SiiCertificationWorkspace) {}
  @Public()
  @Post("consulta")
  async lookup(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
  ) {
    const file = await this.workspace.publicBoleta(body);
    response.setHeader("content-type", "application/pdf");
    response.setHeader("content-disposition", `attachment; filename="${file.fileName}"`);
    response.setHeader("cache-control", "private, no-store");
    response.setHeader("x-robots-tag", "noindex, nofollow");
    return new StreamableFile(file.bytes);
  }
}
