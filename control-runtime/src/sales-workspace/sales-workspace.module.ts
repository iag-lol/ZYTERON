import { Module } from "@nestjs/common";
import { CommercialModule } from "../commercial/commercial.module.js";
import { SalesWorkspaceController } from "./sales-workspace.controller.js";
import { SalesWorkspaceRepository } from "./sales-workspace.repository.js";
import { SalesWorkspaceService } from "./sales-workspace.service.js";
@Module({
  imports: [CommercialModule],
  controllers: [SalesWorkspaceController],
  providers: [SalesWorkspaceRepository, SalesWorkspaceService],
})
export class SalesWorkspaceModule {}
